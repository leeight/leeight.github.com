/***************************************************************************
 * 
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 * 
 **************************************************************************/
 
 
/*
 * path:    src/ad/widget/material_container.js
 * desc:    物料容器
 * author:  songao(songao@baidu.com)
 * version: $Revision$
 * date:    $Date: 2012/08/22 16:20:15$
 */

goog.require('ad.widget.WidgetContainer');
goog.require('ui.events');
goog.require('ad.service.ClickMonkeyService');
goog.require('ad.service.ClickService');
goog.require('ad.render.RecursiveRender');

goog.include('ad/material/material_container.html');

goog.provide('ad.widget.MaterialContainer');

/**
 * @constructor
 * @param {string} canvas_id 容器id
 * @extends {ad.widget.WidgetContainer}
 */
ad.widget.MaterialContainer = function(canvas_id) {
    ad.widget.WidgetContainer.call(this, {});

    this._view = 'AD_ad_widget_material_container';

    this._render = new ad.render.RecursiveRender({
        'block_class': 'ad-block'
    });

    /**
     * @type {ad.service.ClickMonkeyService}
     * @private
     */
    this._cms = new ad.service.ClickMonkeyService();

    /**
     * @type {ad.service.ClickService}
     * @private
     */
    this._cs = new ad.service.ClickService();

    /**
     * @private
     * @type {string}
     */
    this._canvas_id = canvas_id;
};
baidu.inherits(ad.widget.MaterialContainer, ad.widget.WidgetContainer);

/**
 * @inheritDoc
 */
ad.widget.MaterialContainer.prototype.sendLog = function(title, xp) {
    var me = this;
    me._cms.sendLog({
        'r' : new Date().valueOf(),
        'q' : (window['bdQuery'] || ''),
        'xp' : xp,
        'plid' : me.getId().replace(/ec-ma-/, ''),
        'title' : title
    });
};

/**
 * 获取ClickMonkeyService实例
 * @return {ad.service.ClickMonkeyService}
 */
ad.widget.MaterialContainer.prototype.getCMS = function() {
    return this._cms;
}

/**
 * 获取ClickService实例
 * @return {ad.service.ClickService}
 */
ad.widget.MaterialContainer.prototype.getCS = function() {
    return this._cs;
}

/**
 * 获取画布元素.
 * @return {!Element} 画布所处的DOM元素.
 */
ad.widget.MaterialContainer.prototype.getRoot = function() {
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
ad.widget.MaterialContainer.prototype.getId = function() {
    return (COMPILED ? this._canvas_id : 'canvas');
};

/**
 * 创建物料的样式，这个函数应该只需要被调用一次.
 * @private
 */
ad.widget.MaterialContainer.prototype._createStyles = function() {
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
ad.widget.MaterialContainer.prototype.show = function() {
    var me = this,
        html = me.getMainHtml(),
        root = me.getRoot();

    me._createStyles();

    if (root) {
        root.innerHTML = html;
        // 这个属性是一个标识，QA用来识别物料是否渲染完毕
        root.setAttribute("data-rendered", "true");
    }

    // trigger enterDocument event
    me.enterDocument();

    // trigger bindEvent event
    me.bindEvent();

    baidu.show(this.getId());
};

/**
 * 增加监控
 * @param {string} main_url 主链接地址
 */
ad.widget.MaterialContainer.prototype.initMonitor = function(main_url) {
    this._cms.init(this.getId());
    this._cs.init(this.getId(), main_url);
};

/**
 * 物料销毁的工作.
 */
ad.widget.MaterialContainer.prototype.dispose = function() {
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














/* vim: set ts=4 sw=4 sts=4 tw=100 : */
