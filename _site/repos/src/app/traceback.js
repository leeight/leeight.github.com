/***************************************************************************
 * 
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * 
 **************************************************************************/
 
 
/*
 * path:    src/app/traceback.js
 * desc:    收集浏览器错误日志
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2012/04/28 18:03:25$
 */

goog.require('jn.flags');

goog.provide('app.traceback')

/**
 * 记录js错误日志
 * @constructor
 */
app.LogTrace = function(){
    /**
     * 后端接收日志接口地址
     * @type {string}
     */
    this.url = '/data/trace/log';
};
baidu.addSingletonGetter(app.LogTrace);

/**
 * 发送日志
 * @param {Object} data 数据
 * @private
 */
app.LogTrace.prototype.sendLog = function(data) {
    var params = {
        'trace' : '',
        'extra' : ''
    };
    baidu.object.extend(params, data);
    // 只在线上系统中往后端发送错误日志
    if(!this.isOnLine()){
        // TODO:如果不支持console.log，需要通过其他方式显示错误
        if(window.console && window.console.log){
            window.console.log(params);
        }
        return;
    }
    baidu.ajax.request(this.url, {
        'timeout' : 60000,  // 60s
        'method' : 'post',
        'data' : baidu.url.jsonToQuery(params),
        'onsuccess' : function(xhr) {
            //try {
            //    var data = baidu.json.parse(xhr.responseText);
            //} catch (e) {}
        },
        'ontimeout' : function(xhr) {
            // 防止请求在timeout后返回带来副作用
            xhr.onreadystatechange = baidu.fn.blank;
        },
        'headers' : {'X-Request-By' : 'ERApplication'}
    });
};

/**
 * 发送异常的日志
 * @param {string|Exception} ex 异常对象或异常message
 * @param {string=} opt_extra 额外日志信息，用于手动调用时提供更多的错误信息
 * @public
 */
app.LogTrace.prototype.logError = function(ex, opt_extra) {
    //TODO: 后端完成时enable
    return;
    this.sendLog({
        'trace' : (baidu.lang.isString(ex) ? ex : printStackTrace({e: ex, guess: false}).join('\n')),
        'extra' : opt_extra || ''
    });
};

/**
 * 是否是线上环境
 * @return {boolean}
 */
app.LogTrace.prototype.isOnLine = function(){
    return /^jn\.baidu\.com$/.test(window.location.host);
};


/**
 * 在window上绑定error事件，处理未被捕获的异常
 * TODO: 后端完成时再enable
 */
if (COMPILED && FLAGS_enable_trace) {
    window.onerror = function(message, url, linenumber) {
        var tracker = app.LogTrace.getInstance();
        return tracker.sendLog({
            'trace' : printStackTrace({guess: false}).join('\n')
        });
    };
}

/**
 * 发送异常的日志
 * @param {string|Exception} ex 异常对象或异常message
 * @param {string=} opt_extra 额外日志信息，用于手动调用时提供更多的错误信息
 */
app.traceback = function(ex, opt_extra) {
    if (FLAGS_enable_trace) {
        var tracker = app.LogTrace.getInstance();
        tracker.logError(ex, opt_extra);
    }
};

















/* vim: set ts=4 sw=4 sts=4 tw=100 : */
