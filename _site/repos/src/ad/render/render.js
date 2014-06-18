/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/ad/render.js ~ 2012/06/04 22:02:39
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 * 渲染器的基类
 **/

goog.provide('ad.render.Render');

/**
 * @constructor
 */
ad.render.Render = function() {
    // TODO
};

/**
 * @param {Array.<ad.widget.Widget>} var_args Zero or more sets, as arrays.
 * @return {string} 最终广告的物料代码.
 */
ad.render.Render.prototype.process = baidu.abstractMethod;





















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
