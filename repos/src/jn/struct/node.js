/***************************************************************************
 * 
 * Copyright (c) 2013 Baidu.com, Inc. All Rights Reserved
 * $Id$ 
 * 
 **************************************************************************/
 
 
 
/**
 * node.js ~ 2013/02/11 22:37:01
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$ 
 * @description 
 *  
 **/
function Node(name) {
  this.name = name;
  this.children = [];   // Array.<Node>
}

Node.prototype.getName = function() {
  return this.name;
}

Node.prototype.addChild = function(child) {
  this.children.push(child);
}

Node.prototype.toString = function() {
  return 'Node:' + this.name;
}

exports.Node = Node;




















/* vim: set ts=4 sw=4 sts=4 tw=100: */
