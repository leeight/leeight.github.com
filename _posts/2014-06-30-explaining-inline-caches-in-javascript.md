---
layout: post
title: Explaining JavaScript VMs in JavaScript - Inline Caches
author: leeight
---



原文地址：<http://mrale.ph/blog/2012/06/03/explaining-js-vms-in-js-inline-caches.html>

I have a thing for virtual machines that are implemented in the language (or a subset of the language) they are built to execute. 如果我在学术圈或者有更多的空余时间，我肯定会用 JavaScript 写一个 JavaScript 虚拟机。事实上并不是我一个人想这么做，来自蒙特利尔大学的 kinda 已经开发了一个类似的[东东](https://github.com/Tachyon-Team)，但是我想搞一个自己的，来验证我自己的一些想法。

除此之外，我还有一个梦想就是帮助那些 JavaScript 工程师来更好的理解 JS 引擎是如何工作的。我认为搞清楚这些东西是怎么工作的对于我们的日常工作至关重要。只有大家了解了 JS 引擎的工作原理，才会不再把 JS 引擎当做一个神秘的黑盒子来看待。

事实上我也不是第一个这么做的人，业界还存在很多优秀的工程师在做类似的事情。不过从他们的介绍中我发现了我们经常以错误的形式传达我们所掌握的知识，以至于并不容易很好的把知识传递下去让工程师们理解和掌握。例如：

有时候我会把自己对 V8 引擎的相关知识总结为一些类似：『这么做，不要那么做』的建议。很明显，这些建议并没有解释任何问题。有时候大家可能谨小慎微的遵循着这些建议，更多的时候这些建议很快就被抛之脑后，没人再提起这件事情了。

有时候我们解释 V8 工作原理的时候采用的错误的抽象方式，我很赞赏一页全是汇编代码的 Slide，它敦促着 JavaScript 工程师们去学习一些汇编语言的相关知识，但是更多的时候这个 Slide 可能很快就被大家忘记了，因为上面介绍的内容平时在 JavaScript 工程师的工作中基本不会用到。

这些问题困扰了很久，所以我试着换一种方式，用 JavaScript 语言来解释 JavaScript 虚拟机的工作原理，效果可能会好一些。在 [WebRebels 2012](http://webrebels.org/) 上面我曾经介绍过『[V8 Inside Out](http://s3.mrale.ph/webrebels2012.pdf)』相关的内容，就是采用了这种方式，所以在下面的章节中我想重温一下相关的内容。

### Implementing dynamic language in JavaScript

想象一下，如果你需要用 JavaScript 实现一个语法上很接近 JavaScript 的语言，但是采用更简单的对象模型（没有 JSObject，相反采用哈希表来表示对象）。简单起见，我们用 Lua 举个例子（语法上跟 JavaScript 很像，但是完全不同的另外一种语言）：


```lua
function MakePoint(x, y)
  local point = {}
  point.x = x
  point.y = y
  return point
end

function MakeArrayOfPoints(N)
  local array = {}
  local m = -1
  for i = 0, N do
    m = m * -1
    array[i] = MakePoint(m * i, m * -i)
  end
  array.n = N
  return array
end

function SumArrayOfPoints(array)
  local sum = MakePoint(0, 0)
  for i = 0, array.n do
    sum.x = sum.x + array[i].x
    sum.y = sum.y + array[i].y
  end
  return sum
end

function CheckResult(sum)
  local x = sum.x
  local y = sum.y
  if x ~= 50000 or y ~= -50000 then
    error("failed: x = " .. x .. ", y = " .. y)
  end
end

local N = 100000
local array = MakeArrayOfPoints(N)
local start_ms = os.clock() * 1000;
for i = 0, 5 do
  local sum = SumArrayOfPoints(array)
  CheckResult(sum)
end
local end_ms = os.clock() * 1000;
print(end_ms - start_ms)
```

从上面的代码中可以发现我习惯写代码检查一下最终的计算结果，从而避免当我发布了一个数据看起来很好的 jsperf 测试用例，到头来却是我代码的问题这种尴尬情况。

如果你把上面的代码保存下来，执行一下就得到了类似下面的输出：

```
$ lua points.lua
150.2
```

很好，代码能正常运行了，但是对我们理解 JavaScript 虚拟机是如果运作的毫无帮助。但是想象一下，如果我们用 JavaScript 实现了一个『类Lua』的虚拟机。之所以叫做『类Lua』是因为我们不会考虑去只是所以的 Lua 语法，更多的关注点是以哈希表作为对象模型上面。我们把上面的 Lua 代码翻译为 JavaScript 就得到了如下的样子：

```javascript
function MakePoint(x, y) {
  var point = new Table();
  STORE(point, 'x', x);
  STORE(point, 'y', y);
  return point;
}

function MakeArrayOfPoints(N) {
  var array = new Table();
  var m = -1;
  for (var i = 0; i <= N; i++) {
    m = m * -1;
    STORE(array, i, MakePoint(m * i, m * -i));
  }
  STORE(array, 'n', N);
  return array;
}

function SumArrayOfPoints(array) {
  var sum = MakePoint(0, 0);
  for (var i = 0; i <= LOAD(array, 'n'); i++) {
    STORE(sum, 'x', LOAD(sum, 'x') + LOAD(LOAD(array, i), 'x'));
    STORE(sum, 'y', LOAD(sum, 'y') + LOAD(LOAD(array, i), 'y'));
  }
  return sum;
}

function CheckResult(sum) {
  var x = LOAD(sum, 'x');
  var y = LOAD(sum, 'y');
  if (x !== 50000 || y !== -50000) {
    throw new Error("failed: x = " + x + ", y = " + y);
  }
}

var N = 100000;
var array = MakeArrayOfPoints(N);
var start = LOAD(os, 'clock')() * 1000;
for (var i = 0; i <= 5; i++) {
  var sum = SumArrayOfPoints(array);
  CheckResult(sum);
}
var end = LOAD(os, 'clock')() * 1000;
print(end - start);
```

不过上述的代码还无法直接执行，很多函数都还未定义，例如 STORE, LOAD 等等。

```
$ d8 points.js
points.js:9: ReferenceError: Table is not defined
  var array = new Table();
                  ^
ReferenceError: Table is not defined
    at MakeArrayOfPoints (points.js:9:19)
    at points.js:37:13
```

原因很明显，我们还缺少相关运行时的代码支持我们所需要的对象模型，以及数据的装载和存储。在这里我想再次强调的是虽然 VM 从外面看起来是一个黑匣子，但是内部的结构跟一个乐队很像，各个模块相互协作来达到最好的性能指标。各个模块包括编译器，运行期代码，对象模型，垃圾回收器等等。幸运的是我们要设计的语言很简单，运行时代码只需要很少的几行就可以搞定了。

```javascript
function Table() {
  // Map from ES Harmony is a simple dictionary-style collection.
  this.map = new Map;
}

Table.prototype = {
  load: function (key) { return this.map.get(key); },
  store: function (key, value) { this.map.set(key, value); }
};

function CHECK_TABLE(t) {
  if (!(t instanceof Table)) {
    throw new Error("table expected");
  }
}

function LOAD(t, k) {
  CHECK_TABLE(t);
  return t.load(k);
}

function STORE(t, k, v) {
  CHECK_TABLE(t);
  t.store(k, v);
}

var os = new Table();

STORE(os, 'clock', function () {
  return Date.now() / 1000;
});
```

我用 [Harmony Map](http://wiki.ecmascript.org/doku.php?id=harmony:simple_maps_and_sets) 没有使用原生的 Object 是因为哈希表中的 Key 可以是任意类型，不一定是字符串类型。现在执行一下代码就可以得到正常的输出了：

```
$ d8 --harmony quasi-lua-runtime.js points.js
737
```

代码可以运行了，但是相比 Lua 虚拟机而言，性能挫了很多。初步分析下来是因为数值加载和存储的调用太多导致花费了很多时间。为了优化这个问题，我们可以采用大部分 JavaScript 虚拟机都采用的一种技术：Inline Cache。即便是用 Java 实现的 JavaScript 虚拟机（例如 Rhion）也间接的采用了这种技术，因为 invokedynamic 本质上就是在字节码层面的一种 Inline Cache 的实现。Inline Cache（V8 里面简称做 IC）并不是什么新的技术，30多年前在 Smalltalk 虚拟机的实现中已经使用了这种技术。

### Good duck always quacks the same way

Inline Cache 背后的思想其实很简单，在假设条件成立的情况下，通过创造一条『捷径』来快速的加载对象的属性。但是对于支持延迟绑定，eval这些特定的动态语言而言，很难归一化一些有意义的假设条件，取而代之的是我们采用观察和学习的模式来处理加载和存储的动作，一旦发现一个对象的结构跟之前处理过的对象结构类似，那么就可以用之前积累下的经验快速的加载这个对象的属性。ICs 实际上可以应用于多种地方，例如数值计算，函数调用，方法调用等等。Some ICs can also cache more than a single fast path that is become *polymorphic*.

如果我们开始考虑如何在上面的代码上使用 ICs 的技术，很明显我们需要修改我们的对象模型。因为每次都必须调用 get 方法，其实我们没有办法快速的从一个 Map 中加载一个对象的属性。[If we could peak into raw hashtable behind Map we could make IC work for us even without new object layout by caching bucket index.]

### Discovering hidden structure

在 C 语言中，结构体中的每个字段都其相关的固定偏移量，当使用哈希表来表示结构化的数据的时候，为了更高的性能，应该尽可能的采用类似的方式来处理。当用哈希表来表示数组的时候，其实也是类似的问题，我们希望数字类型的属性应该当做数组的索引来存储数据。但很显然，不是每个哈希表都能很好的适应这种场景：有些哈希表包含非字符串，非数字的键，或者包含了很多字符串类型的健，而且这些键是动态的，经常会增删改。不幸的是，我们不能执行任何昂贵的类型推断操作，相反我们不得不在程序执行的过程中对『表』进行修改或者创建的阶段去发掘他们背后的结构。幸运的时候，早就存在一种相关的技术可以让我们完成这部分工作☺，这个技术叫做『隐藏类』

『隐藏类』背后主要有两个简单技术点来支撑：

1. 运行期每个对象都有自己相关的一个『隐藏类』，就像 Java 虚拟机会给每个实例关联上 java.lang.Class 一样
2. 如果在运行期对象的结构变化了（属性的增删改），运行时系统就会创建一个新的或者查找一个已有的符合当前对象结构的『隐藏类』关联上去。

『隐藏类』有一个很重要的特性：它可以让虚拟机高效的检查对当前对象结构的假设是否依旧有效，检查的方式仅仅是比较缓存的『隐藏类』跟当前对象的『隐藏类』是否一致。这个机制对我们实现 Inline Cache 非常重要。现在就让我们实现一个简单的『隐藏类』来完善上面提到的『类Lua』语言的运行时系统。每个『隐藏类』本质上就是一个属性描述符的集合，每个描述符要么是一个真实的属性，要么是一个属性的 Transition 来指向真正拥有这个属性的『隐藏类』 。


```javascript
function Transition(klass) {
  this.klass = klass;
}

function Property(index) {
  this.index = index;
}

function Klass(kind) {
  // 如果 kind 是 fast，那么对象的结构类似于 C 语言中的结构体
  // 如果 kind 是 slow，那么就是以哈希表来表示对象模型
  this.kind = kind;
  this.descriptors = new Map;
  this.keys = [];
}
```

Transition 存在的意义是为了让通过同样方式创建的对象共享『隐藏类』，这样子有两个好处：

1. 降低『隐藏类』的数量
2. 当我们给多个共享『隐藏类』的对象添加同样一个属性的时候，它们依旧共享新的『隐藏类』（可能不是之前的那个了）

```javascript
Klass.prototype = {
  // 添加属性的时候创建一个新的隐藏类
  addProperty: function (key) {
    var klass = this.clone();
    klass.append(key);
    // 通过Transition来支持共享隐藏类
    this.descriptors.set(key, new Transition(klass));
    return klass;
  },

  hasProperty: function (key) {
    return this.descriptors.has(key);
  },

  getDescriptor: function (key) {
    return this.descriptors.get(key);
  },

  getIndex: function (key) {
    return this.getDescriptor(key).index;
  },

  // 复制一下当前的隐藏类（属性集合和偏移量）
  clone: function () {
    var klass = new Klass(this.kind);
    klass.keys = this.keys.slice(0);
    for (var i = 0; i < this.keys.length; i++) {
      var key = this.keys[i];
      klass.descriptors.set(key, this.descriptors.get(key));
    }
    return klass;
  },

  // Add real property to descriptors.
  append: function (key) {
    this.keys.push(key);
    this.descriptors.set(key, new Property(this.keys.length - 1));
  }
};
```

现在修改一下我们的哈希表就能适应这种新的对象构造方式。

```javascript
var ROOT_KLASS = new Klass("fast");

function Table() {
  // 所有的对象初期都有一个空的隐藏类
  this.klass = ROOT_KLASS;
  // 名字类型的属性，例如：'x', 'y', 'z' 存储在 properties 里面
  this.properties = [];
  // 数组索引类型的属性，例如：'0', '1', '2' 存储在 elements 里面
  this.elements = [];
  // We will actually cheat a little bit and allow any int32 to go here,
  // we will also allow V8 to select appropriate representation for
  // the array's backing store. There are too many details to cover in
  // a single blog post :-)
}

Table.prototype = {
  load: function (key) {
    if (this.klass.kind === "slow") {
      // Slow class => properties are represented as Map.
      return this.properties.get(key);
    }

    // This is fast table with indexed and named properties only.
    if (typeof key === "number" && (key | 0) === key) {  // Indexed property.
      return this.elements[key];
    } else if (typeof key === "string") {  // Named property.
      var idx = this.findPropertyForRead(key);
      return (idx >= 0) ? this.properties[idx] : void 0;
    }

    // There can be only string&number keys on fast table.
    return void 0;
  },

  store: function (key, value) {
    if (this.klass.kind === "slow") {
      // Slow class => properties are represented as Map.
      this.properties.set(key, value);
      return;
    }

    // This is fast table with indexed and named properties only.
    if (typeof key === "number" && (key | 0) === key) {  // Indexed property.
      this.elements[key] = value;
      return;
    } else if (typeof key === "string") {  // Named property.
      var index = this.findPropertyForWrite(key);
      if (index >= 0) {
        this.properties[index] = value;
        return;
      }
    }

    this.convertToSlow();
    this.store(key, value);
  },

  // Find property or add one if possible, returns property index
  // or -1 if we have too many properties and should switch to slow.
  findPropertyForWrite: function (key) {
    if (!this.klass.hasProperty(key)) {  // Try adding property if it does not exist.
      // To many properties! Achtung! Fast case kaput.
      if (this.klass.keys.length > 20) return -1;

      // Switch class to the one that has this property.
      this.klass = this.klass.addProperty(key);
      return this.klass.getIndex(key);
    }

    var desc = this.klass.getDescriptor(key);
    if (desc instanceof Transition) {
      // Property does not exist yet but we have a transition to the class that has it.
      this.klass = desc.klass;
      return this.klass.getIndex(key);
    }

    // Get index of existing property.
    return desc.index;
  },

  // Find property index if property exists, return -1 otherwise.
  findPropertyForRead: function (key) {
    if (!this.klass.hasProperty(key)) return -1;
    var desc = this.klass.getDescriptor(key);
    if (!(desc instanceof Property)) return -1;  // Here we are not interested in transitions.
    return desc.index;
  },

  // Copy all properties into the Map and switch to slow class.
  convertToSlow: function () {
    var map = new Map;
    for (var i = 0; i < this.klass.keys.length; i++) {
      var key = this.klass.keys[i];
      var val = this.properties[i];
      map.set(key, val);
    }

    Object.keys(this.elements).forEach(function (key) {
      var val = this.elements[key];
      map.set(key | 0, val);  // Funky JS, force key back to int32.
    }, this);

    this.properties = map;
    this.elements = null;
    this.klass = new Klass("slow");
  }
};
```

现在我们在运行期有『隐藏类』来支持我们快速的检查的对象的布局，并且通过属性的索引来快速的加载属性值。这就需要在编译器和运行期系统都添加额外的功能来支持这个特性。

### Patchwork quilts of generated code

实现『隐藏类』有多种方式，常见的一种是把实现过程分为两步：修改生成代码中的『调用点』，修改『调用点』可以调用的一批相关的 Stubs 代码。这里关键的地方是 Stub 或者 运行期系统 能够找到调用它们的『调用点』。Stub 包含的在某些场景下可以高效运行的代码，如果 Stub 遇到了一个它不支持的对象，那么 Stub 就可以修改调用点的代码，生成新的可以适应当前环境的代码来保证整体的性能。我们用 JavaScript 实现的时候采用了如下的方式：

1. 一个全局变量来模拟可以修改的调用点
2. 闭包来模拟 Stub

In the native code V8 finds IC sites to patch by inspecting return address sitting on the stack. We can't do anything like that in the pure JavaScript (arguments.caller is not fine-grained enough) so we'll just pass IC's id into IC stub explicitly. Here is how IC-ified code will look like: 

```javascript
// Initially all ICs are in uninitialized state.
// They are not hitting the cache and always missing into runtime system.
var STORE$0 = NAMED_STORE_MISS;
var STORE$1 = NAMED_STORE_MISS;
var KEYED_STORE$2 = KEYED_STORE_MISS;
var STORE$3 = NAMED_STORE_MISS;
var LOAD$4 = NAMED_LOAD_MISS;
var STORE$5 = NAMED_STORE_MISS;
var LOAD$6 = NAMED_LOAD_MISS;
var LOAD$7 = NAMED_LOAD_MISS;
var KEYED_LOAD$8 = KEYED_LOAD_MISS;
var STORE$9 = NAMED_STORE_MISS;
var LOAD$10 = NAMED_LOAD_MISS;
var LOAD$11 = NAMED_LOAD_MISS;
var KEYED_LOAD$12 = KEYED_LOAD_MISS;
var LOAD$13 = NAMED_LOAD_MISS;
var LOAD$14 = NAMED_LOAD_MISS;

function MakePoint(x, y) {
  var point = new Table();
  STORE$0(point, 'x', x, 0);  // The last number is IC's id: STORE$0 &rArr; id is 0
  STORE$1(point, 'y', y, 1);
  return point;
}

function MakeArrayOfPoints(N) {
  var array = new Table();
  var m = -1;
  for (var i = 0; i <= N; i++) {
    m = m * -1;
    // Now we are also distinguishing between expressions x[p] and x.p.
    // The fist one is called keyed load/store and the second one is called
    // named load/store.
    // The main difference is that named load/stores use a fixed known
    // constant string key and thus can be specialized for a fixed property
    // offset.
    KEYED_STORE$2(array, i, MakePoint(m * i, m * -i), 2);
  }
  STORE$3(array, 'n', N, 3);
  return array;
}

function SumArrayOfPoints(array) {
  var sum = MakePoint(0, 0);
  for (var i = 0; i <= LOAD$4(array, 'n', 4); i++) {
    STORE$5(sum, 'x', LOAD$6(sum, 'x', 6) + LOAD$7(KEYED_LOAD$8(array, i, 8), 'x', 7), 5);
    STORE$9(sum, 'y', LOAD$10(sum, 'y', 10) + LOAD$11(KEYED_LOAD$12(array, i, 12), 'y', 11), 9);
  }
  return sum;
}

function CheckResults(sum) {
  var x = LOAD$13(sum, 'x', 13);
  var y = LOAD$14(sum, 'y', 14);
  if (x !== 50000 || y !== -50000) throw new Error("failed x: " + x + ", y:" + y);
}
Changes above are again self-explanatory: every property load/store site got it's own IC with an id. One small last step left: to implement MISS stubs and stub "compiler" that would produce specialized stubs:

function NAMED_LOAD_MISS(t, k, ic) {
  var v = LOAD(t, k);
  if (t.klass.kind === "fast") {
    // Create a load stub that is specialized for a fixed class and key k and
    // loads property from a fixed offset.
    var stub = CompileNamedLoadFastProperty(t.klass, k);
    PatchIC("LOAD", ic, stub);
  }
  return v;
}

function NAMED_STORE_MISS(t, k, v, ic) {
  var klass_before = t.klass;
  STORE(t, k, v);
  var klass_after = t.klass;
  if (klass_before.kind === "fast" &&
      klass_after.kind === "fast") {
    // Create a store stub that is specialized for a fixed transition between classes
    // and a fixed key k that stores property into a fixed offset and replaces
    // object's hidden class if necessary.
    var stub = CompileNamedStoreFastProperty(klass_before, klass_after, k);
    PatchIC("STORE", ic, stub);
  }
}

function KEYED_LOAD_MISS(t, k, ic) {
  var v = LOAD(t, k);
  if (t.klass.kind === "fast" && (typeof k === 'number' && (k | 0) === k)) {
    // Create a stub for the fast load from the elements array.
    // Does not actually depend on the class but could if we had more complicated
    // storage system.
    var stub = CompileKeyedLoadFastElement();
    PatchIC("KEYED_LOAD", ic, stub);
  }
  return v;
}

function KEYED_STORE_MISS(t, k, v, ic) {
  STORE(t, k, v);
  if (t.klass.kind === "fast" && (typeof k === 'number' && (k | 0) === k)) {
    // Create a stub for the fast store into the elements array.
    // Does not actually depend on the class but could if we had more complicated
    // storage system.
    var stub = CompileKeyedStoreFastElement();
    PatchIC("KEYED_STORE", ic, stub);
  }
}

function PatchIC(kind, id, stub) {
  this[kind + "$" + id] = stub;  // non-strict JS funkiness: this is global object.
}

function CompileNamedLoadFastProperty(klass, key) {
  // Key is known to be constant (named load). Specialize index.
  var index = klass.getIndex(key);

  function KeyedLoadFastProperty(t, k, ic) {
    if (t.klass !== klass) {
      // Expected klass does not match. Can't use cached index.
      // Fall through to the runtime system.
      return NAMED_LOAD_MISS(t, k, ic);
    }
    return t.properties[index];  // Veni. Vidi. Vici.
  }

  return KeyedLoadFastProperty;
}

function CompileNamedStoreFastProperty(klass_before, klass_after, key) {
  // Key is known to be constant (named load). Specialize index.
  var index = klass_after.getIndex(key);

  if (klass_before !== klass_after) {
    // Transition happens during the store.
    // Compile stub that updates hidden class.
    return function (t, k, v, ic) {
      if (t.klass !== klass_before) {
        // Expected klass does not match. Can't use cached index.
        // Fall through to the runtime system.
        return NAMED_STORE_MISS(t, k, v, ic);
      }
      t.properties[index] = v;  // Fast store.
      t.klass = klass_after;  // T-t-t-transition!
    }
  } else {
    // Write to an existing property. No transition.
    return function (t, k, v, ic) {
      if (t.klass !== klass_before) {
        // Expected klass does not match. Can't use cached index.
        // Fall through to the runtime system.
        return NAMED_STORE_MISS(t, k, v, ic);
      }
      t.properties[index] = v;  // Fast store.
    }
  }
}


function CompileKeyedLoadFastElement() {
  function KeyedLoadFastElement(t, k, ic) {
    if (t.klass.kind !== "fast" || !(typeof k === 'number' && (k | 0) === k)) {
      // If table is slow or key is not a number we can't use fast-path.
      // Fall through to the runtime system, it can handle everything.
      return KEYED_LOAD_MISS(t, k, ic);
    }
    return t.elements[k];
  }

  return KeyedLoadFastElement;
}

function CompileKeyedStoreFastElement() {
  function KeyedStoreFastElement(t, k, v, ic) {
    if (t.klass.kind !== "fast" || !(typeof k === 'number' && (k | 0) === k)) {
      // If table is slow or key is not a number we can't use fast-path.
      // Fall through to the runtime system, it can handle everything.
      return KEYED_STORE_MISS(t, k, v, ic);
    }
    t.elements[k] = v;
  }

  return KeyedStoreFastElement;
}
```

It's a lot of code (and comments) but it should be simple to understand given all explanations above: ICs observe and stub compiler/factory produces adapted-specialized stubs [attentive reader can even notice that I could have initialized all keyed store ICs with fast loads from the very start or that it gets stuck in fast state once it enters it].

If we throw all the code we got together and rerun our "benchmark" we'll get very pleasing results:

```
$ d8 --harmony quasi-lua-runtime-ic.js points-ic.js
117
```

This is a factor of 6 speedup compared to our first naïve attempt! 

### There is never a conclusion to JavaScript VMs optimizations

Hopefully you are reading this part because you have read everything above... I tried to look from a different perspective, that of a JavaScript developer, onto some ideas powering JavaScript engines these days. The more code I was writing the more it felt like a story about blind men and an elephant. Just to give you a feeling of looking into the abyss: V8 has 10 descriptors kinds, 5 elements kinds (+ 9 external elements kinds), ic.cc that contains most of IC state selection logic is more that 2500 LOC and ICs in V8 have more than 2 states (there are uninitialized, premonomorphic, monomorphic, polymorphic, generic states not mentioning special states for keyed load/stores ICs or completely different hierarchy of states for arithmetic ICs), ia32-specific hand written IC stubs take more than 5000 LOC, etc. These numbers only grow as time passes and V8 learns to distinguish&adapt to more and more object layouts. And I am not even touching object model itself (objects.cc 13kLOC), or garbage collector, or optimizing compiler.

Nevertheless I am sure that fundamentals will not change in the foreseeable future and when they do it will be a breakthrough with a loud bang! sound, so you'll notice. Thus I think that this exercise of trying to understand fundamentals by (re)writing them in JavaScript is very-very-very important.

I hope tomorrow or maybe the week after you will stop and shout Eureka! and tell your coworkers why conditionally adding properties to an object in one place of the code can affect performance of some other distant hot loop touching these objects. Because hidden classes, you know, they change!






















