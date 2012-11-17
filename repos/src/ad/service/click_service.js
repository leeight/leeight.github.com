/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/ad/service/click_service.js ~ 2012/06/18 16:47:40
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 * 1. 人工制作的品专物料点击监控的服务
 * 2. 模板工具也有一套，功能基本类似
 * @see https://svn.baidu.com/app/ecom/adcoup/branches/jn-core/jn-core_2-0-0_BRANCH/src/main/resources/htmlMaker/resource/pl_landmark.js
 **/
goog.require('ad.service.Service');

goog.provide('ad.service.ClickService');

/**
 * @constructor
 * @param {string=} opt_product 产品线的类型.
 * @extends {ad.service.Service}
 */
ad.service.ClickService = function(opt_product) {
    ad.service.Service.call(this);

    /**
     * 产品的类型，例如pl, lm
     * @type {string}
     * @private
     */
    this._product = opt_product || 'pl';

    /**
     * 是否已经绑定过了mousedown事件.
     * @private
     * @type {boolean}
     */
    this._eventBounded = false;

    /**
     * 子链接索引
     * @private
     * @type {number}
     */
    this.p2 = 1;
};
baidu.inherits(ad.service.ClickService, ad.service.Service);

/**
 * @param {Node} target 链接地址.
 * @private
 */
ad.service.ClickService.prototype._analyzeAnchor = function(target) {
    if (target.nodeName != 'A') {
        if (target.parentNode.nodeName == 'A') {
            target = target.parentNode;
        }else if (target.parentNode &&
                 target.parentNode.parentNode &&
                 target.parentNode.parentNode.nodeName == 'A') {
            // <a><font><em>飘红词语</em></font></a>
            target = target.parentNode.parentNode;
        } else {
            if (!(target.nodeName == 'INPUT' &&
                 (target.type.toLowerCase() == 'checkbox' ||
                  target.type.toLowerCase() == 'radio'))) {
                return;
            }
        }
    }

    if (target.innerHTML == '品牌推广') return;

    var params = {
        'fm': target.getAttribute('data-fm'),
        'p1': target.getAttribute('data-p1'),
        'url': target.getAttribute('data-url')
    };
    if (target.getAttribute('data-p2')) {
        params['p2'] = target.getAttribute('data-p2');
    }
    if (target.getAttribute('data-title1')) {
        params['title'] = decodeURIComponent(target.getAttribute('data-title1'));
    }
    if (target.getAttribute('data-mu')) {
        params['mu'] = target.getAttribute('data-mu');
    }

    if (typeof window['c'] === 'function') {
        window['c'](params);
    }
};

/**
 * @override
 * @param {string} parameters AD参数.
 * @param {string=} main_url 主链接参数.
 */
ad.service.ClickService.prototype.init = function(parameters,main_url) {
    var canvas = baidu.g(parameters);
    if (!canvas) {
        return;
    }

    var links = canvas.getElementsByTagName('A');

    // 分链接的位置，对于pl广告来说，p2要随着链接递增，
    // p1的值永远都是1
    var mainText,
        mainUrl = main_url || "";
    this.mainAnchor = links.length > 0 ? links[0] : null;
    // find main url
    for (var i = 0, l = links.length; i < l; i++) {
        if (links[i].getAttribute('data-is-main-url') === 'true') {
            this.mainAnchor = links[i];
            if(mainUrl){
                this.mainAnchor.setAttribute('ourl', mainUrl);
            }
            break;
        }
    }

    // record main url's information
    if (this.mainAnchor) {
        if (this.mainAnchor.innerHTML) {
            mainText = encodeURIComponent(this.mainAnchor.innerHTML);
            this.mainAnchor.setAttribute('data-title1', mainText);
        }
        if (this.mainAnchor.getAttribute('ourl') || this.mainAnchor.href) {
            // ourl为了跟品专和地标保持一直
            mainUrl = this.mainAnchor.getAttribute('ourl') || this.mainAnchor.href;
        }
    }

    for (var i = 0, link = null; link = links[i]; i++) {
        link.setAttribute('data-p1', 1);
        link.setAttribute('data-fm', this._product);
        link.setAttribute('data-url', link.getAttribute('ourl') || link.href);

        if (link !== this.mainAnchor) {
            link.setAttribute('data-p2', this.p2++);
            if (typeof mainText != 'undefined') {
                link.setAttribute('data-title1', mainText);
            }
            if (typeof mainUrl != 'undefined') {
                link.setAttribute('data-mu', mainUrl);
            }
        }
        /* 不需要设置默认的title2属性
        if (!link.getAttribute('title2')) {
            // 这里不用data-title2，因为ClickMonkey里面用了title2的属性
            // title2属性不需要encodeURIComponent，ClickMonkey里面已经做了处理
            link.setAttribute('title2', (decodeURIComponent(mainText || '')));
        }*/
    }

    var me = this;
    if (!me._eventBounded) {
        baidu.on(canvas, 'mousedown', function(opt_evt) {
            var evt = opt_evt || window.event;
            var target = evt.srcElement || evt.target;
            if (!target || target.nodeType != 1) {
                return;
            }

            me._analyzeAnchor(target);
        });
        me._eventBounded = true;
    }
};





















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
