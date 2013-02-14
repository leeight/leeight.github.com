/***************************************************************************
 * 
 * Copyright (c) 2013 Baidu.com, Inc. All Rights Reserved
 * $Id$ 
 * 
 **************************************************************************/
 
 
 
/**
 * test_heap.js ~ 2013/02/14 17:43:54
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$ 
 * @description 
 *  
 **/
var Heap = require("./heap").Heap;
function comparator(a, b) {
  if (a > b) return 1;
  if (a == b) return 0;
  if (a < b) return -1;
}

exports.testInsert = function(test) {
  var heap = new Heap();

  heap.insert(1);
  test.equal(heap.toString(), "1");
  test.equal(heap.peek(), 1);

  heap.insert(2);
  test.equal(heap.toString(), "2,1");
  test.equal(heap.peek(), 2);

  heap.insert(3);
  test.equal(heap.toString(), "3,1,2");
  test.equal(heap.peek(), 3);

  heap.insert(4);
  test.equal(heap.toString(), "4,3,2,1");
  test.equal(heap.peek(), 4);

  heap.insert(5);
  test.equal(heap.toString(), "5,4,2,1,3");
  test.equal(heap.peek(), 5);

  heap.insert(1);
  test.equal(heap.toString(), "5,4,2,1,3,1");
  test.equal(heap.peek(), 5);

  heap.insert(1);
  test.equal(heap.toString(), "5,4,2,1,3,1,1");
  test.equal(heap.peek(), 5);

  heap.insert(1);
  test.equal(heap.toString(), "5,4,2,1,3,1,1,1");
  test.equal(heap.peek(), 5);

  heap.insert(2);
  test.equal(heap.toString(), "5,4,2,2,3,1,1,1,1");
  test.equal(heap.peek(), 5);

  heap.insert(4);
  test.equal(heap.toString(), "5,4,2,2,4,1,1,1,1,3");
  test.equal(heap.peek(), 5);

  test.done();
}

exports.testPop = function(test) {
  var heap = new Heap();

  heap.insert(1);
  test.equal(heap.toString(), "1");
  test.equal(heap.peek(), 1);
  test.equal(heap.pop(), 1);
  test.equal(heap.toString(), "");

  [1,2,3,4,5,1,1,1,2,4].forEach(function(value){
    heap.insert(value);
  });

  test.equal(heap.peek(), 5);
  test.equal(heap.pop(), 5);
  test.equal(heap.toString(), "4,4,2,2,3,1,1,1,1");

  test.equal(heap.peek(), 4);
  test.equal(heap.pop(), 4);
  test.equal(heap.toString(), "4,3,2,2,1,1,1,1");

  test.done();
}



















/* vim: set ts=4 sw=4 sts=4 tw=100: */
