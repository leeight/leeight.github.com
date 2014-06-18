/***************************************************************************
 * 
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$ 
 * 
 **************************************************************************/
 
 
 
/**
 * src/jn/net/template_worker.js ~ 2012/06/04 16:47:38
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$ 
 * @description 
 *  
 **/

goog.require('base.AbstractWorker');
goog.require('er.template');

goog.provide('jn.net.TemplateWorker');

/**
 * 模板加载器
 * @constructor
 * @extends {base.AbstractWorker}
 * @param {Array.<string>} template 需要加载的模版列表.
 */
jn.net.TemplateWorker = function(template) {
    base.AbstractWorker.call(this);

    /**
     * @private
     */
    this._template = template;

    /**
     * @type {number}
     */
    this._index = 0;

    /**
     * 已读取的模版内容
     * @private
     * @type {Array.<string>}
     */
    this._loaded = [];
};
baidu.inherits(jn.net.TemplateWorker, base.AbstractWorker);

/**
 * @inheritDoc
 */
jn.net.TemplateWorker.prototype.start = function() {
  this._loadTemplate();
};

/**
 * 加载一个模版
 * @private
 */
jn.net.TemplateWorker.prototype._loadTemplate = function() {
  if (this._template.length <= 0) {
    this._templateLoaded();
    return;
  }

  var url = this._template[this._index];
  // FIXME(sa) 为了防止在模板修改后浏览器使用缓存的html，加了下面一句，正式发布的版本应该删除下面这句。
  if (!COMPILED) {
      url += (url.indexOf("?") > 0 ? '&' : '?') + '.stamp='+ (new Date().getTime());
  }
  baidu.ajax.request(url, {
    'method': 'get',
    'noCache': false,
    'onsuccess': baidu.fn.bind(this._loadTemplateSuccess, this),
    'onfailure': baidu.fn.bind(this._templateLoaded, this),
    'headers' : {'X-Request-By' : 'ERApplication'}
  });
};

/**
 * 模版加载成功，解析.
 * @private
 */
jn.net.TemplateWorker.prototype._loadTemplateSuccess = function(xhr) {
  this._loaded.push(xhr.responseText);
  this._templateLoaded();
};

/**
 * 模版加载完毕，不管成功还是失败
 * @private
 */
jn.net.TemplateWorker.prototype._templateLoaded = function() {
  this._index++;

  if (this._index >= this._template.length) {
    er.template.parse(this._loaded.join(''));
    this.done();
  } else {
    this._loadTemplate();
  }
};




















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
