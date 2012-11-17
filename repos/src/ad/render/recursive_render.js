/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/ad/ad.js ~ 2012/06/04 14:52:21
 * @author songao(songao@baidu.com)
 * @version $Revision$
 * @description
 * 加载不同模块，从而渲染整个Ad
 **/

goog.require('ad.render.Render');

goog.provide('ad.render.RecursiveRender');

/**
 * @param {{block_class: string}=} opt_options 选项
 * @constructor
 * @extends {ad.render.Render}
 */
ad.render.RecursiveRender = function(opt_options) {
    this._options = baidu.object.extend({
        'block_class': 'ad-layout-block'
    }, opt_options || {});

    ad.render.Render.call(this);
};
baidu.inherits(ad.render.RecursiveRender, ad.render.Render);

/**
 * 调用示例：
 * Ad.render(
 *   [new ad.widget.Header(a), [new ad.widget.SmallWeibo(m), new ad.widget.SearchBox(n)]],
 *   [new ad.Widget.Footer(b)],
 *   [new ad.widget.Header(a)]
 * );
 * 从调用的方式，我们就可以推算出，这个广告物料的布局是3行1列,因此我们
 * 可以生成如下的html结构：
 *     <div class="block-0">
 *       <div class="block-0-0"></div>
 *       <div class="block-0-1">
 *          <div class="block-0-1-0"></div>
 *          <div class="block-0-1-1"></div>
 *       </div>
 *     </div>
 *     <div class="block-1">
 *       <div class="block-1-0"></div>
 *     </div>
 *     <div class="block-2">
 *       <div class="block-2-0"></div>
 *     </div>
 * @param {Array.<ad.widget.Widget>} widgets Zero or more sets, as arrays.
 * @return {string} 最终广告的物料代码.
 */
ad.render.RecursiveRender.prototype.process = function(widgets) {
    var layout = this.genLayout(widgets);
    var data = {};

    function walker(part, idxArr) {
        if (baidu.lang.isArray(part)) {
            baidu.each(part, function(item, index) {
                walker(item, idxArr.concat([index]));
            });
        } else {
            html = part.getMainHtml();
            data['block-' + idxArr.join('-') + '-id'] = part.getId();
            data['block_' + idxArr.join('_')] = html;
        }
    }
    walker(widgets, []);

    // 不应该用baidu.format，说不准哪个投放的页面用了
    // tangram，然后那个版本的baidu.format跟我的行为不一致
    var html = Mustache.render(layout, data);

    return html;
};

/**
 * 生成layout的布局结构
 * @param {Array.<*>} layouts 布局信息.
 * @return {string} 生成的layout的html结构，可以给Mustache直接使用.
 */
ad.render.RecursiveRender.prototype.genLayout = function(layouts) {
    var me = this,
        layout = [];

    baidu.each(layouts, function(item, index) {
        layout.push(me.getLayoutBlock(item, [index]));
    });
    return layout.join('\n');
};

/**
 * 生成layout的一个block
 * @param {ad.widget.Widget|Array} part
 * @param {Array.<number>} indexes block的索引序列
 * @return {string}
 */
ad.render.RecursiveRender.prototype.getLayoutBlock = function(part, indexes) {
    var me = this,
        html = [
            Mustache.render('<div class="{{block_class}} {{block_class}}-{{indexes}}" id="{{=<% %>=}}{{block-<% indexes %>-id}}">', {
                'block_class': me._options['block_class'],
                'indexes': indexes.join('-')
            })
        ];

    if (baidu.lang.isArray(part)) {
        baidu.each(part, function(item, index) {
            html.push(me.getLayoutBlock(item, indexes.concat([index])));
        });
    } else {
        html.push('{{{block_' + indexes.join('_') + '}}}');
    }
    html.push('</div>');
    return html.join('\n');
};



















/* vim: set ts=4 sw=4 sts=4 tw=100: */
