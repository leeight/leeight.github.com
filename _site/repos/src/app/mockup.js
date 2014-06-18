/***************************************************************************
 *
 * Copyright (c) 2011 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 * 接管baidu.ajax.request请求，针对某些
 * 特定的请求，直接返回内容
 *
 **/


goog.require('app.json');

goog.provide('app.mockup.register');

/**
 * app.Mockup构造函数
 *
 * @constructor
 **/
app.Mockup = function() {
  /**
   * @private
   * @type {Object}
   */
  this.maps_ = {};

  /**
   * @private
   * @type {Object}
   */
  this.maps_once_ = {};

  /**
   * @private
   * @type {Element}
   */
  this.loadingText;

  this.init();
};
baidu.addSingletonGetter(app.Mockup);

/**
 * @param {string} text loading提示.
 */
app.Mockup.prototype.setLoadingText = function(text) {
    if (!this.loadingText) {
        var loadingText = baidu.q('loading-text');
        if (loadingText.length) {
            this.loadingText = loadingText[0];
        } else {
            return;
        }
    }

    this.loadingText.innerHTML = text;
};

/**
 * 初始化，给baidu.ajax.request添加一个钩子
 */
app.Mockup.prototype.init = function() {
    var me = this,
        req_ = baidu.ajax.request;
    baidu.ajax.request = function(url, options) {
        var found_in_mock = false;
        for (var k in me.maps_) {
            if (url.indexOf(k) == 0) {
                var res = null;
                if (baidu.lang.isArray(me.maps_[k])) {
                  var index = parseInt(Math.random() * me.maps_[k].length, 10);
                  res = me.maps_[k][index];
                } else {
                  res = me.maps_[k];
                }

                if(baidu.lang.isFunction(res)) {
                    res = res(url, baidu.url.queryToJson(options.data || ''));
                }

                if (typeof window.console == 'object' &&
                    typeof window.console.log == 'function') {
                    window.console.log('[MOCKUP]' +
                                (options.method || 'get').toUpperCase() + ' ' +
                                url + ' ' + (options.data || ''));
                    window.console.log(res);
                }

                // 如果是这个URL的话，那么就...
                var fn = options['onsuccess'];
                if (typeof fn == 'function') {
                    me.setLoadingText('正在读取<b style=\"color:red\">假</b>数据，请稍候...');
                    setTimeout(function() {
                        var text = app.json.serialize(res);
                        var xhr = {
                            'responseText' : text
                        };
                        fn.call(null, xhr, xhr.responseText);
                        if (me.maps_once_[k]) {
                            me.unregister(k);
                        }
                    }, 500);
                    found_in_mock = true;
                    break;
                }
            }
        }
        if (!found_in_mock) {
            me.setLoadingText('正在读取数据，请稍候...');
            req_.call(null, url, baidu.object.merge(options, {
                    'headers' : {'X-Request-By' : 'ERApplication'}
                }, {
                    'overwrite' : true,
                    'recursive' : true
                })
            );
        }
    };
};

/**
 * 去掉对某个URL结果的mockup
 * @param {string} key url地址的前缀.
 */
app.Mockup.prototype.unregister = function(key) {
    this.maps_[key] = null;
    this.maps_once_[key] = null;

    delete this.maps_[key];
    delete this.maps_once_[key];
};

/**
 * 针对一些URL注册一些直接返回的内容
 *
 * @param {string} url 请求的开始内容.
 * @param {Object|Function|Array.<Object|Function>} rv 直接返回的内容.
 */
app.Mockup.prototype.register = function(url, rv) {
    var maps = this.maps_;
    if (maps[url]) {
        throw Error('duplicate url = [' + url + ']');
    }else {
        maps[url] = rv;
    }
};

/**
 * 注册之后，只使用一次
 *
 * @param {string} url 请求的开始内容.
 * @param {Object|Function|Array.<Object|Function>} rv 直接返回的内容.
 */
app.Mockup.prototype.register_once = function(url, rv) {
    this.register(url, rv);
    this.maps_once_[url] = true;
};

/**
 * 针对一些URL注册一些直接返回的内容
 *
 * @param {string} url 请求的开始内容.
 * @param {Object} rv 直接返回的内容.
 */
app.mockup.register = function(url, rv) {
  var mockup = app.Mockup.getInstance();
  mockup.register(url, rv);
};
