/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id: statistics_service.js 9848 2012-06-20 10:14:29Z liyubei $
 *
 **************************************************************************/

/**
 * src/ad/service/statistics_service.js ~ 2012/08/09 15:55:26
 * @author pengxing(pengxing@baidu.com)
 * @version $Revision: 9848 $
 * @description
 * 监控品专广告的广告加载时间、用户鼠标停留时间和广告的可视展现量
 **/

goog.require('ad.service.Service');

goog.provide('ad.service.StatisticsService');

/**
 * @constructor
 * @extends {ad.service.Service}
 */
ad.service.StatisticsService = function(){
    ad.service.Service.call(this);

    /**
     * 物料的ID
     */
    this.id;

    /**
     * 配置项
     * 1. 可视区域在页面的百分比
     * 2. 可视区域在页面展现时长
     * 3. 发送统计的函数
     */
    this.config = {
        'threshold': 0.5,
        'timer': 1000
    };
};
baidu.inherits(ad.service.StatisticsService, ad.service.Service);

/**
 * 把参数拼接到url中发送统计
 * @private
 */
ad.service.StatisticsService.prototype.log = function(opt){
    var logUrl = 'http://wbapi.baidu.com/v.gif?plid=' + this.id;
    var params = {
        'q': window['bdQuery'],
        't': +new Date()
    };
    baidu.extend(params, opt);

    for (var p in params) {
        logUrl += '&' + p + '=' + encodeURIComponent(params[p]);
    }
    baidu.sio.log(logUrl);
};

/**
 * @override
 * @param {string} id AD id
 */
ad.service.StatisticsService.prototype.init = function(id){
    var me = this;
    me.id = id;
 

    //发送加载时间统计，放在最开始，此时间统计为展现时间的统计
    if(typeof m_startTime != 'undefined'){
        me.log({
            'title': 'loadtime',
            'time': new Date() - m_startTime
        });
    }

    /**
     * 品专广告的DOM节点
     */

    var maDom = baidu.g(id);
    if(!maDom) return;

    /**
     * 品专广告的DOM节点部分信息，包括位置，高度
     */
    var maInfo = {
        'pos': baidu.dom.getPosition(maDom),
        'height': maDom.offsetHeight
    };


    var criticalHeight = maDom.offsetHeight * me.config['threshold']; //可视部分的临界高度
    var _scrollTimer;
    var scrollHandler = function(){
        //计算广告在页面的中的可视区域的高度
        /**
         * 在这里采用一条Y坐标，原点为页面可视区域的左上角
         *
         *             |
         *             |
         *             | 
         *             0 ---(y1)
         *             |
         *             |
         *             |--- (y1，广告顶端距离可视区域顶端有一段距离时)
         *             |
         *             |
         *             |
         *             |
         *             |---(y2，广告底部没有被遮住)
         *             |
         *             |---(y3，页面可视区域的Y坐标)
         *             |
         *             |---(y2，广告下面被遮住的情况，在这种情况下，y2会等于y3)
         *             |
         *             V
         *
         * y2 - y1 就是可视区域的高度，在这里高度可能为负数
         */
        var scrollTop = baidu.page.getScrollTop();
        var viewHeight = baidu.page.getViewHeight();

        var height = Math.max(0, Math.min(maInfo.pos.top + maInfo.height, scrollTop + viewHeight) - Math.max(maInfo.pos.top, scrollTop));

        if(height < criticalHeight){
            //被遮住的超过50%
            if(_scrollTimer){
                clearTimeout(_scrollTimer);
                _scrollTimer = null;
            }
        } else {
            if(!_scrollTimer){
                //start timer
                _scrollTimer = setTimeout(function(){
                    me.log({
                        'title': 'view'
                    });
                    baidu.un(document, 'scroll', scrollHandler);
                    baidu.un(window, 'resize', scrollHandler);
                    clearTimeout(_scrollTimer);
                }, me.config['timer']);
            }
        }
    };

    baidu.on(document, 'scroll', scrollHandler);
    baidu.on(window, 'resize', scrollHandler);
    scrollHandler();

    //监控用户鼠标停留时间
    var _startTime, _endTime, _sentTag = true,
        sendHangTimeLog = function(type){
            //已经发送了统计就不发了
            if(_sentTag){
                return;
            }
            _endTime = new Date();
            _sentTag = true;
            me.log({
                'title': 'hangTime',
                'type': type,
                'time': _endTime - _startTime
            });
        };
    baidu.on(maDom, 'mouseenter', function(){
        _sentTag = false;
        _startTime = new Date();
    });
    baidu.on(maDom, 'mouseleave', function(){
        sendHangTimeLog('out');
    });
    //用户点击链接打开新窗口算做一次mouseleave事件
    baidu.on(maDom, 'click', function(event){
        event = event || window.event;
        var target = event.srcElement || event.target;

        //向上找3次，找到A标签为止
        for(var i = 0; i < 3; i++){
            if(target.nodeName == 'A'){
                break;
            }
            target = baidu.dom.getParent(target);
        }

        if(target.nodeName == 'A' && target.getAttribute('target') == '_blank' && /https?:\/\//.test(target.getAttribute('href'))){
            sendHangTimeLog('link');
        }
    });

};
