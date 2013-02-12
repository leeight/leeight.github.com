/***************************************************************************
 * 
 * Copyright (c) 2013 Baidu.com, Inc. All Rights Reserved
 * $Id$ 
 * 
 **************************************************************************/
 
 
 
/**
 * tree_dfs.js ~ 2013/02/11 22:38:04
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$ 
 * @description 
 *  
 **/
var util = require("util");
var Node = require("./node").Node;

function Stack() {
  this._collections = [];
}
Stack.prototype.add = function(item) {
  this._collections.push(item);
}
Stack.prototype.get = function() {
  return this._collections.pop();
}
Stack.prototype.empty = function() {
  return this._collections.length <= 0;
}

function Queue() {
  Stack.call(this);
}
util.inherits(Queue, Stack);

Queue.prototype.get = function() {
  return this._collections.shift();
}

function graphTraversal(root, collections, callback) {
  var visited = {};

  collections.add(root);
  while (!collections.empty()) {
    var n = collections.get();
    if (!visited[n]) {
      visited[n] = true;
      callback(n);
      for(var i = 0; i < n.children.length; i ++) {
        collections.add(n.children[i]);
      }
    } else {
      console.error(n + ' was visited');
    }
  }
}

function dfs(root, callback) {
  graphTraversal(root, new Stack(), callback);
}
function bfs(root, callback) {
  graphTraversal(root, new Queue(), callback);
}

function genTree() {
  var root = new Node('ROOT');

  var node_2 = new Node('2');
  var node_3 = new Node('3');
  var node_4 = new Node('4');
  var node_5 = new Node('5');
  var node_6 = new Node('6');
  var node_7 = new Node('7');
  var node_8 = new Node('8');
  var node_9 = new Node('9');
  var node_10 = new Node('10');
  var node_11 = new Node('11');
  var node_12 = new Node('12');

  // build tree
  node_3.addChild(node_4);
  node_3.addChild(node_5);

  node_2.addChild(node_3);
  node_2.addChild(node_6);

  node_9.addChild(node_10);
  node_9.addChild(node_11);

  node_8.addChild(node_9);
  node_8.addChild(node_12);

  // node_5.addChild(node_10);
  // node_5.addChild(root);

  root.addChild(node_2);
  root.addChild(node_7);
  root.addChild(node_8);

  return root;
}

function genTree2() {
  var node_a = new Node('a');
  var node_b = new Node('b');
  var node_c = new Node('c');
  var node_d = new Node('d');
  var node_e = new Node('e');
  var node_f = new Node('f');
  var node_g = new Node('g');

  node_b.addChild(node_d);
}

var root = genTree();
dfs(root, function(node){
  console.log(node.getName());
});
bfs(root, function(node){
  console.log(node.getName());
});





















/* vim: set ts=4 sw=4 sts=4 tw=100: */
