/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/ad/service/service.js ~ 2012/06/08 00:25:16
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 * 后端服务的基类
 **/
goog.provide('ad.service.Service');

/**
 * 后端服务的基类.
 * @constructor
 */
ad.service.Service = function() {
    // TODO
};

/**
 * 初始化服务.
 */
ad.service.Service.prototype.init = baidu.abstractMethod;

/**
 * 貌似没用了...
 * 调用一个后端的服务.
 * @param {string} methodName 方法的名字.
 * @param {string} parameters 调用方法的时候传递的参数.
 * @param {Function=} opt_callback 回调函数，调用成功之后传递参数给它.
 */
ad.service.Service.prototype.invokeMethod = function(methodName, parameters, opt_callback) {
    if (this[methodName]) {
    } else {
        baidu.abstractMethod();
    }
};



















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
