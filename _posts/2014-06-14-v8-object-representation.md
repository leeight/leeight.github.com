---
layout: post
title: V8 Object Representation
author: leeight
---


前面我们介绍了 V8 引擎的 FC 编译器，在介绍 Crankshaft  编译器之前，了解一下 V8 引擎是如何在内存中表示一个对象，对后续的介绍很有帮助。

### Overview

一图胜千言，因此先上图。

![V8 Object Representation](http://yuedu.baidu.com/bookeditor/interface/imageview?book_id=3dd0355590c69ec3d5bb75bb&file=24b08d333a0a818d625bac1253229f6b.png)

大部分对象把它们自身的属性都存放在同一块内存区域中（例如上面的 a，b 这两个属性），所有这样的内存区域都有一个指向 Map 的指针，Map 用来描述这个对象的结构。当这块内存无法存放所有属性的时候，会另外开辟一块儿内存来存放，例如上面的 c，d 这两个属性。数字类型的属性，例如 0，1，2 等等是单独存放的，通常是存储在一个连续的数组中。

上面这个图只是介绍了最常见的一种对象表示形式，当然还有很多特例，下面我们会逐一介绍。

### Some surprising properties of properties

JavaScript 规范允许开发人员通过很灵活的方式定义对象，这就导致 V8 引擎在实现的过程中很难找到一种方式来高效的处理所有的情况。对象本质上来说就是一组属性的结合，同时还有一些对这些属性的操作方法。访问对象上属性的时候有两种方式：

```javascript
obj.prop
obj["prop"]
```

规范里面要求所有的属性名的类型都应该是字符串类型。如果一个属性名不是字符串，那么会隐式的转化为字符串。所以如果用数字当做属性名的话，它会先被转化为字符串，然后再进行下一步的操作。正因为这样我们实际上可以使用负数或者小数作为数组的索引来获取对应的属性值。

```javascript
obj[1];    //
obj["1"];  // names for the same property
obj[1.0];  //

var o = { toString: function () { return "-1.5"; } };

obj[-1.5];  // also equivalent
obj[o];     // since o is converted to string
```

JavaScript 中的数组其实也是对象，只是有一个 length 这个特殊的属性而已。大部分情况下数组这个对象的属性都是非负整数。当访问 length 这个属性的时候，返回最大的属性值 + 1 的结果。例如：

```javascript
var a = new Array();
a[100] = "foo";
a.length;             // returns 101
```

除此之外数组跟普通的对象没有任何区别。函数也是对象，但是它的 length 属性返回的是函数形参参数的个数。

### Dictionary mode

既然前面提到了对象本质上就一个属性的集合，每个属性有自己对应的值，那么为什么不用哈希表来表示一个对象呢？实际上最早的 JavaScript 引擎就是这么做的，工作起来也不错，而是 V8 引擎有时候也会采用哈希表来表示复杂的对象，这些对象复杂到无法用上面图表中描述的形式来表示。但是我们需要牢记的是通过访问哈希表来查找一个对象的属性值比直接根据索引来获取代价要高的多。

让我们先看看字符串和哈希表在 V8 引擎里面是如何工作呢。字符串有多种表达形式，用来表示属性名的是最常见的 ASCII 序列，字符一个接一个的连续存储。

```javascript
00:  map (string type)
04:  length (in characters)
08:  hash code (lazily computed)
12:  characters...
```

字符串的内容是不可变的，唯一可变的是惰性计算而来的哈希值。用做属性名的字符串通常也称作『符号』，这意味着它必须独有。非独有的字符串如果被用作属性名，都会被单独复制一份出来，以便不受其它修改的影响。

V8 引擎里面的哈希表是一个包含 键  和 值 的大数组。最初的时候所有的键和值都是 Undefined。当一个键值对插入到哈希表的时候，首先计算键的哈希值（前面提过了，所有的健都是字符串类型），计算出来的哈希值的低位用做数组的下标。如果数组的该位置已经被占用，则哈希表尝试（长度取模过后的）下一个位置，以此类推。以下是这一过程的伪代码：

```python
insert(table, key, value):
  table = ensureCapacity(table, length(table) + 1)
  code = hash(key)
  n = capacity(table)
  index = code (mod n)
  while getKey(table, index) is not undefined:
    index += 1 (mod n)
  set(table, index, key, value)
lookup(table, key):
  code = hash(key)
  n = capacity(table)
  index = code (mod n)
  k = getKey(table, index)
  while k is not null or undefined
        and k != key: 
    index += 1 (mod n)
    k = getKey(table, index)
  if k == key:
    return getValue(table, index)
  else:
    return undefined
```

由于符号字符串是独有的，这里的哈希值至多计算一次，计算该值和对比键值通常都很快。然而这一算法仍然不够简单，导致每次访问对象的属性都会慢下来，因此 V8 引擎会尽可能地避免对象的这种表达方式。

### Fast, in-object properties

TODO
