/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/app/event/event.js ~ 2012/09/12 17:52:35
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 *
 **/
goog.provide('app.event.Event');

/**
 * @constructor
 * @param {string} type 事件类型.
 * @param {Object=} opt_target 产生事件的对象.
 */
app.event.Event = function(type, opt_target) {

    /**
     * 事件类型.
     * @type {string}
     */
    this.type = type;

    /**
     * 产生这个事件的对象.
     * @type {Object|undefined}
     */
    this.target = opt_target;

    /**
     * 一些额外传递的参数.
     */
    this.payload;

    /**
     * 具备事件监听器的对象，值可能会变化.
     * @type {Object|undefined}
     */
    this.currentTarget = this.target;

    /**
     * 是否中断事件的冒泡或者捕获阶段.
     * @private
     * @type {boolean}
     */
    this._propagationStopped = false;

    /**
     * 是否阻止默认的行为
     * @type {boolean}
     */
    this.defaultPrevented = false;

    /**
     * @private
     * @type {boolean}
     */
    this._returnValue = true;
};

/**
 * 停止事件冒泡或者捕获.
 */
app.event.Event.prototype.stopPropagation = function() {
    this._propagationStopped = true;
};

/**
 * 阻止事件的默认行为（对于自定义的事件，用处不大）
 */
app.event.Event.prototype.preventDefault = function() {
    this.defaultPrevented = true;
    this._returnValue = false;
};




















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
