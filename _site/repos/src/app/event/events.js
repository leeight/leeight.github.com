/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/app/event/events.js ~ 2012/09/13 14:38:44
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 * listen, unlisten, dispatchEvent, ...
 **/

goog.provide('app.events');

/**
 * 全局的对象，保存所有的事件监听器
 * _listenerTree = {
 *   'focus' : {
 *     true : {
 *       'id1' : [fn1, fn2, fn3, ...],
 *       'id2' : [fn4, fn5, fn6, ...],
 *     },
 *     false : {
 *       'ida' : [fn1, fn2, fn3, ...],
 *       'idb' : [fn4, fn5, fn6, ...],
 *     }
 *    }
 *  },
 *  'blur' : {
 *    ..
 *  }
 * }
 * @private
 * @type {Object}
 */
app.events._listenerTree = {};

/**
 * @private
 * @type {string}
 */
app.events._UID_KEY = 'uid_' +
    Math.floor(Math.random() * 2147483648).toString(36);

/**
 * @private
 * @type {number}
 */
app.events._UID_COUNTER = 0;

/**
 * @param {Object} object 要处理的对象.
 * @return {string} uid.
 */
app.events.getUid = function(object) {
    if (!object[app.events._UID_KEY]) {
        object[app.events._UID_KEY] = ++app.events._UID_COUNTER;
    }
    return object[app.events._UID_KEY];
};

/**
 * 注册事件处理函数.
 *
 * @param {app.event.EventTarget} src 事件对象.
 * @param {string} type 事件类型.
 * @param {Function} handler 事件处理函数.
 * @param {boolean=} opt_capture 是否在捕获阶段处理调用事件处理函数.
 */
app.events.on = function(src, type, handler, opt_capture) {
    var capture = !!opt_capture;
    var tree = app.events._listenerTree;

    if (!(type in tree)) {
        // {
        //   '_count' : 0,
        //   '_remaning' : 0,
        //   'true' : {}
        //   'false' : {}
        // }
        tree[type] = { _count : 0, _remaning : 0 };
    }
    var map = tree[type];

    if (!(capture in map)) {
        // 'true' : {
        //   '_count' : 0,        // 主要是记录有多少个元素，从而避免便利hash的代价
        //   '_remaning' : 0,     // 记录多少个？？
        //   'id1' : [],
        //   'id2' : []
        // }
        map[capture] = { _count: 0, _remaning: 0 };
        map._count ++;    // 增加上面tree[type]的_count，不是当前的_count
    }
    map = map[capture];

    // _remaning的作用是为了性能考虑的，考虑下面的场景：
    // A -> B -> C -> D
    // "test"事件从A开始冒泡到D
    // 如果只有A绑定过"test"的处理函数，那么A处理完毕之后，后面就没有必要执行了
    map._remaning ++;

    var uid = app.events.getUid(src);
    if (!map[uid]) {
        map[uid] = [];
        map._count ++;
    }
    map[uid].push(handler);
};

/**
 * 获取obj的事件处理函数列表.
 *
 * @private
 *
 * @param {app.event.EventTarget} obj 事件对象.
 * @param {string} type 事件类型.
 * @param {boolean} capture 是否在捕获阶段处理调用事件处理函数.
 *
 * @return {?Array.<Function>}
 */
app.events._getListeners = function(obj, type, capture) {
    var map = app.events._listenerTree;
    if (type in map) {
        map = map[type];
        if (capture in map) {
            map = map[capture];
            var uid = app.events.getUid(obj);
            if (map[uid]) {
                return map[uid];
            }
        }
    }
    return null;
};

/**
 * 删除事件处理函数.
 *
 * @param {app.event.EventTarget} src 事件对象.
 * @param {string} type 事件类型.
 * @param {Function} handler 事件处理函数.
 * @param {boolean=} opt_capture 是否在捕获阶段处理调用事件处理函数.
 *
 * @return {boolean}
 */
app.events.un = function(src, type, handler, opt_capture) {
    var capture = !!opt_capture;

    var listeners = app.events._getListeners(src, type, capture);
    if (!listeners) {
        return false;
    }

    var rv = false;
    for (var i = 0, j = listeners.length; i < j; i++) {
        if (listeners[i] === handler) {
            listeners[i] = null;
            rv = true;
        }
    }

    if (rv) {
        listeners._needCleanup = true;
        var uid = app.events.getUid(src);
        app.events._cleanUp(type, capture, uid, listeners);
    }

    return rv;
};

/**
 * @param {app.event.EventTarget} src 事件源对象.
 * @param {string|app.event.Event|Object} e 事件类型.
 */
app.events.dispatchEvent = function(src, e) {
    var type = baidu.lang.isString(e) ? e : e.type;
    var map = app.events._listenerTree;

    if (!(type in map)) {
        return false;
    }

    var evt = null;

    // 创建事件对象
    if (baidu.lang.isString(e)) {
        evt = new app.event.Event(type, src);
    } else if (!(e instanceof app.event.Event)) {
        evt = new app.event.Event(type, src);
        baidu.object.extend(evt, e);
    } else {
        // 类型是app.event.Event
        evt = e;
        evt.target = evt.target || src;
    }

    var retval = true;

    map = map[type];

    // 事件捕获阶段
    var hasCapture = true in map;
    if (hasCapture) {
        var ancestors = [];
        for (var current = src; current; current = current.getParentEventTarget()) {
            ancestors.push(current);
        }

        var pools = map[true];
        pools._remaning = pools._count;

        for (var i = ancestors.length - 1;
            !evt._propagationStopped && i >= 0 && pools._remaning;
            i--) {
            evt.currentTarget = ancestors[i];
            retval &= app.events._fireListeners(pools, ancestors[i], type, true, evt) && (evt._returnValue != false);
        }
    }

    // 事件冒泡
    var hasBubble = false in map;
    if (hasBubble) {
        var pools = map[false];
        pools._remaning = pools._count;

        for (var current = src;
            !evt._propagationStopped && current && pools._remaning;
            current = current.getParentEventTarget()) {

            evt.currentTarget = current;
            retval &= app.events._fireListeners(pools, current, type, false, evt) && (evt._returnValue != false);
        }
    }

    return Boolean(retval);
};

/**
 * @private
 *
 * @param {Object} pools id和listeners的集合.
 * @param {Object} obj 需要触发事件的对象.
 * @param {string} type 事件类型.
 * @param {boolean} capture 冒泡还是捕获阶段.
 * @param {app.event.Event} evt 事件对象.
 *
 * @return {boolean}
 */
app.events._fireListeners = function(pools, obj, type, capture, evt) {
    var retval = true;
    var uid = app.events.getUid(obj);

    if (pools[uid]) {
        pools._remaning --;

        var listeners = pools[uid];
        var length = listeners.length;

        if (!listeners._locked) {
            listeners._locked = 1;
        } else {
            listeners._locked ++;
        }

        try {
            for (var i = 0; i < length; i++) {
                var listener = listeners[i];
                if (listener) {
                    retval &= (listener.call(obj, evt) !== false);
                }
            }
        } finally {
            listeners._locked --;
            app.events._cleanUp(type, capture, uid, listeners);
        }
    }

    return Boolean(retval);
};

/**
 * compact listeners array.
 * @private
 * @param {string} type 事件类型.
 * @param {boolean} capture 冒泡还是捕获阶段.
 * @param {number} uid 对象唯一id的标识.
 * @param {Array.<Function>} listeners 事件处理函数集合.
 */
app.events._cleanUp = function(type, capture, uid, listeners) {
    if (listeners._locked || !listeners._needCleanup) {
        return;
    }

    for(var oi = 0, ni = 0; oi < listeners.length; oi ++) {
        if (!listeners[oi]) {
            continue;
        }
        if (oi != ni) {
            listeners[ni] = listeners[oi];
        }
        ni ++;
    }
    listeners.length = ni;
    listeners._needCleanup = false;

    if (ni == 0) {
        // 这个listeners是空的了，需要删除
        delete app.events._listenerTree[type][capture][uid];
        app.events._listenerTree[type][capture]._count --;

        if (app.events._listenerTree[type][capture]._count == 0) {
          delete app.events._listenerTree[type][capture];
          app.events._listenerTree[type]._count --;
        }

        if (app.events._listenerTree[type]._count == 0) {
          delete app.events._listenerTree[type];
        }
    }
};



















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
