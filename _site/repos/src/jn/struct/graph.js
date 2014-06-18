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

function Graph() {
  // 邻接矩阵
  /**
   * @type {Object.<string, Array.<Node>>}
   */
  this.vertexs = {};

  /**
   * @type {Array.<Node>}
   */
  this._nodes = [];

  this._stack = [];

  this._cycles = [];
}

/**
 * @param {Node} v
 * @param {Node} u
 */
Graph.prototype.addEdge = function(v, u) {
  var list = this.getAdjacencyList(v);
  list.push(u);

  this._addNodeIfNotExist(v);
  this._addNodeIfNotExist(u);
}

Graph.prototype._addNodeIfNotExist = function(node) {
  if (this._nodes.indexOf(node) === -1) {
    this._nodes.push(node);
  }
}

Graph.prototype.getNodes = function() {
  return this._nodes;
}

Graph.prototype.getAdjacencyList = function(v) {
  return (this.vertexs[v] || (this.vertexs[v] = []));
}

Graph.prototype.visit = function(node) {
  node.status = Node.STATUS.VISITING;
  this._stack.push(node);

  var list = this.getAdjacencyList(node);
  for (var i = 0; i < list.length; i ++) {
    var u = list[i];
    if (u.status === Node.STATUS.VISITING) {
      // Dump cycles
      var string = [];
      for(var i = 0; i < this._stack.length; i ++) {
        string.push(this._stack[i].getName());
      }
      string.push(u.getName());
      this._cycles.push(string.join(' -> '));
      return true;
    } else if (u.status === Node.STATUS.NOT_VISITED) {
      if (this.visit(u)) {
        return true;
      }
    }
  }

  node.status = Node.STATUS.VISITED;
  this._stack.pop();

  return false;
}

/**
 * @see http://en.wikipedia.org/wiki/Dijkstra%27s_algorithm
 * @param {Node} source
 */
Graph.prototype.dijkstra = function(source) {
  var dist = {};
  var previous = {};
  var list = this.getNodes();

  for (var i = 0; i < list.length; i ++) {
    var v = list[i];
    dist[v] = Infinity;
    previous[v] = null;
  }

  dist[source] = 0;
  while (list.length) {
    var u = queue.get();
    if (dist[u] === Infinity) {
      break;
    }

    var neighbors = this.getAdjacencyList(u);
    for (var i = 0; i < neighbors.length; i ++) {
      var v = neighbors[i];
      var tmp = dist[u] + dist_between(v, u);
      if (tmp < dist[v]) {
        dist[v] = tmp;
        previous[v] = u;
      }
    }
  }
}

/**
 * @see http://en.wikipedia.org/wiki/Tarjan's_strongly_connected_components_algorithm
 */
Graph.prototype.tarjan = function() {
  var index = 0;
  var stack = [];
  var me = this;

  var nodes = this.getNodes();
  nodes.forEach(function(node){
    if (node.index == null) {
      // node.index is undefined
      strongconnect(node);
    }
  });

  function strongconnect(v) {
    // Set the depth index for v to the smallest unused index
    v.index = index;
    v.lowlink = index;
    index += 1;
    stack.push(v);

    // Consider successors of v
    var list = me.getAdjacencyList(v);
    for (var i = 0; i < list.length; i ++) {
      var w = list[i];
      if (w.index == null) {
        // Successor w has not yet been visited; recurse on it
        strongconnect(w);
        v.lowlink = Math.min(v.lowlink, w.lowlink);
      } else if (stack.indexOf(w) != -1) {
        // Successor w is in stack S and hence in the current SCC
        v.lowlink = Math.min(v.lowlink, w.index);
      }
    }

    // If v is a root node, pop the stack and generate an SCC
    if (v.lowlink == v.index) {
      var scc = [v.getName()];
      do {
        w = stack.pop();
        scc.unshift(w.getName());
      } while(w !== v);
      console.log(scc.join(' -> '));
    }
  }
}

/**
 * @return {boolean}
 */
Graph.prototype.hasCycle = function() {
  // A -> B
  // A -> C -> B
  var nodes = this.getNodes();

  nodes.forEach(function(node){
    node.status = Node.STATUS.NOT_VISITED;
  });

  for(var i = 0; i < nodes.length; i ++) {
    if (nodes[i].status === Node.STATUS.NOT_VISITED) {
      if (this.visit(nodes[i])) {
        break;
      }
    }
  }

  console.log(this._cycles.join('\n'));

  return !!this._cycles.length;
}

Graph.prototype.toString = function() {
  var msg = [];
  var me = this;
  Object.keys(this.vertexs).forEach(function(key){
    var list = me.vertexs[key];
    var string = [];
    for(var i = 0; i < list.length; i ++) {
      string.push(list[i].toString());
    }
    msg.push(key + ' -> [' + string.join(', ') + ']');
  });
  return msg.join('\n');
}

/**
 * @constructor
 */
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
Stack.prototype.toString = function() {
  var string = [];
  this._collections.forEach(function(item){
    string.push(item.toString());
  });
  return string.join(' -> ');
}

/**
 * @constructor
 * @extends {Stack}
 */
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
      console.error(n.getParent().getName() + ' -> ' + n.getName() + ' is backedge.');
    }
  }
}

function dfs(root, callback) {
  graphTraversal(root, new Stack(), callback);
}
function bfs(root, callback) {
  graphTraversal(root, new Queue(), callback);
}


exports.Graph = Graph;
exports.Stack = Stack;
exports.Queue = Queue;
exports.bfs = bfs;
exports.dfs = dfs;


















/* vim: set ts=4 sw=4 sts=4 tw=100: */
