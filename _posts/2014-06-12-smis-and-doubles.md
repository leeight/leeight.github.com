---
layout: post
title: SIMs and Doubles
author: leeight
---


到现在为止，我们的内存分配器可以工作了，『计算器』也支持浮点数的运算了。然而浮点数的计算方式无法适应性能敏感的场景，主要原因在于它们都被存储到了 Heap 上面，每次计算都需要从 Heap 读取，然后再把结果写回 Heap。这样的一来一回就降低的代码的执行效率。

如果想要提高代码的执行效率，就应该像最初那样子，把数据都存储到寄存器中，这就需要我们能够支持浮点数和整数这两种类型（因为不同的类型所需要的汇编指令和寄存器是不一样的）

### Tagging

让我们回忆一下前面的内容，64位通用寄存器（rax，rbx）中是可以容纳指针或者整数的。因此现在的问题就是，给你一个寄存器（rax），你如何判断它里面的数值是一个整数（unboxed value）呢，还是一个指针（boxed value）呢？

通常，我们采用一种叫做『Tagging』的技术来解决这个问题。这里再多啰嗦几句。当我们实现一个动态类型语言的时候，首先要面临的一个问题是如何定义这个语言中的基本元素，比如说对象，整数，浮点数等等。据我所知有很多种不同的方式，例如你可以到处传递一个指针，就像在 CPython 里面实现的那样子。所有的对象都是一个 PyObject 的指针，这些指针传来传去，然后执行操作的时候就可以从 PyObject 的结构体里面得到对象的类型，然后执行对应的操作。

这种方式的缺点很明显，对于小整数也被打包到一个 PyObject 对象中去了，实际上是没有必要的，既浪费内存，效率又不高。所以在 Lua 里面出现了另外一种的解决方案，采用 Union 来包含所有所支持类型。这样子就可以避免为小整数分配过多的不必要的内存，相反直接存储到 Union 里面就可以了。

NaN-Boxing 是这种方式的一个变种，把所有的内容（指针，小整数）都存储到一个双精度浮点数 NaN 里面，存储的时候使用的是对于 NaN 来说无用的尾数部分。相比 Union 的方案而言，我们可以省略掉 type 字段，这样子又能节省一部分内存。

![The three fields in a 64bit IEEE 754 float](http://yuedu.baidu.com/bookeditor/interface/imageview?book_id=3dd0355590c69ec3d5bb75bb&file=3774f885d68e91117386c8c7f5accbd1.png)

具体到实现层面就有很多种方式了，例如：NaN-Boxing，Nun-Boxing等等。在这里我们采用的方式是如果是指针的话，就把最低位置为1；如果是小整数的话，就把最低位置为0；如果是浮点数的话，怎么处理？

![Tags](http://yuedu.baidu.com/bookeditor/interface/imageview?book_id=3dd0355590c69ec3d5bb75bb&file=0a96a605f5d36609fcf64cbbadf26b9f.png)

如果想要获取 SMI 的值，只需要右移一位（>> 1）即可；如果想要把一个整数转化为 SMI 只需要左移一位（<< 1）即可。用 0 来作为 SMI 的标记最大的优势就是当执行加法和减法的时候不需要进行移位操作。

如果想要使用指针的话，只需要减1就可以获取实际的内存地址，通过汇编指令很方便可以达到我们的目的：

```javascript
// 如果 rbx 寄存器存储的是 Tagged Poiner
// 并且想把它指向的内存地址的值放到 rax 寄存器rax
this.mov('rax', ['rbx', -1]);
```

对于 SMI 也可以方便的用如下的指令完成 Tag 和 Untag 的操作。

```javascript
// Untag
this.shr('rax', 1);
// Tag
this.shl('rax', 1);
```

然后最重要的部分就是如何判断一个值是不是指针：

```javascript
// 判断 rax 寄存器中值的最低位是否是1
this.test('rax', 1);

// 'z' 指代的是0
// 也就是说，如果 rax & 1 == 0，就跳转到 is-smi 去执行
this.j('z', 'is-smi');

// 'nz' 指代的是非0
// 业绩是说，如果 rax & 1 == 1，就跳转到 is-heap-object-pointer 去执行
this.j('nz', 'is-heap-object-pointer');
```

基于上面的只是我们就可以对前面写过的代码进行一些小小的重构。首先添加一个公共的函数来简化一些判断的逻辑：

```javascript
function untagSmi(reg) {
  this.shr(reg, 1);
};

function checkSmi(value, t, f) {
  // If no `true-` and `false-` bodies were specified -
  // just test the value.
  if (!t && !f)
    return this.test(value, 1);

  // Enter the scope to be able to use named labels
  this.labelScope(function() {
    // Test the value
    this.test(value, 1);

    // Skip SMI case if result is non-zero
    this.j('nz', 'non-smi');

    // Run SMI case
    t.call(this);

    // Jump to the shared end
    this.j('end');

    // Non-SMI case
    this.bind('non-smi');
    f.call(this);

    // Shared end
    this.bind('end');
  });
};

function heapOffset(reg, offset) {
  // NOTE: 8 is the size of pointer on x64 arch.
  // We're adding 1 to the offset, because first
  // quad word is used to store the heap object's type.
  return [reg, 8 * ((offset | 0) + 1) - 1];
};
```

然后在 jit.compile 的时候就可以使用上面定义的这些函数了。

```javascript
var helpers = {
  untagSmi: untagSmi,
  checkSmi: checkSmi,
  heapOffset: heapOffset
};

jit.compile(function() {
  // We can use helpers here:
  this.untagSmi('rax');

  this.checkSmi('rbx', function() {
    // Work with SMI
  }, function() {
    // Work with pointer
  });

  this.mov(this.heapOffset('rbx', 0), 1);
}, { stubs: stubs, helpers: helpers });
```

### Allocation

现在我们就可以重构我们的内存分配器（Alloc Stub）让它返回 Tagged Pointer了。另外，我们给 Alloc Stub 添加额外的参数 tag 和 size 来支持更多的功能（分配变长的内存大小和添加自定义的tag）。

```javascript
stubs.define('Alloc', function(size, tag) {
  // Save 'rbx' and 'rcx' registers
  this.spill(['rbx', 'rcx'], function() {
    // Load `offset`
    //
    // NOTE: We'll use pointer to `offset` variable, to be able to update
    // it below
    this.mov('rax', this.ptr(offset));
    this.mov('rax', ['rax']);

    // Load end
    //
    // NOTE: Same applies to end, though, we're not updating it right now
    this.mov('rbx', this.ptr(end));
    this.mov('rbx', ['rbx']);

    // Calculate new `offset`
    this.mov('rcx', 'rax');

    // Add tag size and body size
    this.add('rcx', 8);
    this.add('rcx', size);

    // Check if we won't overflow our fixed size buffer
    this.cmp('rcx', 'rbx');

    // this.j() performs conditional jump to the specified label.
    // 'g' stands for 'greater'
    // 'overflow' is a label name, bound below
    this.j('g', 'overflow');

    // Ok, we're good to go, update offset
    this.mov('rbx', this.ptr(offset));
    this.mov(['rbx'], 'rcx');

    // First 64bit pointer is reserved for 'tag',
    // second one is a `double` value
    this.mov('rcx', tag);
    this.mov(['rax'], 'rcx');

    // !!!!!!!!!!!!!!!
    // ! Tag pointer !
    // !!!!!!!!!!!!!!!
    this.or('rax', 1);

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

### Math stubs

此外，因为『计算器』中的数学运算需要支持整数和浮点数，因此我们把这部分相关的代码也拆分成独立的 Stub 来维护。

```javascript
var operators = ['+', '-', '*', '/'];
var map = { '+': 'addsd', '-': 'subsd', '*': 'mulsd', '/': 'divsd' };

// 定义 加减乘除 的二元运算Stub
operators.forEach(function(operator) {
  stubs.define('Binary' + operator, function(left, right) {
    // 保存 rbx 和 rcx 的寄存器内容
    this.spill(['rbx', 'rcx'], function() {
      // Load arguments to rax and rbx
      this.mov('rax', left);
      this.mov('rbx', right);

      // Convert both numbers to doubles
      [['rax', 'xmm1'], ['rbx', 'xmm2']].forEach(function(regs) {
        var nonSmi = this.label();
        var done = this.label();

        this.checkSmi(regs[0]);
        this.j('nz', nonSmi);

        // Convert integer to double
        this.untagSmi(regs[0]);
        this.cvtsi2sd(regs[1], regs[0]);

        this.j(done);
        this.bind(nonSmi);

        this.movq(regs[1], this.heapOffset(regs[0], 0));
        this.bind(done);
      }, this);

      var instr = map[operator];

      // Execute binary operation
      if (instr)
        this[instr]('xmm1', 'xmm2');
      else
        throw new Error('Unsupported binary operator: ' + operator);

      // Allocate new number, and put value in it
      // NOTE: Last two arguments are arguments to the stub (`size` and `tag`)
      this.stub('rax', 'Alloc', 8, 1);
      this.movq(this.heapOffset('rax', 0), 'xmm1');
    });

    this.Return();
  });
});
```

### Compiler

最终，我们的代码重构成如下的形式：

```javascript
function visitProgram(ast) {
  assert.equal(ast.body.length,
               1,
               'Only one statement programs are supported');
  assert.equal(ast.body[0].type, 'ExpressionStatement');

  // We've a pointer in 'rax', convert it to integer
  visit.call(this, ast.body[0].expression);

  // Get floating point number out of heap number
  this.checkSmi('rax', function() {
    // Untag smi
    this.untagSmi('rax');
  }, function() {
    this.movq('xmm1', this.heapOffset('rax', 0));

    // Round it towards zero
    this.roundsd('zero', 'xmm1', 'xmm1');

    // Convert double to integer
    this.cvtsd2si('rax', 'xmm1');
  });
}

function visitLiteral(ast) {
  assert.equal(typeof ast.value, 'number');

  if ((ast.value | 0) === ast.value) {
    // Small Integer (SMI), Tagged value
    // (i.e. val * 2) with last bit set to
    // zero
    this.mov('rax', utils.tagSmi(ast.value));
  } else {
    // Allocate new heap number
    this.stub('rax', 'Alloc', 8, 1);

    // Save 'rbx' register
    this.spill('rbx', function() {
      this.loadDouble('rbx', ast.value);

      // NOTE: Pointers have last bit set to 1
      // That's why we need to use 'heapOffset'
      // routine to access it's memory
      this.mov(this.heapOffset('rax', 0), 'rbx');
    });
  }
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

    if (ast.operator === '/') {
      // Call stub for division
      this.stub('rax', 'Binary' + ast.operator, 'rax', 'rbx');
    } else {
      this.labelScope(function() {
        // Check if both numbers are SMIs
        this.checkSmi('rax');
        this.j('nz', 'call stub');
        this.checkSmi('rbx');
        this.j('nz', 'call stub');

        // Save rax in case of overflow
        this.mov('rcx', 'rax');

        // NOTE: both 'rax' and 'rbx' are tagged at this point
        // Tags don't need to be removed if we're doing addition or
        // substraction. However, in case of multiplication result
        // would be 2x bigger if we won't untag one of the arguments.
        if (ast.operator === '+') {
          this.add('rax', 'rbx');
        } else if (ast.operator === '-') {
          this.sub('rax', 'rbx');
        } else if (ast.operator === '*') {
          this.untagSmi('rax');
          this.mul('rbx');
        }

        // On overflow restore 'rax' from 'rcx' and invoke stub
        this.j('o', 'restore');

        // Otherwise return 'rax'
        this.j('done');
        this.bind('restore');

        this.mov('rax', 'rcx');

        this.bind('call stub');

        // Invoke stub and return heap number in 'rax'
        this.stub('rax', 'Binary' + ast.operator, 'rax', 'rbx');

        this.bind('done');
      });
    }
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

最后总结一下，默认情况下的工作模式是 SMIs，而且会内联所有的数值运算来提高代码的运行效率。如果遇到了浮点数或者整数运算溢出了，就会回退到浮点数的计算方式。因此一般情况下而言，小整数的运算效率是很好的。

内容到这里就结束了，希望通过这篇文章能了解到 JIT编译器的一些基本原理。
