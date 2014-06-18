/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/app/event_target.js ~ 2012/09/12 16:09:40
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 * 参考closure libraray里面的eventtarget.js来实现
 **/
goog.require('app.event.Event');
goog.require('app.events');

goog.provide('app.event.EventTarget');

/**
 * @constructor
 * @extends {base.EventDispatcher}
 */
app.event.EventTarget = function() {
    /**
     * Parent event target, used during event bubbling.
     * @type {app.event.EventTarget?}
     * @private
     */
    this._parentEventTarget;
};

/**
 * @param {app.event.EventTarget} parentEventTarget 事件冒泡的时候来使用.
 */
app.event.EventTarget.prototype.setParentEventTarget = function(parentEventTarget) {
    this._parentEventTarget = parentEventTarget;
};

/**
 * @return {app.event.EventTarget}
 */
app.event.EventTarget.prototype.getParentEventTarget = function() {
    return this._parentEventTarget;
};

/**
 * 触发事件
 * @param {string|app.event.Event|Object} e 事件类型.
 * @param {...*} var_args 自定义参数.
 *
 * @return {boolean}
 */
app.event.EventTarget.prototype.dispatchEvent = function(e, var_args) {
    var evt;

    if (arguments.length > 1) {
        evt = baidu.lang.isString(e) ? new app.event.Event(e, this) : e;
        evt.payload = Array.prototype.slice.call(arguments, 1);
    } else {
        evt = e;
    }

    return app.events.dispatchEvent(this, evt);
};

/**
 * 注册事件处理函数.
 * @param {string} type 事件类型.
 * @param {Function} handler 事件处理函数.
 * @param {boolean=} opt_capture 是否在捕获阶段处理调用事件处理函数.
 */
app.event.EventTarget.prototype.addEventListener = function(type, handler, opt_capture) {
    return app.events.on(this, type, handler, opt_capture);
};

/**
 * 删除事件处理函数.
 * @param {string} type 事件类型.
 * @param {Function} handler 事件处理函数.
 * @param {boolean=} opt_capture 是否在捕获阶段处理调用事件处理函数.
 */
app.event.EventTarget.prototype.removeEventListener = function(type, handler, opt_capture) {
    return app.events.un(this, type, handler, opt_capture);
};

/**
 * 注册事件处理函数.
 * 保留跟base.EventDispatcher同样的接口.
 * @param {string} type 事件类型.
 * @param {Function} handler 事件处理函数.
 * @param {boolean=} opt_capture 是否在捕获阶段处理调用事件处理函数.
 * @deprecated
 */
app.event.EventTarget.prototype.addListener = function(type, handler, opt_capture) {
    return this.addEventListener.apply(this, arguments);
};

/**
 * 删除事件处理函数.
 * 保留跟base.EventDispatcher同样的接口.
 * @param {string} type 事件类型.
 * @param {Function} handler 事件处理函数.
 * @param {boolean=} opt_capture 是否在捕获阶段处理调用事件处理函数.
 * @deprecated
 */
app.event.EventTarget.prototype.removeListener = function(type, handler, opt_capture) {
    return this.removeEventListener.apply(this, arguments);
};

/**
 * 触发事件
 * @param {string|app.event.Event|Object} e 事件类型.
 * @param {...*} var_args 自定义参数.
 * @deprecated
 * @return {boolean}
 */
app.event.EventTarget.prototype.trigger = function(e, var_args) {
    return this.dispatchEvent.apply(this, arguments);
};




















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
