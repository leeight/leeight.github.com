/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/ad/material.js ~ 2012/06/04 21:53:40
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 * 物料的基类
 **/
goog.require('ad.service.ClickMonkeyService');
goog.require('ad.service.ClickService');
goog.require('ad.render.DefaultRender');
goog.require('ui.events');

goog.provide('ad.Material');

/**
 * 广告物料的展示入口, 主要角色如下:
 * <pre>
 * 1. 定位不同的Widget(可以设置自己的布局)
 * 2. 处理Widget的事件
 * </pre>
 * @param {string} canvas_id 画布的Id.
 * @param {boolean=} opt_async 为true的时候代表异步，false时为同步，暂时没有用到，保留
 * @constructor
 */
ad.Material = function(canvas_id, opt_async) {
    /**
     * @type {ad.render.Render}
     * @private
     */
    this._render = new ad.render.DefaultRender();

    /**
     * @type {ad.service.ClickMonkeyService}
     * @private
     */
    this._cms;

    /**
     * @type {ad.service.ClickService}
     * @private
     */
    this._cs;

    /**
     * @private
     * @type {string}
     */
    this._canvas_id = canvas_id;

    /**
     * @private 
     * @type {boolean}
     */
     this._async = !!opt_async;

    /**
     * @type {!Array.<ad.widget.Widget>}
     */
    this._widgets;
};

/**
 * @param {ad.render.Render} render 渲染器.
 */
ad.Material.prototype.setRender = function(render) {
    this._render = render;
};

/**
 * 获取ClickMonkeyService实例
 * @protected
 * @return {ad.service.ClickMonkeyService}
 */
ad.Material.prototype.getCMS = function() {
    if (!this._cms) {
        this._cms = new ad.service.ClickMonkeyService();
    }
    return this._cms;
};

/**
 * 获取ClickService实例
 * @return {ad.service.ClickService}
 */
ad.Material.prototype.getCS = function() {
    if (!this._cs) {
        this._cs = new ad.service.ClickService();
    }
    return this._cs;
};

/**
 * @protected
 * @param {...!Array.<ad.widget.Widget>} var_args Zero or more sets, as arrays.
 */
ad.Material.prototype.setWidgets = function(var_args) {
    this._widgets = Array.prototype.slice.call(arguments);
};

/**
 * @param {...number} var_args 索引序列
 * @return {?ad.widget.Widget} 
 */
ad.Material.prototype.getWidget = function(var_args) {
    var indexes = Array.prototype.slice.call(arguments);
    if (!indexes.length) {
        return null;
    }

    var cur_object = this._widgets[indexes[0]];
    if (!cur_object) {
        return null;
    }

    for (var i = 1; i < indexes.length; i++) {
        cur_object = cur_object[indexes[i]];
        if (cur_object == null) {
            return null;
        }
    }
    return cur_object;
};

/**
 * 获取画布元素.
 * @return {!Element} 画布所处的DOM元素.
 */
ad.Material.prototype.getRoot = function() {
    if (COMPILED) {
        if (!baidu.g(this._canvas_id)) {
            document.write('<div id="' + this._canvas_id + '"></div>');
        }
        return baidu.g(this._canvas_id);
    } else {
        return baidu.g('canvas');
    }
};

/**
 * 获取画布元素的Id.
 * @return {string} 画布元素的Id.
 */
ad.Material.prototype.getId = function() {
    return (COMPILED ? this._canvas_id : 'canvas');
};

/**
 * 给指定widget绑定发送日志事件
 * @param {ad.widget.Widget} widget 目标widget.
 */
ad.Material.prototype.handleWidgetEvent = function(widget) {
    var me = this;
    widget.addListener(ui.events.SEND_LOG, function(title, xp) {
        me.getCMS().sendLog({
            'r' : new Date().valueOf(),
            'q' : (window['bdQuery'] || ''),
            'xp' : xp,
            'plid' : me.getId().replace(/ec-ma-/, ''),
            'title' : (title)
        });
    });
};

/**
 * 遍历所有的widgets，执行回调函数.
 * @param {function(ad.widget.Widget)} callback widget的回调函数.
 */
ad.Material.prototype._forEach = function(callback) {
    function walker(part) {
        if (baidu.lang.isArray(part)) {
            baidu.each(part, function(item) {
                walker(item);
            });
        } else {
            callback(part);
        }
    }
    walker(this._widgets);
};

/**
 * 创建物料的样式，这个函数应该只需要被调用一次.
 * @private
 */
ad.Material.prototype._createStyles = function() {
    if (COMPILED) {
        if (typeof AD_STYLE_CONTENT !== 'undefined') {
            var styles = AD_STYLE_CONTENT.replace(/#canvas/g, '#' + this._canvas_id);
            //dynamically create style element and append to root node 
            var style = document.createElement('style');
            style.type = 'text/css';
            style.media = 'screen';
            if(style.styleSheet){
                style.styleSheet.cssText = styles;
            } else {
                style.appendChild(document.createTextNode(styles));
            }
            var root = this.getRoot();
            baidu.dom.insertBefore(style, root);
        }
    }
};

/**
 * 展示物料，这个函数应该只会被调用一次.
 */
ad.Material.prototype.show = function() {
    var me = this;
    this._createStyles();

    var html = this._render.process(this._widgets);

    var root = this.getRoot();
    if (root) {
        root.innerHTML = html;
        // 这个属性是一个标识，QA用来识别物料是否渲染完毕
        root.setAttribute("data-rendered", "true");
    }

    // set root
    /*
    this._forEach(function(widget){
        // TODO
    });*/

    // trigger enterDocument event
    this._forEach(function(widget) {
        widget.enterDocument();
    });

    // trigger bindEvent event
    this._forEach(function(widget) {
        widget.bindEvent();
    });

    // XXX: 动态添加的widget，需要自己手动调用bindWidgetLogEvent
    this._forEach(function(widget){
        me.handleWidgetEvent(widget);
    });

    baidu.show(this.getId());
};

/**
 * 增加监控
 * FIXME: 需要手动调用？还是在show里调用？
 */
ad.Material.prototype.initMonitor = function(main_url) {
    this.getCMS().init(this.getId());
    this.getCS().init(this.getId(), main_url);
};

/**
 * 物料销毁的工作.
 */
ad.Material.prototype.dispose = function() {
    var root = this.getRoot();
    if (root) {
        // trigger dispose event
        root.innerHTML = '';
    }

    root = null;
};

if (!COMPILED) {
    if (!baidu.g('canvas')) {
        document.write('<div id="canvas" style="display:none"></div>');
    }
}

















/* vim: set ts=4 sw=4 sts=4 tw=100: */
