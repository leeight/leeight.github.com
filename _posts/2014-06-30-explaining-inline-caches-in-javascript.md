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

TODO