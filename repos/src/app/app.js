/***************************************************************************
 *
 * Copyright (c) 2011 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * app/app.js ~ 2011/04/12 23:22:59
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 *
 **/

goog.require('jn.net.TemplateWorker');
goog.require('base.ParallelWorkerManager');
goog.require('er.template');
goog.require('ui.Page');
goog.require('ui.util');
goog.require('jn.util');
goog.require('jn.flags');

goog.provide('app.Init');
goog.provide('app.InitFromElement');
goog.provide('app.Launch');

/**
 * deploy模式下模板的路径
 * @define {string}
 */
app.asyncResource = 'tpl.html';

/**
 * the application build version.
 * @define {string}
 */
app.version = '@VERSION@';

/**
 * @param {Function} main 主函数.
 */
app.Launch = function(main) {
  var pwm = new base.ParallelWorkerManager();

  if (!COMPILED) {
    function getAbsoluteUrl(url) {
      // 在IE下面，如果url是../../../jn/a.css
      // 会自动根据当前文档的baseURI的路径计算出绝对路径，返回值的格式是
      // http://jntest.baidu.com:8080/src/jn/a.css
      var tag = new Image();
      tag.src = url;
      return tag.src;
    }

    function combinedUris (uris) {
      // @see http://support.microsoft.com/kb/208427
      // if the request url length is more than 2083, the internet explorer
      // will drop that request, never make it happen. :-(
      // in order to address this issue, we have to split the uris into chunks.
      var uri = '', 
          uri_chunks = [];

      for(var i = 0; i < uris.length; i ++) {
        // I dont know why it works, but it does work.

        // IE6下面，当前页面的地址是
        // == 情况1 ==
        // http://jntest.baidu.com:8080/src/jn/landmark/promotion/material_list.app.html?combine_css=1#/jn/landmark/promotion/material_list~status=0&keyword=&adId=0
        // 请求的资源地址是
        // ../../../css/*.css
        // ../../../jn/*.css
        // == 情况2 ==
        // http://jntest.baidu.com:8080/src/entry/gold.html?enable_debug=1&combine_css=1
        // 请求的资源地址是
        // ../../src/css/*.css
        // 我们的目的是获取绝对路径
        uris[i] = getAbsoluteUrl(uris[i]);
        uris[i] = uris[i].replace(/http:\/\/([^\/]+)\//g, '/');
      }

      for(var i = 0; i < uris.length; i ++) {
        if (encodeURIComponent(uri + uris[i] + ",").length > 800) {
          uri_chunks.push(uri);
          uri = uris[i];
        } else {
          uri += ("," + uris[i]);
        }
      }
      if (uri) {
        uri_chunks.push(uri);
      }

      return uri_chunks;
    }

    function getRequestId() {
      return Math.floor(Math.random() * 2147483648).toString(36);
    }

    var doc = goog.global.document,
        head = doc.getElementsByTagName('head')[0];
    // @see http://blogs.msdn.com/b/ieinternals/archive/2011/05/14/internet-explorer-stylesheet-rule-selector-import-sheet-limit-maximum.aspx
    // TODO 解决IE只能加载32个外部样式文件的BUG
    if (/cc=1|combine_css=1/.test(document.location.search)) {
      // XXX Need run Fserver
      var request_id = getRequestId();
      var chunks = combinedUris(goog.asyncStyles);
      for (var i = 0; i < chunks.length; i ++) {
        var styleElt = doc.createElement('LINK');
        styleElt.setAttribute('type', 'text/css');
        styleElt.setAttribute('rel', 'stylesheet');
        styleElt.setAttribute('href', '/combine/all.css?uris=' + 
          encodeURIComponent(chunks[i]) +
          "&.timestamp=" + Math.random() +
          "&request_id=" + request_id +
          "&index=" + i +
          "&count=" + chunks.length);
        head.appendChild(styleElt);
      }
    } else {
        var iAmFe = goog.isDebugMode(),
            nocc = /nc=1/.test(document.location.search) || (document.location.host.indexOf("github.com") > -1);
        for(var i = 0; i < goog.asyncStyles.length; i++){
          var styleElt = doc.createElement('LINK'),
              url = goog.asyncStyles[i];
          styleElt.setAttribute('type', 'text/css');
          styleElt.setAttribute('rel', 'stylesheet');
          if (url.indexOf(".less") > -1) {
            // nc=1参数默认是没有的，所以nocc默认是false，跟原来的逻辑是一致的.
            if (iAmFe && !nocc) {
              // I'm the FE, and maybe i'm using the Fserver
              url = getAbsoluteUrl(url);
              url = url.replace(/http:\/\/([^\/]+)\//g, '/');
              styleElt.setAttribute('href', "/combine/all.css?uris=" + 
                encodeURIComponent(url) + "&.timestamp=" + Math.random());
            } else {
              // I'm the RD
              url = url.replace(".less", ".compiled.css");
              styleElt.setAttribute('href', url + "?.timestamp=" + Math.random());
            }
          } else {
            styleElt.setAttribute('href', url + "?.timestamp=" + Math.random());
          }
          head.appendChild(styleElt);
        }
    }

    if (goog.asyncResource.length > 0) {
      if (/ct=1|combine_tpl=1/.test(document.location.search)) {
        var chunks = combinedUris(goog.asyncResource);
        for(var i = 0; i < chunks.length; i ++) {
          pwm.addWorker(new jn.net.TemplateWorker(["/combine/tpl.html?uris=" + encodeURIComponent(chunks[i])]));
        }
      } else {
        pwm.addWorker(new jn.net.TemplateWorker(goog.asyncResource));
      }
    }
  } else {
    pwm.addWorker(new jn.net.TemplateWorker([app.asyncResource]))
  }

  baidu.addClass(document.body, jn.util.getUserAgentClass());

  pwm.addDoneListener(main);
  pwm.start();
};

/**
 * @param {string} view 当前页面的View.
 * @param {Element} main page所处的根节点.
 * @param {Object=} opt_model 当前页面的DataModel.
 * @param {boolean=} opt_isPopup 是否是popup状态，默认false.
 *
 * @return {ui.Page} 创建好的Page控件.
 */
app.Init = function(view, main, opt_model, opt_isPopup) {
  var model = opt_model || {},
      isPopup = opt_isPopup || false;

  var page = ui.util.createPage(view, main, isPopup);
  page.init();
  page.bindModel(model);
  page.render();
  page.bindEvent();

  return page;
};

/**
 * @param {Element} main page所处的根节点.
 * @param {Object=} opt_model 当前页面的DataModel.
 * @param {boolean=} opt_isPopup 是否是popup状态，默认false.
 *
 * @return {ui.Page} 创建好的Page控件.
 */
app.InitFromElement = function(main, opt_model, opt_isPopup) {
  var view = 'MAIN_PAGE_' + new Date().getTime();
  var source = '<!--target:' + view + '-->\n' + main.innerHTML;
  er.template.parse(source);

  return app.Init(view, main, opt_model, opt_isPopup);
};

if (FLAGS_enable_landmark) {
  // The following codes will be removed in the compiler-time.
  // So we can add new features safely in the future.
  app.ThisIsATest = function() {
    alert('ThisIsATest');
  }
}

if (!COMPILED) {
  if (document.location.host == "svn.baidu.com" ||
      document.location.host == "img.fe.baidu.com") {
    // 通过svn浏览页面，重写RES函数
    window['RES'] = function(resource) {
      // 因为我们有约定，resource肯定是绝对路径
      return goog.basePath + '..' + resource;
    }
  }
}













/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
