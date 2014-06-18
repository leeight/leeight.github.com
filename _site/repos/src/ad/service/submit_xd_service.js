/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id: submit_xd_service.js 11413 2012-10-08 14:01:22 pengxing$
 *
 **************************************************************************/



/**
 * src/ad/service/submit_xd_service.js ~ 2012/10/08 14:47:40
 * @author pengxing(pengxing@baidu.com)
 * @version $Revision: 11413 $
 * @description
 * 提供跨域提交数据，并支持回调函数
 **/
goog.require('ad.service.Service');

goog.provide('ad.service.SubmitXDService');

/**
 * @constructor
 * @extends {ad.service.Service}
 */
ad.service.SubmitXDService = function(id, url) {
    ad.service.Service.call(this);

    //TODO 这个default_value在正式启用的时候需要修改
    /**
     * 发送数据到url
     * @type {string}
     */
    this.url = url ? url: 'default_value';

    /**
     * 物料ID
     * @type {string}
     */
    this.id = id;
};
baidu.inherits(ad.service.SubmitXDService, ad.service.Service);


ad.service.SubmitXDService.prototype._registerCallback = function(name, wrapperId, callback){
    if(!name || !callback){
        return;
    }
    window[name] = function(){
        callback.apply(null, arguments)
        //销毁函数
        window[name] = null;
        baidu.dom.remove(wrapperId);
    };
};

/**
 * 提交数据的函数
 *
 * @param {Object} data 需要提交的数据
 * @param {function()} callback 回调函数
 */
ad.service.SubmitXDService.prototype.submit = function(data, callback){
    var me = this;
    
    var wrapperId = 'ECMA_WRAPPER_' + me.id + '_' + (+new Date()),
        iframeId = 'ECMA_IFRAME' + me.id + '_' + (+new Date()),
        formId = 'ECMA_FORM' + me.id + '_' + (+new Date()),
        funcId = me.id + '_' + (+new Date()),
        html = [
            '<iframe style="display: none" id="' + iframeId + '" name="' + iframeId + '"></iframe>',
            '<form id="' + formId + '" action="' + me.url + '" method="POST" target="' + iframeId + '" style="display: none">'
        ],
        key, value;

    //将回调函数名加到参数中
    data['callback'] = funcId;

    for(key in data){
        value = data[key];
        html.push('<input name="' + baidu.string.encodeHTML(key) + '" value="' + baidu.string.encodeHTML(value) + '" />');
    }
    
    html.push('</form>');

    //register callback
    me._registerCallback('ECMA_' + funcId, wrapperId, callback);

    var dom = document.createElement('div');
    dom.id = wrapperId;
    dom.innerHTML = html.join('');
    document.body.appendChild(dom);

    baidu.g(formId).submit();
};
