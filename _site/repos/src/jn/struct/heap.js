/***************************************************************************
 * 
 * Copyright (c) 2013 Baidu.com, Inc. All Rights Reserved
 * $Id$ 
 * 
 **************************************************************************/
 
 
 
/**
 * heap.js ~ 2013/02/14 17:18:21
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$ 
 * @description 
 * Binary Heap
 * @see http://en.wikipedia.org/wiki/Binary_heap
 **/

/**
 * @constructor
 * @param {Array.<*>} opt_data
 * @param {Function=} opt_comparator
 */
function Heap(opt_data, opt_comparator) {
  /**
   * @type {Array.<*>}
   */
  this._collections = opt_data || [];

  this._comparator = opt_comparator || function(a, b) {
    if (a > b) return 1;
    if (a == b) return 0;
    if (a < b) return -1;
  };

  this._build();
}

Heap.prototype.peek = function() {
  return this._collections[0];
}

Heap.prototype.pop = function() {
  var value = this.peek();

  // 把最后一个元素跟第一个元素交换位置
  this._collections[0] = this._collections[this._collections.length - 1];
  this._collections.length -= 1;

  // 重新调整数组的顺序
  this._heapifyDown(0);

  return value;
}

Heap.prototype.insert = function(item) {
  this._collections.push(item);
  this._heapifyUp(this._collections.length - 1);
}

Heap.prototype._build = function() {
  var size = this._collections.length;
  for (var i = Math.floor(size / 2); i >= 0; i --) {
    this._heapifyDown(i);
  }
}

/**
 * @param {number} index from index to bubble down.
 */
Heap.prototype._heapifyDown = function(index) {
  if (index < 0) {
    throw new Error("invalid index value = [" + index + "]");
  }

  var size = this._collections.length;
  if (size <= 1) {
    return;
  }

  while (true) {
    var left = 2 * index + 1;
    var right = 2 * index + 2;
    var largest = index;

    if (left < size && this._comparator(this._collections[left],
                                        this._collections[largest]) === 1) {
      largest = left;
    }
    if (right < size && this._comparator(this._collections[right],
                                         this._collections[largest]) === 1) {
      largest = right;
    }

    if (largest !== index) {
      this._swap(largest, index);
      index = largest;
    } else {
      break;
    }
  }
}

/**
 * @param {number} index from index to bubble up.
 */
Heap.prototype._heapifyUp = function(index) {
  if (index < 0) {
    throw new Error("invalid index value = [" + index + "]");
  }

  if (this._collections.length <= 1) {
    // only one element
    return;
  }

  // n -> 2n + 1
  // n -> 2n + 2
  while (true) {
    var parentIndex = Math.floor((index - 1) / 2);
    var result = this._comparator(this._collections[index],
      this._collections[parentIndex]);
    if (result === 1) {
      // 1: big
      // 0: equal
      // -1: small
      this._swap(index, parentIndex);
      index = parentIndex;
    } else {
      break;
    }
  }
}

Heap.prototype._swap = function(a, b) {
  var tmp = this._collections[a];
  this._collections[a] = this._collections[b];
  this._collections[b] = tmp;
}

Heap.prototype.toString = function() {
  return this._collections.join(',');
}

exports.Heap = Heap;





















/* vim: set ts=4 sw=4 sts=4 tw=100: */
