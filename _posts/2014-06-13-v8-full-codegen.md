---
layout: post
title: V8 Full Codegen
author: leeight
---


在过去的几年中，得益于 JIT编译器的引入，JavaScript 的执行性能飞速提升，大大改善了 Web应用的用户体验，从而使得 JavaScript 作为下一波Web技术的主要推动力越来越引人注目。V8 作为第一个可以生成并执行本地代码的 JavaScript引擎，已经得到了广泛的应用，例如： Google Chrome 浏览器，Android 浏览器，WebOS，Node.js 等。

几年前，当我（原作者）加入到我所在公司的一个专门优化 ARM 体系结构下 V8 引擎性能的小组之后，见证了 SunSpider 的性能翻翻，V8 的性能提升了 50%，这些都得益于软硬件的改善和优化。

V8 引擎这个项目本身很有意思，但是不幸的是，网上相关的资料非常少，所以后续几章中我会从比较宏观的角度介绍一下我所理解的 V8，希望对这方面有兴趣的读者有所帮助。

### Overview

V8 引擎在执行 JavaScript 之前先把它编译成本地代码，没有中间状态，也没有字节码。编译的时候是以函数为单位的（相对于 TraceMonkey 中采用的技术是基于热点执行路径为单位的）。编译的过程是延迟进行的，一般是在函数第一次被调用的时候，所以我们完全可以引入一个巨大的第三方库也不用担心会浪费太多的编译时间。

### High level architecture

V8 有两个编译器，Full-CodeGen 和 Crankshaft。我们这里主要介绍的是 Full-CodeGen（下文叫做 FC），它是一个没有什么优化能力的编译器，主要的目的是尽可能快的生成机器码，从而避免影响到页面的加载和展现速度。Crankshaft 则是一个有很多优化能力的编译器，我们会再后续的章节对它进行详细的介绍。

V8 首先用 FC 把所有的代码都编译一次，生成机器码之后，再用一个内置的 Profiler 筛选出『热点』函数交给 Crankshaft 来进行优化。因为 V8 是单线程的（至少在写本文的时候 3.14 版本是这样子的），所以 Crankshaft 的优化工作会导致代码执行的暂停。因此 FC 和 Crankshaft 都被设计为能够快速的生成机器码而不是花费大量的时间去生成很高效的机器码，从而尽可能减少代码执行暂停带来的影响。在 V8 未来的版本，已经开始考虑将 Crankshaft 的工作放到一个独立的线程中去完成，从而可以跟代码的执行并行起来，既不会影响到代码的执行，又可以多花点儿时间生成更加高效的机器码。

### Why note bytecode？

这个问题在 Dart 出来之后也有很多人问过，他们专门写过一篇文章解释这个事情：https://www.dartlang.org/articles/why-not-bytecode/。V8 引擎出来之后也有人问，大部分虚拟机都有自己的字节码和解释器，为什么 V8 引擎没有呢？从我理解的角度来看，可能是这样子的：直接生成机器码并没有比生成机器码复杂多少，成本是可控的。


生成字节码的过程如下：

1. 语法分析，建立抽象语法树 AST
2. 作用域分析
3. 把 AST 转化为字节码

生成机器码的过程如下：

1. 语法分析，建立抽象语法树 AST
2. 作用域分析
3. 把 AST 转化为机器码

在这两种情况下，我们都需要解析源代码生成抽象语法树（AST），然后都需要进行作用域的分析，确定一个符号到底是局部变量，闭包里面的变量，还是全局变量。只有最后一步生成字节码或者生成机器码的步骤是不一样的，当然这一步的时候我们可以做很多额外的事情，但是如果想要尽可能快的生成机器码，那么翻译的时候越直接越好，每个 AST 的节点翻译成固定的字节码或者机器码。

现在考虑一下，如果你要实现一个字节码的解释器应该如何去做？常见的一种方式就是在一个巨大的循环里面，取下一个字节码，通过 switch 语句判断一下字节码的类型，然后执行相关的指令。有很多方式来优化这种执行模式，但是最终归根结底都是一样的。

既然生成字节码之后还需要一个解释器来执行，为什么不一步到位，直接生成机器码呢？这就是 V8 引擎里面 FC 所做的事情，直接生成机器码，不在需要解释器去执行字节码了。
一般来说，如果想要在运行之前提前做一些事情，字节码是有优势的，但是这种应用的场景并不适合浏览器中运行的 Web 应用，所以 V8 引擎采用 FC 来生成机器码是更合适的。

### Inline caches: accelerating unoptimized code

记得有人介绍过，如果想要优化 JavaScript 引擎的执行性能，只需要做 6 件事就可以达到目的了：Inline Cache, Inline Cache, Inline Cache, Inline Cache, Inline Cache, Speculative Optimization。

如果你看过 ECMAScript 的规范就了解了大部分操作都是相当复杂的（动态类型语言的特性），以加法为例：

1. 如果操作符都是数字，那么就执行加法运算
2. 如果一个操作符是字符串，那么就都转化为字符串类型，然后进行字符串连接
3. 如果既不是字符串也不是数字，那么就先转化为字符串或者数字类型，然后再进行加法运算或者字符串连接操作

正因为这些复杂性的存在，紧紧从代码中我们无法真正运行的时候会执行什么指令。再举一个例子：属性访问操作 o.x 。当你在代码中看到 o.x 的时候，你根本无法确定 x 的值是从 o 本身获取的，还是从 o 的原型链中获取的，还是从一个 getter 方法中返回的。这个属性 x 甚至可能并不存在。因此如果想要在 FC 生成机器码的时候处理这种情况，这么一个简单的操作就可能需要几百个指令，显然是不太合适的。

为了解决这个问题，我们采用了 Inline Caches（下文称作 ICs）的技术。IC 简单来说就是一个拥有多种实现的函数（相关的代码也是快速的动态生成的），可以在需要的时候被调用来完成特定的功能。FC 编译器在生成机器码的时候大量的使用了 ICs 的技术，数据的加载，存储，函数调用，二元操作符，一元操作符，比较操作符，还有 ToBoolean 这个操作等等。

IC 的实现在 V8 引擎的代码中叫做 Stub。Stub 从很多方面看都像一个函数，你可以在需要的时候调用它，它也会返回你所需要的结果。但是还是跟函数有一些区别的，例如调用它之前不需要准备栈帧，也不需要完全遵守调用的规则。Stub 的代码都是即时生成的，但是也是会被缓存下来，以便可以在不同的 IC 之间进行复用。实现 IC 的 Stub 代码通常是已经被优化过的机器码，用来处理 IC 过去曾经遇到过的特定场景（这也是为什么 IC 叫做 Cache 的缘故）。 如果 Stub 中没有包含一个新的场景处理逻辑，那么它就好调用 C++ 代码的执行逻辑。C++ 代码的执行逻辑会处理这种新的场景，然后生成一个新的 Stub 以便下次可以处理这种场景，当然这个新的 Stub 也可以处理之前 Stub 所能处理的那些场景。调用旧 Stub 的地方都会被修改掉去调用这个新的 Stub，然后代码的执行就恢复正常的流程就好像 Stub 被正常执行了一样。

让我们以访问属性的代码来举个例子：

```javascript
function f(o) {
  return o.x;
}
```

当 FC 第一次为这个函数生成机器码的时候，它会用一个 IC 来实现 load 操作。IC 最初是未初始化的状态，无法处理任何场景。下面是 FC 生成的机器码调用 IC 的例子：

```asm
;; full compiled call site
ldr   r0, [fp, #+8]     ; load parameter "o" from stack
ldr   r2, [pc, #+84]    ; load string "x" from constant pool
ldr   ip, [pc, #+84]    ; load uninitialized stub from constant pool
blx   ip                ; call the stub
...
dd    0xabcdef01        ; address of stub loaded above
; this gets replaced when the stub misses
```

如果你不熟悉汇编指令的话，希望上述代码的注释能帮助你理解执行的逻辑。下面是未初始化状态下 Stub 的代码：

```asm
;; uninitialized stub
ldr   ip,  [pc, #8]   ; load address of C++ runtime "miss" function
bx    ip              ; tail call it
...
```

当第一次调用 Stub 的时候，因为它无法处理任何场景，所以就会去调用 C++ 的执行逻辑，然后生成可以处理该场景的机器码。在 V8 引擎中，对象存储一个属性最常见的方式是把这个属性存储到一个特定的位置，让我们看一个这样的例子。每个对象都有一个到 Map 的指针，这个 Map 存储了一个该对象内部的结构。这个 Stub 在执行的时候首先检查对象的 Map 跟已知的 Map 是否相匹配，如果匹配的话就可以直接得到属性的偏移量，从而可以避免昂贵的哈希查找操作。

```asm
;; monomorphic in-object load stub
tst   r0,   #1          ; test if receiver is an object
beq   miss              ; miss if not
ldr   r1,   [r0, #-1]   ; load object's map
ldr   ip,   [pc, #+24]  ; load expected map
cmp   r1,   ip          ; are they the same?
bne   miss              ; miss if not
ldr   r0,   [r0, #+11]  ; load the property
bx    lr                ; return
miss:
ldr   ip,   [pc, #+8]   ; load code to call the C++ runtime
bx    ip                ; tail call it
...
```

只要这个 Stub 要做的是属性加载的操作，那么就可以借助这个 Stub 快速的完成，不再需要额外生成其它的机器码了。因为这个 Stub 只能处理一种场景，所以它是单态的（monomorphic），如果它遇到了一个新的场景无法处理，那么一个多态（megamorphic）的 Stub 就会生成，从而可以更好的适应未来可能遇到的场景。

