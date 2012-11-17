/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/ad/ad.js ~ 2012/06/04 14:52:21
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 * 加载不同模块，从而渲染整个Ad
 **/

goog.require('ad.render.Render');

goog.provide('ad.render.DefaultRender');

/**
 * @constructor
 * @extends {ad.render.Render}
 */
ad.render.DefaultRender = function() {
    ad.render.Render.call(this);
};
baidu.inherits(ad.render.DefaultRender, ad.render.Render);

/**
 * 调用示例：
 * Ad.render(
 *   [new ad.widget.Header(a)],
 *   [new ad.Widget.Footer(b)],
 *   [new ad.widget.Header(a)]
 * );
 * 从调用的方式，我们就可以推算出，这个广告物料的布局是3行1列,因此我们
 * 可以生成如下的html结构：
 * <div class="canvas">
 *   <div class="layout">
 *     <div class="r0">
 *       <div class="c0">
 *       </div>
 *     </div>
 *     <div class="r1">
 *       <div class="c1">
 *       </div>
 *     </div>
 *     <div class="r2">
 *       <div class="c2">
 *       </div>
 *     </div>
 *   </div>
 * </div>
 * @param {Array.<Array.<ad.widget.Widget>>} widgets Zero or more sets, as arrays.
 * @return {string} 最终广告的物料代码.
 */
ad.render.DefaultRender.prototype.process = function(widgets) {
    var layout = this.genLayout(widgets);
    var canvas = '<div class="canvas">' + layout + '</div>';
    var data = {};
    for (var i = 0, rows = widgets; i < rows.length; i++) {
        for (var j = 0, cols = rows[i], html; j < cols.length; j++) {
            html = cols[j].getMainHtml();
            data['r' + i + 'c' + j + '-id'] = cols[j].getId();
            data['r' + i + 'c' + j] = html;
        }
    }

    // 不应该用baidu.format，说不准哪个投放的页面用了
    // tangram，然后那个版本的baidu.format跟我的行为不一致
    var html = Mustache.render(canvas, data);

    return html;
};

/**
 * 生成layout的布局结构
 * @param {Array.<*>} layouts 布局信息.
 * @return {string} 生成的layout的html结构，可以给Mustache直接使用.
 */
ad.render.DefaultRender.prototype.genLayout = function(layouts) {
    var layout = ['<div class="layout">'];
    for (var i = 0, rows = layouts; i < rows.length; i++) {
        layout.push('<div class="ad-layout-row ad-layout-row-' + i + '">');
        for (var j = 0, cols = layouts[i]; j < cols.length; j++) {
            layout.push('<div class="ad-layout-col ad-layout-col-' + j + '" id="{{r' + i + 'c' + j + '-id}}">{{{r' + i + 'c' + j + '}}}</div>');
        }
        layout.push('</div>');
    }
    layout.push('</div>');

    return layout.join('\n');
};




















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
