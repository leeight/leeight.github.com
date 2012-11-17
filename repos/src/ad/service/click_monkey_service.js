/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/ad/service/click_monkey_service.js ~ 2012/06/18 15:55:26
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 * Click Monkey点击监控
 **/
goog.require('ad.service.Service');

goog.provide('ad.service.ClickMonkeyService');

/**
 * @constructor
 * @extends {ad.service.Service}
 */
ad.service.ClickMonkeyService = function() {
    ad.service.Service.call(this);

    /**
     * cm文件的加载地址.
     * @type {string}
     * @private
     */
    this._url = 'http://eiv.baidu.com/mapm2/logClick/logClick5.js';
};
baidu.inherits(ad.service.ClickMonkeyService, ad.service.Service);

/**
 * @override
 * @param {string} domId 容器id.
 * @param {string=} opt_plid plid，如果没传，会从容器id上取.
 */
ad.service.ClickMonkeyService.prototype.init = function(domId, opt_plid) {
    var cm = window['ClickMonkey'],
        plid = opt_plid || domId.replace(/ec-ma-/g, "");
    if (cm && cm['setTemplate']) {
        cm['setTemplate'](domId, plid);
    } else {
        baidu.sio.callByBrowser(this._url, function() {
            if (window['ClickMonkey'] && window['ClickMonkey']['setTemplate']) {
                window['ClickMonkey']['setTemplate'](domId, plid);
            }
        });
    }
};

/**
 * 发送clickmonkey的统计请求.
 * @param {Object} params 请求参数.
 */
ad.service.ClickMonkeyService.prototype.sendLog = function(params) {
    var queries = baidu.url.jsonToQuery(params, function(value, key) {
        return encodeURIComponent(value);
    });
    new Image().src = 'http://clkmk.baidu.com/clkmk-rcv/rcv?' + queries;
};



















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
