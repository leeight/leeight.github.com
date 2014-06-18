/***************************************************************************
 * 
 * Copyright (c) 2013 Baidu.com, Inc. All Rights Reserved
 * $Id$ 
 * 
 **************************************************************************/
 
 
 
/**
 * test_graph.js ~ 2013/02/14 15:11:19
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$ 
 * @description 
 *  
 **/
var Node = require("./node").Node;
var Graph = require("./graph").Graph;

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

  node_a.addChild(node_b);
  node_b.addChild(node_c);
  node_c.addChild(node_d);
  node_c.addChild(node_a);
  node_d.addChild(node_e);
  node_e.addChild(node_c);
  node_e.addChild(node_a);

  return node_a;
}

function genGraph() {
  var graph = new Graph();

  var node_a = new Node('a');
  var node_b = new Node('b');
  var node_c = new Node('c');

  graph.addEdge(node_a, node_b);
  graph.addEdge(node_a, node_c);
  graph.addEdge(node_c, node_b);
  graph.addEdge(node_b, node_c);

  return graph;
}

function genGraph2() {
  var node_a = new Node('a');
  var node_b = new Node('b');
  var node_c = new Node('c');
  var node_d = new Node('d');
  var node_e = new Node('e');

  var graph = new Graph();
  graph.addEdge(node_a, node_b);
  graph.addEdge(node_b, node_c);
  graph.addEdge(node_c, node_d);
  graph.addEdge(node_c, node_a);
  graph.addEdge(node_d, node_e);
  graph.addEdge(node_e, node_a);
  graph.addEdge(node_e, node_c);

  return graph;
}

function genGraph3() {
  var node_a = new Node('a');
  var node_b = new Node('b');
  var node_c = new Node('c');
  var node_d = new Node('d');
  var node_e = new Node('e');
  var node_f = new Node('f');
  var node_g = new Node('g');
  var node_h = new Node('h');

  var graph = new Graph();

  graph.addEdge(node_a, node_b);

  graph.addEdge(node_b, node_c);
  graph.addEdge(node_b, node_f);
  graph.addEdge(node_b, node_e);

  graph.addEdge(node_c, node_d);
  graph.addEdge(node_c, node_g);

  graph.addEdge(node_d, node_c);
  graph.addEdge(node_d, node_h);

  graph.addEdge(node_h, node_d);
  graph.addEdge(node_h, node_g);

  graph.addEdge(node_g, node_f);

  graph.addEdge(node_f, node_g);

  graph.addEdge(node_e, node_a);
  graph.addEdge(node_e, node_f);

  return graph;

}

var graph = genGraph3();
console.log(graph.toString());
graph.tarjan();
// console.log(graph.hasCycle());

/*
var root = genTree2();
dfs(root, function(node){
  console.log(node.getName());
});
*/

/*
var root = genTree();
dfs(root, function(node){
  console.log(node.getName());
});
bfs(root, function(node){
  console.log(node.getName());
});
*/





















/* vim: set ts=4 sw=4 sts=4 tw=100: */
