---
layout: post
title: How to start JIT-ing
author: leeight
---


### 前言

大部分工程师都听说过 JIT 编译器这个神奇的东东，可以大大提高解释型语言的执行效率，某些场景下的执行速度甚至可以跟机器码想媲美。但是并没有很多的工程师理解 JIT 编译器背后的工作原理，能够开发自己所需要 JIT编译器 的工程师就少之又少了。

我理解至少去了解一下编译器内部的工作原理对于理解代码的执行过程是很有帮助的。因此在下面的章节中就会介绍一下 JIT编译器 的主要几个知识点，最后希望能借助这些知识实现一个我们自己的 JIT编译器。

### 从哪里开始呢

对编译器有一定了解的工程师们都知道，编译器实际上就是把一种格式的输入（通常是源代码）转化成另外一种格式的输出（通常是字节码，机器码等等），JIT编译器也不例外。JIT编译器比较特殊的地方在于它并不是提前编译好源代码的，而是需要的时候即时编译，这正是它名字的来历（Just-In-Time）。

在开发我们自己的 JIT编译器之前，我们首先需要确定这个编译器的输入是什么。在参考了[2013年度Github上最流行的编程语言](http://adambard.com/blog/top-github-languages-for-2013-so-far/)排行榜之后，发现JavaScript名列首位，所以我们就选择 JavaScript 作为编译器的输入。
AST

我们的 JIT编译器输入是 JavaScript源代码，输出是可以立即在 X64平台上的执行机器码。但是对于正常的人类来说，看到文本形式的机器码可能更舒心一些，这也正是为什么很多开发编译器的工程师们通常会选择多个中间语言（Intermediate Representations），最终才生成所需的机器码。

因为我们要开发的只是一个简单的 JIT编译器，因此一个中间语言就足够了，所以我们选择了抽象语法树（AST）来协助我们完成后续的工作。

时至今日，生成 JavaScript的抽象语法树已经是很简单的事情了，有很多开源工具可供我们选择，例如：esprima，uglify-js等等。这里我选择了esprima，因为它的输出格式定义的很清晰，容易进行后续的处理。
例如对于这句代码：obj.method(42) 调用esprima的API之后，就会输出如下的抽象语法树（AST）。

```javascript
{ type: 'Program',
  body:
   [ { type: 'ExpressionStatement',
       expression:
        { type: 'CallExpression',
          callee:
           { type: 'MemberExpression',
             computed: false,
             object: { type: 'Identifier', name: 'obj' },
             property: { type: 'Identifier', name: 'method' } },
          arguments: [ { type: 'Literal', value: 42 } ] } } ] }
```

### Machine Code

如果对熟悉汇编语言有一定了解的话，可以跳过这部分的内容。如果不是很熟悉的话，强烈建议你继续读下去。
CPU只能理解和执行二进制的代码，通过读取一条指令，运行一条指令的方式来执行代码。但是对于人类来说，汇编语言算是最接近这些二进制代码的文本表示形式。对于人类来说，看到下面的代码应该很容易从逻辑上理解：一行就是一条CPU指令。

```asm
mov rax, 1    ; 把 1 放入寄存器`rax`
mov rbx, 2    ; 把 2 放入寄存器`rbx`
add rax, rbx  ; 计算寄存器 `rax` 和 `rbx` 的值，然后把结果放回到寄存器 `rax`
```

上面这段代码的输出是3（也就是寄存器 rax 里面的值）。另外你可能也看到了，上面这段代码执行的时候就是把一些值放到合适的寄存器中去，然后让 CPU计算结果，把结果再放到合适的寄存器里面。

通常情况下 CPU 有足够多的寄存器来存储中间结果，但是有些情况下我们还是会需要从内存中读取或者写入一些数据。

```asm
mov rax, 1
mov [rbp-8], rbx  ; Save rbx register into a stack slot
mov rbx, 2
add rax, rbx
mov rbx, [rbp-8]  ; Restore rbx register from a stack slot
```

寄存器通常以 rax, rbx, rcx 等符号来表示，内存地址通常以 [...] 符号来表示。例如：[rbx-8] 的意思就是获取寄存器 rbx 中的值，减去8，然后把结果当做内存地址，从中获取所需要的数据。

你可以看到这里我们使用了 rbx 寄存器，一般来说 rbx 寄存器中存储的是在栈内分配的变量的内存起始地址；8是 rbx 寄存器的容量，因为栈是向上增长的，所以我们需要减去8从而得到一个可用的内存地址。

实际上对于如此底层的代码在不同的平台上还是会有一些细微的差别，但是这里我无法面面俱到的提到，所以请你们记住的是这里提到的内容只是简化的版本，真是情况下是会更加复杂的。
好了，了解了上面的内容，对于理解后续的章节是有帮助的。

### Code Generation

实现 JavaScript 的所有功能是非常困难的，所以我们就简化一下我们的工作，只实现一个『计算器』的功能（当然后面你就会发现其实实现一个计算器也是很有趣的一件事情）。

进入正题。实现的时候最简单的方式就是通过深度优先搜索算法的方式遍历抽象语法树（AST），然后为每个节点生成对应的机器码。你可能会有个疑问，应该如何去生成机器码呢，前面没提到呀。不要着急，我给你推荐一个工具 jit.js。

jit.js 是 Node.js  的一个模块（实际上是 C++ 的扩展），主要的目的就是用来生成并执行机器码的，用法跟汇编语言一样，只是语法是 JavaScript 的语法。例如：

```javascript
var jit = require('jit.js');
     
var fn = jit.compile(function() {
  this.Proc(function() {
    this.mov('rax', 42);
    this.Return();
  });
});
console.log(fn());  // 42
```


### Let's write it

现在唯一剩下的一件事情就是遍历 esprima 生成的抽象语法树（AST）了。考虑到 esprima 输出的数据格式以及我们『计算器』的简单功能，遍历抽象语法树应该是一个很简单的事情。
我们打算支持：

1. 数值字面量
2. 二元表达式，其中的操作符是 +,  -,  *,  /, %
3. 一元表达式，其中的操作符是 -

上面的操作符都是针对整数的，所以不要期望可以支持浮点数。

当处理表达式的时候，我们会遍历它对应的抽象语法树节点，生成对应的机器码以便把结果保存在 rax 寄存器中。听起来很简单，但是有个地方需要注意的是，当我们用完 rax 寄存器之后还需要把它的内容恢复到原来的样子。也就是在用之前我们需要保存所有寄存器的状态，用完之后还要恢复到原来的状态。幸运的是 CPU 提供了 push 和 pop 这两个指令可以帮助我们很好的完成这个事情。

下面就是整个『计算器』的代码，包含了一些注释，方便你们理解：

```javascript
var jit = require('jit.js'),
    esprima = require('esprima'),
    assert = require('assert');
     
var ast = esprima.parse(process.argv[2]);
     
// 编译汇编代码，生成最终机器码
var fn = jit.compile(function() {
  // This will generate default entry boilerplate
  this.Proc(functon() {
    visit.call(this, ast);
     
    // 结果应该已经存储到了 rax 寄存器里面，所以返回即可
     
    // This will generate default exit boilerplate
    this.Return();
  });
});
     
// 执行机器码
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
  visit.call(this, ast.body[0].expression);
}
     
function visitLiteral(ast) {
  assert.equal(typeof ast.value, 'number');
  assert.equal(ast.value | 0,
               ast.value,
               'Only integer numbers are supported');
     
  this.mov('rax', ast.value);
}
     
function visitBinary(ast) {
  // 保存 rbx 寄存器的状态
  this.push('rbx');
     
  // 访问表达式的右子节点
  visit.call(this, ast.right);
     
  // 把 rax 寄存器的内容放到 rbx 寄存器
  this.mov('rbx', 'rax');
     
  // 访问表达式的左子节点，结果会存到在 rax 寄存器中
  visit.call(this, ast.left);
     
  // 到了这里，左子节点的值在 rax 寄存器，右子节点的值在 rbx 寄存器
  // 执行二元操作
  if (ast.operator === '+') {
    this.add('rax', 'rbx');
  } else if (ast.operator === '-') {
    this.sub('rax', 'rbx');
  } else if (ast.operator === '*') {
    // 乘法，只需要一个寄存器操作符即可
    // rax = rax * rbx
    this.imul('rbx');
  } else if (ast.operator === '/') {
    // 保留 rdx 寄存器的状态
    this.push('rdx');
     
    // idiv is diving rdx:rax by rbx, therefore we need to clear rdx
    // before running it
    this.xor('rdx', 'rdx');
     
    // Signed division, rax = rax / rbx
    this.idiv('rbx');
     
    // 恢复 rdx 寄存器的状态
    this.pop('rdx');
  } else if (ast.operator === '%') {
    // 保存 rdx 寄存器的状态
    this.push('rdx');
     
    // Prepare to execute idiv
    this.xor('rdx', 'rdx');
    this.idiv('rbx');
     
    // imul puts remainedr in 'rdx'
    this.mov('rax', 'rdx');
     
    // 恢复 rdx 寄存器的状态
    this.pop('rdx');
  } else {
    throw new Error('Unsupported binary operator: ' + ast.operator);
  }
     
  // 恢复 rbx 寄存器
  this.pop('rbx');
     
  // 结果已经在 rax 寄存器中了
}
     
function visitUnary(ast) {
  // 访问节点的参数，然后把结果放到 rax 寄存器中
  visit.call(this, ast.argument);
     
  if (ast.operator === '-') {
    // 负值
    this.neg('rax');
  } else {
    throw new Error('Unsupported unary operator: ' + ast.operator);
  }
}
```

把上述代码保存为 main.js ，然后执行下面的命令就能看到输出的结果，是不是很有趣呢？


能读到这里已经很不容易了，下面我再介绍一下浮点数的操作以及操作堆上分配的内存事宜。