/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id: rcv2_service.js 11362 2012-08-28 08:31:18Z songao $
 *
 **************************************************************************/



/**
 * src/ad/service/rcv2_service.js ~ 2012/10/15 16:47:40
 * @author pengxing(pengxing@baidu.com)
 * @version $Revision: 11362 $
 * @description
 * 提供RCV2统计的服务
 **/
goog.require('ad.service.Service');

goog.provide('ad.service.RCV2Service');

/**
 * @constructor
 * @param {string} id 物料的id
 * @param {Object=} opt_links LINKS数组，如果不传，直接取scope中的LINKS
 * @param {Object=} opt_rt_config RT_CONFIG，如果不传，直接取scope中的RT_CONFIG
 * @extends {ad.service.Service}
 */
ad.service.RCV2Service = function(id, opt_links, opt_rt_config) {
    ad.service.Service.call(this);

    /**
     * 物料id
     * @type {string}
     */
    this._id = id;

    /**
     * LINKS数组的引用
     * @type {Object}
     */
    this._links = opt_links || ((typeof LINKS == 'undefined') ? null : LINKS);

    /**
     * RT_CONFIG的引用
     * @type {Object}
     */
    this._rt_config = opt_rt_config || ((typeof RT_CONFIG == 'undefined') ? null : RT_CONFIG);


    /**
     * 匹配是否是RCV1的链接
     * @type {RegExp} 匹配是否是RCV链接的正则表达式
     */
    this._RCV_PATTERN = /www\.baidu\.com\/adrc\.php/;

    // Initiate
    this.init();
};
baidu.inherits(ad.service.RCV2Service, ad.service.Service);

/**
 * @override
 */
ad.service.RCV2Service.prototype.init = function(){
    var me = this;

    if(!me._links || !me._rt_config){
        return false;
    }
    var linkIds = me._rt_config['LINK_IDS'];
    me._linkMap = {};
    for(var i = 0, l = me._links.length; i < l; i++){
        me._linkMap[me._links[i]] = linkIds[i];
    }

    me.listenRCVLink();
};

/**
 * 监听是否是RCV链接的点击，如果是，则发送相应字段
 */
ad.service.RCV2Service.prototype.listenRCVLink = function(){
    var me = this;

    var root = baidu.g(me._id);
    if(!root){
        return;
    }
    
    baidu.on(root, 'click', function(event){
        event = event || window['event'];
        var target = event.srcElement || event.target;

        if(target.nodeName.toLowerCase() == 'a'){
            var href = target.href;
            if(href && me._RCV_PATTERN.test(href)){
                var params = {};
                if(me._linkMap){
                    params['linkId'] = me._linkMap[href];
                }
                me.sendLog(params, target);
            }
        }
    });

};

/**
 * 根据参数发送RCV2的日志
 * @param {Object} params 需要发送的参数
 * @param {Node=} opt_element 点击的节点
 * @param {boolean=} opt_is_charge 该统计是否需要计费
 */
ad.service.RCV2Service.prototype.sendLog = function(params, opt_element, opt_is_charge){
    var me = this;
    
    if(!me._links || !me._rt_config){
        return false;
    }

    params = params || {};

    if(opt_element){
        params['xp'] = me.getXPath(opt_element);
    }

    var logUrl = '', p;
    for(p in params){
        logUrl += '&' + p + '=' + encodeURIComponent(params[p]);
    }
    logUrl = logUrl.substring(1);

    logUrl = (opt_is_charge ? me._rt_config['RCV2_URL2'] : me._rt_config['RCV2_URL']) + '&attach=' + encodeURIComponent(logUrl);

    // 采用baidu.sio.log解决IE下image需要挂在window下的问题
    baidu.sio.log(logUrl);
};


/**
 * 根据element生成xpath表达式
 * @param {Node} element 需要计算xpath的节点
 * @param {Node=} opt_canvas 物料画布节点
 */
ad.service.RCV2Service.prototype.getXPath = function(element, opt_canvas){
    var me = this;

    if (element === opt_canvas || baidu.dom.hasAttr(element, 'data-rendered')){
        return 'id("' + element.id + '")';
    }
    if (element === document.body)
        return element.tagName;

    var ix = 0;
    var siblings = element.parentNode.childNodes;
    for (var i = 0, l = siblings.length; i < l; i++) {
        var sibling = siblings[i];
        if (sibling === element) {
            return me.getXPath(element.parentNode, opt_canvas) + '/' + element.tagName + '[' + (ix + 1) + ']';
        }
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
            ix++;
        }
    }
};



















/* vim: set ts=4 sw=4 sts=4 tw=100: */
