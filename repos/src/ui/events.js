/***************************************************************************
 *
 * Copyright (c) 2011 Baidu.com, Inc. All Rights Reserved
 * $Id: events.js 3142 2011-03-11 03:39:12Z liyubei $
 *
 **************************************************************************/



/**
 * src/ui/events.js ~ 2011/03/02 21:06:08
 * @author leeight(liyubei@baidu.com)
 * @version $Revision: 3142 $
 * @description
 * 事件类型的定义
 **/

goog.provide('ui.events');


/**
 * @enum {string}
 */
ui.events = {
  // 浏览器事件
  LOAD: 'load',
  CLICK: 'click',
  DBCLICK: 'dbclick',
  MOUSE_OVER: 'mouseover',
  MOUSE_OUT: 'mouseout',
  ENTER: 'enter',
  OPEN: 'open',
  CHANGE: 'change',
  FOCUS: 'focus',
  BLUR: 'blur',

  // 自定义的事件
  VIEWAREA_CHANGE: 'viewareachange',
  BEFORE_CHANGE: 'beforechange',
  AFTER_CHANGE: 'afterchange',
  BEFORE_QUEUE: 'beforequeue',
  BEFORE_SUBMIT: 'beforesubmit',
  AFTER_QUEUE: 'afterqueue',
  BEFORE_UPLOAD: 'beforeupload',
  AFTER_UPLOAD: 'afterupload',
  UPLOAD_SUCCESS: 'uploadsuccess',
  UPLOAD_FAILURE: 'uploadfailure',
  AFTER_DELETE: 'afterdelete',
  AFTER_RENDER: 'afterrender',
  AFTER_COLUMN_RESIZE: 'aftercolumnresize',
  AFTER_SELECT: 'afterselect',
  AFTER_SHOW: 'aftershow',
  AFTER_HIDE: 'afterhide',
  AFTER_SORT: 'aftersort',
  CANVAS_CHANGE: 'canvaschange',
  FORM_CHANGE: 'formchange',
  FORM_FOCUS: 'formfocus',
  HEIGHT_CHANGE: 'heightchange',
  CANVAS_HEIGHT_CHANGE: 'canvasheightchange',
  PREFS_HEIGHT_CHANGE: 'prefsheightchange',
  BEFORE_VALIDATE: 'beforevalidate',
  AFTER_VALIDATE: 'aftervalidate',
  FILES_CHANGED: 'fileschanged',
  BEFORE_REDIRECT: 'beforeredirect',
  CLOSE: 'onclose',
  SHOW_TIP: 'showtip',
  HIDE_TIP: 'hidetip',
  VIDEO_START: 'videostart',
  VIDEO_FINISH: 'videofinish',
  VIDEO_CLICK: 'videoclick',
  TAB_CHANGE: 'tabchange',
  TAB_CLICK: 'tabclick',
  TAB_HOVER: 'tabhover',
  WEIBO_FOLLOW: 'weibofollow',
  WEIBO_TRANSFORMATION: 'weibotransformation',
  WEIBO_STORE: 'weibostore',
  WEIBO_NAME: 'weiboname',
  WEIBO_CRIT: 'weibocrit',
  TIME_LINE_LOADED: 'timelineloaded',
  ARROW_RIGHT: 'arrowright',
  ARROW_LEFT: 'arrowleft',
  CARD_CLICK: 'cardclick',
  SHARE: 'share',
  SEND_LOG: 'sendlog',
  DRAG_START: 'dragstart',
  DRAG_END: 'dragend',
  DRAG: 'drag',

  MAP_ALL_CLICK:'mapallclick',
  MAP_CLICK:'mapclick',
  NEW_EVENT_ADDED: 'neweventadded'
};




















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
