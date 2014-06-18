---
layout: post
title: Allocating Numbers
author: leeight
---



前面我们介绍了如何实现一个简单的 JIT编译器来支持 JavaScript的功能子集（其实就是一个『计算器』），但是它只支持整数的操作，但是真实情况下我们所用的『计算器』功能不会这么弱，所以我们打算继续增强它的功能，加上对浮点数的支持。为了让这个过程更有趣，我们打算在堆上分配内存，然后存储这些数值。不过需要注意的是，这里在堆上分配的内存没有垃圾回收（GC）的机制。

### Stubs

既然已经确立了目标，我们就开始着手建立一些机制来达到我们的目的。本质上我们所需要的就是一个内存分配器，它可以分配并返回已经分配好的内存地址。

我们可以给每个抽象语法树的节点都生成一遍分配内存的指令，功能会很正常，效率也很高。但是有个缺点，最终生成的机器码体积会很大，以至于 CPU 的Cache 可能存放不下，从而会带来隐含的性能问题。

一般来说，为每个抽象语法树的节点生成内存分配的指令是不太推荐的，一个更好的方式是我们只生成一个类似于函数的代码片段，通过参数的调整来修改它的行为，我们把这个代码片段叫做 Stub。这些 Stub 可以通过 Lazy Compiled 的方式进行优化，如果没有地方使用这些 Stub，那么最终的机器码中就不需要包含这些 Stub 的代码。Lazy Compiled的方式可以节省编译的时间，也能减少最终机器码的体积，对 CPU Cache 友好，当然间接的也就提升了执行的效率。

幸运的是，jit.js 可以很方便的让我们定义一个 Stub。例如：

```javascript
var stubs = jit.stubs();
      
stubs.define('Allocate', function() {
  // 代码逻辑
  // ....
      
  // 返回
  this.Return();
});
```

是不是很简单？使用的时候也很简单，只需要在调用的地方传递它的名字即可。例如：

```javascript
jit.compile(function() {
  // 生成机器码~~~
      
  // Explanation:
  // 把 Allocate 这个 Stub 的地址放到 rax 寄存器，然后执行
  this.stub('rax', 'Allocate');
      
  this.Return();
}, { stubs: stubs });
```

正如上面提到的，只有被使用到的 Stub 才会生成机器码，并且生成之后可以在不同的地方多次重复使用。

### Heap

了解了上面介绍的 Stub 相关知识，我们可以继续内存分批之旅了。启程之前，让我们先回忆一下 Heap 的组织结构。

Heap 是 JavaScript 虚拟机用来创建并存出对象的地方（通常这些对象太大无法放到寄存器中）。有些 Heap 上面的对象包含其它对象的引用。所有存活的对于对象和它们之间的引用关系构成了一个有向图，这个图是从一个叫做 roots 的地方开始的。（roots 通常是全局变量或者指向 Stack 的指针）

虽然垃圾回收机制（GC）在支持 JIT 的虚拟中很常见，但是对于 Heap 来说其实不是必须的。实际上很多虚拟机或者编程语言采用非托管内存来代替垃圾回收机制（例如：C / C++）。在这种情况下，你就需要显式的释放不需要的内容以避免把内存用光。

因为很明显的原因，我们的『计算器』需要支持托管内存和垃圾回收机制（GC）。可能会有成百上千本书告诉你应该如何在 Heap 上分配内存，如果进行垃圾回收，不过我推荐的是这《The Garbage Collection Handbook》这本书。通常情况下，你需要在分配速度和内存碎片之间进行平衡，但是因为这部分内容不是我们关注的重点，所以我们采用一种叫做 Bump allocation 的简化方式来达到我们的目的。

### Bump Allocation


固定页的 Bump allocation 是这样工作的：

1. 分配一个固定大小的内存块（一个内存页的大小）
2. 放弃它随之而来的切片作为分配器的返回值。
3. 当内存不足的时候，执行垃圾回收机制，来释放没有使用的内存。采用的方式就是通过压缩活动对象的体积，以及移动它们到新的内存块（当然引用也会替换成新的值）。

借助 jit.js 的 Stub API，我们创建的分配器可能长的这样子：

```javascript
// 创建固定大小的内存块 1k
var page = new Buffer(1024);
       
// 初始化内存块的开始地址和结束地址
var offset = jit.ptr(page);
var end = jit.ptr(page, page.length);
       
stubs.define('Alloc', function() {
       
  // 保存 rbx 和 rcx 的寄存器内容
  this.spill(['rbx', 'rcx'], function() {
    // 把 `offset` 加载到寄存器
    // 先把 `offset` 的指针放到 rax 寄存器
    // 然后把指针的内容也就是`offset`的值放到 rax 寄存器
    this.mov('rax', this.ptr(offset));
    this.mov('rax', ['rax']);
          
    // 同样的，对 `end` 也执行上述操作，最终把 `end` 的值放到 rbx 寄存器
    this.mov('rbx', this.ptr(end));
    this.mov('rbx', ['rbx']);
       
    // 把 `offset` 的值放到 rcx 寄存器
    this.mov('rcx', 'rax');
       
    // 我们假定每次分配16个字节，也就是128个bit
    this.add('rcx', 16);
       
    // 跟 rbx 寄存器的内容比较一下，看看是否溢出了
    this.cmp('rcx', 'rbx');
       
    // this.j() 是一个条件语句，如果 rcx 的值大于 rbx 值，那么说明 
    // 溢出了，跳转到指定的位置去执行，也就是 overflow 的地方
    this.j('g', 'overflow');
       
    // Ok, we're good to go, update offset
    this.mov('rbx', this.ptr(offset));
    this.mov(['rbx'], 'rcx');
       
    // The first 64bit pointer is reserved for 'tag',
    // the second one is a `double` value
    this.mov(['rax'], 1);
       
    // Return 'rax'
    this.Return();
       
    // Overflowed :(
    this.bind('overflow')
       
    // Invoke javascript function!
    // NOTE: This is really funky stuff, but I'm not going to dive deep
    // into it right now
    this.runtime(function() {
      console.log('GC is needed, but not implemented');
    });
       
    // Crash
    this.int3();
       
    this.Return();
  });
});
```

就酱，虽然不是很直观，但是也不太复杂，稍微看一会儿就能理解相关的逻辑。

Allocate 这个 Stub 执行的时候会放弃 Page 的连续性，设置会给它们打上标签。关于标签的事情后面的章节会介绍到，主要是用来区分不同类型的指针的。关于上面的代码还是有几个地方需要解释的：

1. jit.ptr(buf, offset) 返回的类型是 Buffer，包含一个指向 Buffer 的指针。
2. this.spill() 是一个函数用来把寄存器的内容保存到内存，并且在适当的时候恢复回来（这个过程通常叫做 spilling）。它接收一个包含寄存器名字的数组和一个回调函数，当执行回调函数之前数组中的那些寄存器的值先保存到内存中，当回掉函数执行完毕之后再从内存中恢复回来。需要注意的是恢复寄存器内容的代码是在 this.Return 之前的。
3. this.mov(['rbx'], 'rcx') 把 rcx 寄存器的值存储到 rbx 指向的那个内存地址。另外必要的时候还可以添加一个偏移量，例如：this.mov(['rbx', 8], 'rcx')
4. jit.js 支持分支跳转。
    a. this.cmp(a, b)
    b. this.j(condition, labelName)
    c. this.j(labelName)
    d. this.bind(labelName)

### Floating Point

现在我们有了一个差不多能工作的内存分配器，是时候考虑应该如何把数据以什么格式存储到分配好的内存中去了。分配器每次分配16个字节的内存，其中8个字节用来打标签，8个字节用来存储数据（存储一个 double 是绰绰有余的）。

有很多汇编指令来加载，存储，处理这种类型的数值。虽然通用寄存器 rax，rbx 等等的大小可以容纳64bit的浮点数，但是如果我们要用特定的汇编指令去操作这些浮点数的时候，就需要把它们放到特定的寄存器中去：xmm0, xmm1, ..., xmm15。执行一些数值操作只能在 xmm 这些寄存器组中才能正常工作。当然我们用到的 jit.js  对此也有一定的支持，例如：

1. movq('xmm', 'gp') 或者 movq('gp', 'xmm') 就是在通用寄存器和 xmm 寄存器之间倒腾数据用的。当然把通用寄存器 gp 换成内存地址也是可以的。
2. movsd('xmm', 'xmm') 从一个 xmm 寄存器移动到另外一个 xmm 寄存器
3. addsd, mulsd, subsd, divsd 加法，乘法，减法，除法
4. cvtsi2sd('xmm', 'gp'), cvts2si('gp', 'xmm') 整数到浮点数，浮点数到整数的转化
5. roundsd('mode', 'xmm', 'xmm') 把 src 寄存器中的值按照 mode 的定义进行一些操作之后，存储到 dst 寄存器。（mode的取值范围是nearest, down, up, zero）


基于上面的内容，我们对前面『计算器』的代码进行一些调整就可以支持浮点数的运算了。例如：

```javascript
// 编译
var fn = jit.compile(function() {
  this.Proc(function() {
    visit.call(this, ast);
      
    // 结果存储在 'rax' 寄存器里面
    this.Return();
  });
}, { stubs: stubs });
      
// 执行
console.log(fn());
      
function visit(ast) {
  if (ast.type === 'Program')
    visitProgram.call(this, ast);
  else if (ast.type === 'Literal')
    visitLiteral.call(this, ast);
  else if (ast.type === 'UnaryExpression')
    visitUnary.call(this, ast);
  else if (ast.type === 'BinaryExpression')
    visitBinary.call(this, ast);
  else
    throw new Error('Unknown ast node: ' + ast.type);
}
      
function visitProgram(ast) {
  assert.equal(ast.body.length,
               1,
               'Only one statement programs are supported');
  assert.equal(ast.body[0].type, 'ExpressionStatement');
      
  // We've a pointer in 'rax', convert it to integer
  visit.call(this, ast.body[0].expression);
      
  // Get floating point number out of heap number
  this.movq('xmm1', ['rax', 8]);
      
  // Round it towards zero
  this.roundsd('zero', 'xmm1', 'xmm1');
      
  // Convert double to integer
  this.cvtsd2si('rax', 'xmm1');
}
      
function visitLiteral(ast) {
  assert.equal(typeof ast.value, 'number');
      
  // Allocate new heap number
  this.stub('rax', 'Alloc');
      
  // Save 'rbx' register
  this.spill('rbx', function() {
    this.loadDouble('rbx', ast.value);
    this.mov(['rax', 8], 'rbx');
  });
}
      
function visitBinary(ast) {
  // Preserve 'rbx' after leaving the AST node
  this.spill('rbx', function() {
    // Visit left side of expresion
    visit.call(this, ast.right);
      
    // Move it to 'rbx'
    this.mov('rbx', 'rax');
      
    // Visit right side of expression (the result is in 'rax')
    visit.call(this, ast.left);
      
    //
    // So, to conclude, we've left side in 'rax' and right in 'rbx'
    //
      
    // Let's load their double values
    this.movq('xmm1', ['rax', 8]);
    this.movq('xmm2', ['rbx', 8]);
      
    // Execute binary operation
    if (ast.operator === '+') {
      this.addsd('xmm1', 'xmm2');
    } else if (ast.operator === '-') {
      this.subsd('xmm1', 'xmm2');
    } else if (ast.operator === '*') {
      this.mulsd('xmm1', 'xmm2');
    } else if (ast.operator === '/') {
      this.divsd('xmm1', 'xmm2');
    } else {
      throw new Error('Unsupported binary operator: ' + ast.operator);
    }
      
    // Allocate new number, and put value in it
    this.stub('rax', 'Alloc');
    this.movq(['rax', 8], 'xmm1');
  });
}
      
function visitUnary(ast) {
  if (ast.operator === '-') {
    // Negate argument by emulating binary expression
    visit.call(this, {
      type: 'BinaryExpression',
      operator: '*',
      left: ast.argument,
      right: { type: 'Literal', value: -1 }
    })
  } else {
    throw new Error('Unsupported unary operator: ' + ast.operator);
  }
}
```
