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

2008年的时候，Lars Bak（V8 引擎的缔造者）在一个[采访](http://www.youtube.com/watch?v=hWhMKalEicY)中提到了一种快速描述对象结构的方法。以下面的构造函数为例：

```javascript
function Point(x, y) {
  this.x = x;
  this.y = y;
}
```

像上面的构造函数在 JavaScript 代码中是很常见的。使用上述构造函数创建的对象具备相同的属性集合，而且这些属性的顺序也都是一样的。所以我们可以说这些对象在逻辑上的结构是一样的，因此我们就可以想办法把这个结构表达出来。

V8 引擎通过使用 Map 来描述这个结构。各位可以把 Map 想象为一个描述符表，表里面的每一项都是对一个属性的描述。当然在这个 Map 里面还包含其它的一些信息，例如对象的大小，构造函数的指针，对象的原型等等，不过我们更关心的还是属性的描述符。具备相同结构的对象共享这个 Map。以上面提到的 Point 构造函数为例，通过这个构造函数创建出来的对象，可能共享一个这样的 Map：

```
Map M2
  object size: 20
  "x": FIELD at offset 12
  "y": FIELD at offset 16
```

你可能想到了通过 Point 构造函数创建出来的对象并不一定都有相同的属性集合，因为属性可以动态的添加和删除。为了解决这个问题，先介绍一下一个对象是如何创建的。对象的创建过程可以用如下的伪代码来描述：

```javascript
var O = {};
Point.call( O );
```

在第一行，我们给 O 分配了一块儿内存（在构造函数 Point 执行之前），此时 O 没有任何属性，因此 Map 也没有描述任何结构。另外，当构造函数执行完毕之后，我们还可以给 O 随时添加新的属性。


V8 引擎在处理这种情况的时候采用了一个叫做 Transition 的概念。当给一个对象添加新属性的时候，如果可以不创建新的 Map，那么就不创建，也就是说尽量复用已有的 Map。Transition 描述符就是用来指向那些 Map 的指针。例如：

```
<Point object is allocated>

  Map M0
    "x": TRANSITION to M1 at offset 12

this.x = x;

  Map M1
    "x": FIELD at offset 12
    "y": TRANSITION to M2 at offset 16

this.y = y;

  Map M2
    "x": FIELD at offset 12
    "y": FIELD at offset 16
```

在上面的例子中，一个新的 Point 实例，首先关联到 M0（没有任何字段）。当第一次赋值之后，这个对象的 Map 指针就指向 M1 了，此时属性 x 的偏移量是 12；第二次赋值之后，这个对象的 Map 指针就指向 M2 了，此时属性 y 的偏移量是 16.

此时如果给对象添加一个新的属性 z，会发生什么情况呢？

```
 Map M2
   "x": FIELD at offset 12
   "y": FIELD at offset 16
   "z": TRANSITION at offset 20

this.z = z;

  Map M3
    "x": FIELD at offset 12
    "y": FIELD at offset 16
    "z": FIELD at offset 20
```

如果之前从来没有发生过，那么我们会先从 M2 复制出 M3，然后更新把新的属性 z 的偏移量记录到 M3 中，同时在 M2 里面添加一个 Transition 字段也指向 M3。需要注意的是：给 Map 添加 Transition 字段是为数不多的对 Map 进行修改的操作，大部分情况下，Map 都是不可修改的。

在构造函数中，如果给属性赋值的操作并不总是保证同样顺序的话，会发生身情况呢？

```javascript
function Point(x, y, reverse) {
  if (reverse) {
    this.x = x;
    this.y = y;
  } else {
    this.y = x;
    this.x = y;
  }
}
```

在上面这个例子中，我们最终得到是一个 Transition 树而不是链表。最初创建的 M0 有两个 Transition 属性，具体选择那个取决于 x 和 y 哪个属性先被赋值。因为这种差异性的存在，导致并不是所有通过 Point 构造函数创建的对象都有同样的结构来描述属性的信息。

如果经常出现这样子的代码，事情就变得有些不可控了。V8 引擎虽然可以容忍一些类似这种情况的细微差异，但是如果你写出了在构造函数中给属性按照随机顺序进行赋值的代码，或者删除一些属性，V8 引擎就会退化到用哈希表来描述对象的结构了，从而避免大量创建无用的 Map 的情况出现，但是对属性的访问速度就会大打折扣了。

### In-object slack tracking

你可能好奇 V8 引擎是如何知道应该为一个对象分配多少内存呢？很明显，我们不希望每次给对象添加属性的时候都重新分配内存，最好直接在预留好的内存上进行操作。同时也不想为一个小对象预留太多的内存。为了处理这个问题，V8 引擎采用了一种叫做 *in-object slack tracking* 的技术来确定为构造函数的新实例分配多少内存。

一开始，构造函数创建的对象分配了足够存储 32 个快速属性的内存。一旦通过这个构造函数实例化了多次之后（最后一次看的时候是8次），V8 引擎通过 Transition 指针遍历该构造函数对应的 Map 来选取最大的实例（属性的个数）。后续通过这个构造函数实例化的对象直接使用遍历得来的最大内存值。而最初实例化出来的对象也采用一种很精明的方式来缩减内存的占用。

当对象初始化的时候，对象所分配的内存将以接近垃圾回收器可回收内存的形式出现。由于对象的 Map 标明了它占用内存的大小，垃圾回收器并不会回收这些内存。直到 *slack tracking* 阶段结束了之后，Map 中的内存大小被重新修正，相应对象的内存占用也就小了。此时垃圾回收器会回收掉这些已经是可回收的内存，而原先的对象也无需重新挪动。[?]

现在我估计你的一个疑问是，如果在 *slack tracking* 结束之后又给对象新增了一个属性，会发生什么事情呢？V8 引擎通过分配一个额外的数组来容纳这些属性就可以解决这个问题了。如果继续往对象上新增属性，那么这些数组的大小可以重新调整以便可以容纳更多的属性。

回忆一下前面的那张图吧。

### Methods and prototypes

JavaScript 本身没有类的概念，这就意味着方法的调用跟 C++/ Java 有很大的区别。方法在 JavaScript 中就是对象的一个普通属性而已，在下面的例子中，distance 就是 Point 对象的一个属性，它指向 PointDistance 这个函数。任何 JavaScript 函数都可以单做一个方法来调用，而且可以用过 this 来访问它持有者的属性[?]

> 持有者还是调用者？

```javascript
function Point(x, y) {
  this.x = x;
  this.y = y;
  this.distance = PointDistance;
}

function PointDistance(p) {
  var dx = this.x - p.x;
  var dy = this.y - p.y;
  return Math.sqrt(dx*dx + dy*dy);
}
```

如果 distance 被当做一个普通的对象属性，那么通过构造函数实例化的对象都会持有一份儿同样的引用，很明显会浪费比较多的内存，因此通过 Point 构造函数实例化的对象都有一个额外的属性来指向一批同样的内容。如果对象有很多方法的话，可能会花费比较多的代价[?]，但是我们能很好的解决这个问题。

C++ 通过 v-table 来解决这个问题。V-tables 是一个指向虚方法的指针数组。每个含有虚方法的对象都有一个指向跟类相关的 v-table 的指针。当调用对象的虚方法的时候，程序首先从 v-table 里面找到这个虚方法的地址，然后跳转过去去执行。在 V8 引擎里面我们也采用了类似的方式，但是我没有用 v-table，而是把所需的内容存储到了前面经常提到的 Map 里面。

为了让 Map 的行为看起来更像 v-table，我们给 Map 添加了一种新的描述符：常量函数（下面以 CF 替代）。CF 类型的描述符标识该对象有一个已知名称的属性，该属性不存放在对像中，而是直接尾随描述符。

```
<Point object is allocated>

  Map M0
    "x": TRANSITION to M1 at offset 12

this.x = x;

  Map M1
    "x": FIELD at offset 12
    "y": TRANSITION to M2 at offset 16

this.y = y;

  Map M2
    "x": FIELD at offset 12
    "y": FIELD at offset 16
    "distance": TRANSITION to M3 <PointDistance>

this.distance = PointDistance;

  Map M3
    "x": FIELD at offset 12
    "y": FIELD at offset 16
    "distance": CONSTANT_FUNCTION <PointDistance>
```

注意，转换到另一个 Map 只会在描述符的函数与实际函数一致时才会发生。因此如果程序员对 PointDistance 重新赋值为另一个值，则该 Transition 不再有效，Map 也会重新创建。同时注意，我们并不像 v-table 那样仅仅是跳转到虚函数，而是会生成一个包含函数地址的优化代码，以便在下次执行时，一旦发现对象使用的 Map 是这个 Map 并要调用该函数，则直接跳转过去。

JavaScript 提供了另外一种方法来支持公共属性。每个构造函数有一个相关联的原型对象。通过构造函数实例化的对象看起来拥有这个原型对象的所有属性，因此上面的例子可以修改成如下的样子：

```javascript
function Point(x, y) {
  this.x = x;
  this.y = y;
}

Point.prototype.distance = function(p) {
  var dx = this.x - p.x;
  var dy = this.y - p.y;
  return Math.sqrt(dx*dx + dy*dy);
}

...
var u = new Point(1, 2);
var v = new Point(3, 4);
var d = u.distance(v);
```

这种写法在 JavaScript 是很常见的，同时也是实现继承的一种范式，因为原型还可以有自己的原型。instanceof 操作符所针对的就是原型链。

和普通对象一样，V8 引擎也会将原型的成员函数以 CF 描述符来表示。调用原型的函数会比直接调用对象自己的函数略慢，因为编译器不仅需要检查目标对象的 Map ，同时也要检查原型链上的其他 Map 。但这不会产生大的性能问题，对于开发者来说也不应影响代码书写。


### Numbered properties: fast elements

至此我们讨论过了对象的属性和方法，并且我们假设通过构造函数实例化的对象在部分情况都有相似的结构。但是前面讨论的内容对于数字属性（以下标的形式来访问的数组元素）是不适用的。同时任何对象都有可能以数组的方式来使用，所以我们需要对这种使用方式区别对待。另外，根据标准，所有的属性名都是字符串，非字符串类型的值被用做键之前会先转化为字符串。

我们将属性名为非负整数（0、1、2……）的属性称为 Element。在 V8 引擎实现的时候，Element 存储的时候是跟有名属性区分开的。每个对象有一个指向自身 Element 数组的指针，对象 Map 中的 Element Field 将反映出 Element 是如何存储的。注意， Map 中并不包含 Element 的描述符，但可能包含其它有着不同 Element 类型的同一种 Map 的 Transition 描述符（译注：换言之，一个 Map 只对应一种 Element 数组，如果 Element 数组的类型不同，会形成一个 Transition）。大多数情况下，对象都会有 Fast Element，也就是说这些 Element 以连续数组的形式存放。有三种不同的 Fast Element：

* fast small integers
* fast doubles
* fast values

根据规范，JavaScript 中的所有数字类型都是64位双精度浮点数。但是时机应用中大部分都是在使用整数，所以 V8 引擎如果可能的话会用31位有符号数表示整数（最低为是0，有助于让垃圾回收器区分是整数还是指针）。因此含有 Fast small integers 类型的对象，其 Element 类型只会包含这样的数字。如果需要存储小数、大整数或其他特殊值，如 -0，则需要将数组提升为 Fast doubles。于是这引入了潜在的昂贵的复制-转换操作，但通常不会频繁发生。Fast doubles仍然是很快的，因为所有的数字在存储的时候不需要再进行封装了。但如果我们要存储的是其他类型，比如字符串或者对象，则必须将其提升为普通的 Fast Element 数组。

JavaScript 不提供任何确定存储元素多少的办法。你可能会说像这样的办法，new Array(100)，但实际上这仅仅针对 Array 构造函数有用。如果你将值存在一个不存在的下标上，V8 引擎会重新开辟更大的内存，将原有元素复制到新内存。V8 引擎可以处理带空洞的数组，也就是只有某些下标是存有元素，而期间的下标都是空的。其内部会安插特殊的哨兵值，因此试图访问未赋值的下标，会得到 undefined。

当然，Fast Element 也有其限制。如果你在远远超过当前数组大小的下标赋值，V8 引擎会将数组转换为字典模式，将值以哈希表的形式存储。这对于稀疏数组来说很有用，但性能上肯定打了折扣，无论是从转换这一过程来说，还是从之后的访问来说。如果你需要复制整个数组，不要逆向复制（索引从高到低），因为这几乎必然触发字典模式。

```javascript
// This will be slow for large arrays.
function copy(a) {
  var b = new Array();
  for (var i = a.length - 1; i >= 0; i--)
    b[i] = a[i];
  return b;
}
```

由于普通的属性和数字式属性分开存放，即使数组退化为字典模式，也不会影响到其他属性的访问速度（反之亦然）。


### Conclusion

这篇文章中我们观察了V8内部是如何表示对象及其属性的。V8为通用接口提供了针对具体场景可切换的数据存储模型，这作为VM语言的一项优势，对于编译型语言来说是难以企及的：那些语言要么只能小范围优化，要么则依赖于程序员对对象结构的控制。