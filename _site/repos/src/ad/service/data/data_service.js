/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id: data_service.js 9848 2012-06-20 10:14:29Z fanxueliang $
 *
 **************************************************************************/



/**
 * src/ad/service/prodb/data_service.js ~ 2012/06/08 00:32:13
 * @author fanxueliang(fanxueliang@baidu.com)
 * @version $Revision: 9848 $
 * @description
 *
 **/

goog.require('ad.service.Service');

goog.provide('ad.service.data.DataService');

/**
 * @constructor
 * @param {string} url 请求地址.
 * @extends {ad.service.Service}
 */
ad.service.data.DataService = function(url) {
    ad.service.Service.call(this);
    this._url = url;
};
baidu.inherits(ad.service.data.DataService, ad.service.Service);

/**
 * @param {string} parameters 提交请求的参数.
 * @param {Function=} opt_callback 成功之后的回调函数.
 */
ad.service.data.DataService.prototype.callData = function(parameters, opt_callback) {
    var url = this._url + (parameters ? ('?' + parameters) : '');
    baidu.sio.callByServer(url, (opt_callback || baidu.fn.blank));
};


















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
