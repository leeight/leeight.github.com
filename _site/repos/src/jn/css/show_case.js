/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/jn/css/show_case.js ~ 2012/11/17 16:41:58
 * @author leeight@gmail.com (leeight)
 * @version $Revision$
 * @description
 * show_case相关的实现逻辑
 **/

goog.require('ad.widget.Widget');

goog.include('jn/css/show_case.less');
goog.include('jn/css/show_case.html');

goog.provide('jn.css.ShowCase');

/**
 * @constructor
 * @param {Object} data 数据集合.
 * @extends {ad.widget.Widget}
 * @export
 */
jn.css.ShowCase = function(data) {
    ad.widget.Widget.call(this, data);

    /**
     * 当前Widget的View模板名称.
     * @type {string}
     */
    this._view = 'AD_jn_css_show_case';
};
baidu.inherits(jn.css.ShowCase, ad.widget.Widget);

/** @override */
jn.css.ShowCase.prototype.enterDocument = function() {
    jn.css.ShowCase.superClass.enterDocument.call(this);

    // CODE HERE
};

/** @override */
jn.css.ShowCase.prototype.bindEvent = function() {
    jn.css.ShowCase.superClass.bindEvent.call(this);

    // CODE HERE
};

/** @override */
jn.css.ShowCase.prototype.patchData = function() {
    if (this._data) {
        this._data['_custom_data'] = new Date();
    }
}






















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
