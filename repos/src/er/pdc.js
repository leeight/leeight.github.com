/***************************************************************************
 *
 * Copyright (c) 2011 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/er/pdc.js ~ 2011/11/16 14:27:12
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 * @see http://fe.baidu.com/doc/wpo/pms/how_to_start.text
 *
 **/

goog.provide('er.Pdc');
goog.provide('er.hm.push');

/**
 * 对webspeed平台的PDC进行包装，方便在er项目里面调用.
 * @constructor
 */
er.Pdc = function() {
  /**
   * 用来检测是否是合法的页面
   */
  this._isValidPage = false;
};
baidu.addSingletonGetter(er.Pdc);

/**
 * @param {string} page_url 页面的URL，用来转化为page_id.
 */
er.Pdc.prototype.setPage = function(page_url) {
  var pageIdMap = {
    '/account/agencyLayer/list' : 2,
    '/adresource/homePage' : 4,
    '/promotion/ad/list' : 6,
    '/promotion/product/list' : 8,
    '/product/home/list' : 10
  };
  if (pageIdMap[page_url]) {
    this._isValidPage = true;
    var pageId = pageIdMap[page_url];
    if (typeof PDC != 'undefined' &&
        baidu.lang.isFunction(PDC.init)) {
      PDC.init({page_id: pageId});
    }
  } else {
    this._isValidPage = false;
  }
};

/**
 * 重置PDC的计时器.
 */
er.Pdc.prototype.reset = function() {
  if (typeof PDC != 'undefined' &&
      baidu.lang.isFunction(PDC.render_start_again)) {
    PDC.render_start_again();
  }
};

/**
 * @param {string} stage 需要标记的阶段.
 */
er.Pdc.prototype.mark = function(stage) {
  if (typeof PDC != 'undefined' &&
      baidu.lang.isFunction(PDC.mark)) {
    PDC.mark(stage);
  }
};

/**
 * 核心功能可用.
 */
er.Pdc.prototype.tti = function() {
  if (typeof PDC != 'undefined' &&
      baidu.lang.isFunction(PDC.tti)) {
    PDC.tti();
  }
};

/**
 * 页面呈现完毕.
 */
er.Pdc.prototype.page_ready = function() {
  if (typeof PDC != 'undefined' &&
      baidu.lang.isFunction(PDC.page_ready)) {
    PDC.page_ready();
  }
};

/**
 * 发送日志.
 */
er.Pdc.prototype.send = function() {
  if (!this._isValidPage) {
    return;
  }

  if (typeof PDC != 'undefined' &&
      baidu.lang.isFunction(PDC.send)) {
    if (typeof window.WPO_PDA != 'undefined') {
      var ctor = /** @type {Function}*/ (window.WPO_PDA.constructor);
      if (baidu.lang.isFunction(ctor)) {
        var pda = new ctor(PDC.metadata());
        pda.send();
      }
    }
  }
};

/**
 * @param {Array} actions The actions _hmt will accept.
 */
er.hm.push = function(actions) {
  if (typeof _hmt != 'undefined') {
    _hmt.push(actions);
  }
}
















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
