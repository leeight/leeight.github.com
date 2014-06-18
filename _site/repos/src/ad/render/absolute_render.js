/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/ad/render/absolute_render.js ~ 2012/10/14 19:44:23
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 * 绝对定位的Render
 **/
goog.require('ad.render.Render');

goog.provide('ad.render.AbsoluteRender');

/**
 * 调用示例：
 * var layouts = [
 *   {'top': 10, 'left': 11, 'width': 100, 'height': 100},
 *   {'top': 30, 'left': 30, 'width': 200, 'height': 200}
 * ];
 * var render = new ad.render.AbsoluteRender(options);
 *
 * @param {Array.<{top:number,left:number,
 *   width:number,height:number}>} layouts 布局的配置信息.
 * @constructor
 * @extends {ad.render.Render}
 */
ad.render.AbsoluteRender = function(layouts) {
    ad.render.Render.call(this);

    /**
     * @private
     */
    this._layouts = layouts;
};
baidu.inherits(ad.render.AbsoluteRender, ad.render.Render);

/**
 * @override
 */
ad.render.AbsoluteRender.prototype.process = function(widgets) {
    var layout = this.genLayout();
    var canvas = '<div class="canvas">' + layout + '</div>';

    var data = {};
    for (var i = 0, widget; widget = widgets[0][i++]; ) {
        data['i' + i + '-id'] = widget.getId();
        data['i' + i] = widget.getMainHtml();
    }

    var html = Mustache.render(canvas, data);

    return html;
};

/**
 * 生成layout的布局结构
 * @return {string} 生成的layout的html结构，可以给Mustache直接使用.
 */
ad.render.AbsoluteRender.prototype.genLayout = function() {
    var layout = ['<div class="layout">'];
    for (var i = 0, item; item = this._layouts[i++]; ) {
        layout.push('<div id="{{i' + i + '-id}}" class="ad-layout-item ad-layout-item-' + i + '" ' +
            'style="position:absolute;top:' + item['top'] + 'px;left:' +
            item['left'] + 'px;width:' + item['width'] + 'px;height:' + item['height'] + 'px;overflow:hidden;">{{{i' + i + '}}}</div>');
    }
    layout.push('</div>');

    return layout.join('\n');
};



















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
