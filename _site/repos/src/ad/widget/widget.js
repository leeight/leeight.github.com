/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/ad/widget/widget.js ~ 2012/06/04 14:57:39
 * @author loutongbing
 * @version $Revision$
 * @description
 * 每个模块的基类??
 **/
goog.require('base.EventDispatcher');
goog.require('er.template');
goog.require('ui.events');

goog.provide('ad.widget.Widget');


/**
 * @constructor
 * @param {Object=} data 数据集合.
 * @extends {base.EventDispatcher}
 */
ad.widget.Widget = function(data) {
    base.EventDispatcher.call(this);

    /**
     * 默认配置
     * @type {Object.<string, *>}
     * @private
     */
    this._default;

    /**
     * 模板的名字
     * @type {string}
     * @private
     */
    this._view;

    /**
     * 唯一的标识Id.
     * @type {string}
     * @private
     */
    this._id = 'ad-w-' +
        Math.floor(Math.random() * 2147483648).toString(36);

    /**
     * Material的id
     * @type {string}
     * @private
     */
    this._materialId;

    this.setData(data);
};
baidu.inherits(ad.widget.Widget, base.EventDispatcher);

/** @override */
ad.widget.Widget.prototype.trigger = function(eventType, var_args) {
    if (!this._listeners[eventType]) {
        return true;
    }

    var i,
        handlers = this._listeners[eventType],
        len = handlers.length,
        args = Array.prototype.slice.call(arguments, 1),
        result = true;
    for (i = len - 1; i >= 0; i--) {
        var fn = this._listeners[eventType][i];
        if (fn) {
            if (false === fn.apply(this, args)) {
                result = false;
                break;
            }
        }
    }
    return result;
};

/**
 * 渲染，返回HTML即可
 * @return {string} 最终的html代码.
 */
ad.widget.Widget.prototype.getMainHtml = function() {
    if (!this._view || !this._data) {
        throw new Error('Widget\'s view and data can not be undefined.');
    }

    var me = this;
    var template = this.tpl(this._view);
    var data = baidu.extend(this._data, {
        '_id' : function() {
            return function(text, render) {
                return me.getId(text);
            }
        }
    });
    var html = Mustache.render(template, data);
    return html;
};

/**
 * 数据源更改之后重新渲染Widget，根据不同的Widget实现，可能
 * 需要重新绑定处理事件.
 */
ad.widget.Widget.prototype.render = function() {
    var me = this;
    var root = me.getRoot();
    if (root) {
        var html = me.getMainHtml();
        root.innerHTML = html;
    }
};

/**
 * 处理DOM节点的展示状态.
 * @protected
 * @method
 */
ad.widget.Widget.prototype.enterDocument = baidu.fn.blank;

/**
 * 绑定事件处理函数.
 * @protected
 * @method
 */
ad.widget.Widget.prototype.bindEvent = baidu.fn.blank;

/**
 * @param {Element} root 根节点.
 */
ad.widget.Widget.prototype.setRoot = function(root) {
    if (root) {
        root.id = this.getId();
    }
};

/**
 * 获取控件数据集合
 * @return {Object} data 数据集合.
 */
ad.widget.Widget.prototype.getData = function() {
    return this._data;
};

/**
 * @param {Object=} data 数据集合.
 */
ad.widget.Widget.prototype.setData = function(data) {
    if (data) {
        this._data = baidu.object.extend(this._default || {}, data);
    }
    this.patchData();
};

/**
 * 修订额外的配置数据，某些widget可能会用到，比如video
 */
ad.widget.Widget.prototype.patchData = function() {
    // TODO
};

/**
 * 获取控件所处的元素根节点.
 * @return {Element} Widget元素的根节点.
 */
ad.widget.Widget.prototype.getRoot = function() {
    return baidu.g(this.getId());
};

/**
 * this.getId('body') -> ad-w-x32df-body
 * @param {string=} opt_suffix Id的后缀.
 * @return {string} 生成的Id.
 */
ad.widget.Widget.prototype.getId = function(opt_suffix) {
    if (opt_suffix) {
        return this._id + '-' + opt_suffix;
    } else {
        return this._id;
    }
};

/**
 * 获取物料的id
 * @return {string} 物料的id
 */
ad.widget.Widget.prototype.getMaterialId = function(){
    var me = this;
    if(!me._materialId){
        var root = me.getRoot();

        //get material id
        var d = document, element = root;
        while(element != d){
            if(baidu.dom.hasAttr(element, 'data-rendered')){
                me._materialId = element.id;
                break;
            }
            element = element.parentNode;
        }
    }
    return this._materialId;
};

/**
 * @param {string} name 模板名称.
 * @return {string} 模板代码.
 */
ad.widget.Widget.prototype.tpl = function(name) {
    return er.template.get(name);
};

/**
 * 显示Widget
 */
ad.widget.Widget.prototype.show = function() {
    var root = this.getRoot();
    if (root) {
        baidu.show(root);
    }
};

/**
 * 隐藏Widget
 */
ad.widget.Widget.prototype.hide = function() {
    var root = this.getRoot();
    if (root) {
        baidu.hide(root);
    }
};

/**
 * @param {string} title 日志的标识，比如标题，链接，按钮等等.
 * @param {string=} opt_xp XPath，可选，一般来说是用不到的.
 */
ad.widget.Widget.prototype.sendLog = function(title, opt_xp) {
    this.trigger(ui.events.SEND_LOG, title, opt_xp || '');
};

/**
 * widget的销毁，某些widget可能会用到
 */
ad.widget.Widget.prototype.dispose = function() {
    var root = this.getRoot();
    if (root) {
        root.innerHTML = '';
        root = null;
    }
};

/**
 * 修订title2
 * @param {Element} pNode 父节点.
 * @param {string} prx 前缀.
 */
ad.widget.Widget.prototype.rewriteTitle2 = function(pNode, prx) {
    var as, title2;
    if (pNode) {
        as = pNode.getElementsByTagName('a');
    }
    else{
        as = this.getRoot().getElementsByTagName('a');
    }
    if (as && as.length) {
        for (var i = 0; i < as.length; i++) {
            title2 = baidu.dom.getAttr(as[i], 'title2');
            if (title2) {
                baidu.dom.setAttr(as[i], 'title2', prx + title2);
            }
        }
    }
};

/**
 * 刷新
 * @param {HTMLElement=} root 根节点.
 * @param {Object=} data 配置数据.
 */
ad.widget.Widget.prototype.refresh = function(root, data) {
    var me = this;
    if (root) {
        me.setRoot(root);
    }
    me.setData(data);
    me.render();
    me.enterDocument();
    me.bindEvent();
};







/* vim: set ts=4 sw=4 sts=4 tw=100 : */
