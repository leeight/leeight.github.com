---
layout: post
title: Promises/A+
author: leeight
---



原文地址：<http://promisesaplus.com/>

**An open standard for sound, interoperable JavaScript promises—by implementers, for implementers.**

Promise用来表示异步操作的最终结果，主要通过Promise的`then`方法来完成跟Promise的交互。当调用`then`方法的时候，就是给Promise注册了一些回调函数，用来接收Promise的最终结果或者Promise无法完成的原因。

This specification details the behavior of the then method, providing an interoperable base which all Promises/A+ conformant promise implementations can be depended on to provide. As such, the specification should be considered very stable. Although the Promises/A+ organization may occasionally revise this specification with minor backward-compatible changes to address newly-discovered corner cases, we will integrate large or backward-incompatible only after careful consideration, discussion, and testing.

Historically, Promises/A+ clarifies the behavioral clauses of the earlier Promises/A proposal, extending it to cover de facto behaviors and omitting parts that are underspecified or problematic.

Finally, the core Promises/A+ specification does not deal with how to create, fulfill, or reject promises, choosing instead to focus on providing an interoperable then method. Future work in companion specifications may touch on these subjects.

## 名词解释

1. `promise`是一个拥有`then`方法的对象或者函数，而且`then`方法的行为符合这个文档的规定。
2. `thenable`是一个定义了`then`方法的对象或者函数。
3. `value`是任何一个合法的JavaScript的中的值（包括`undefined`, `thenable`, `promise`）。
4. `exception`是一个通过`throw`语句抛出的值。
5. `reason`是一个用来表示`promise`为何无法满足的值。

## 必要条件

### Promise的状态

Promise的状态必须是三个状态中的之一：pending, fulfilled, rejected。

1. 当Promise的状态是pending的时候，可以转移到fulfilled或者rejected的状态。
2. 当Promise的状态是fulfilled的时候，不允许转移到其它的状态，必须拥有一个**不可变**的`value`。
3. 当Promise的状态是rejected的时候，不允许转移到其它的状态，必须拥有一个**不可变**的`reason`。

**不可变**指的是对象不能变化，但是并没有限制对象内的属性不能被修改。

### then方法

Promise必须实现`then`方法来访问它当前的`value`或者最终的`value`或者最终的`reason`。

`then`方法接收两个参数：

```
promise.then(onFulfilled, onRejected);
```

1. `onFulfilled`和`onRejected`是可选参数，如果它们的类型不是函数，就必须忽略掉。
2. 如果`onFulfilled`是一个函数
    1. 必须等到Promise的状态切换到fulfilled之后才可以被调用，调用的时候传递的第一个参数是Promise的`value`
    2. 在Promise的状态切换到fulfilled之前不允许被调用
    3. 只允许被调用一次
3. 如果`onRejected`是一个函数
    1. 必须等到Promise的状态切换到rejected之后才可以被调用，调用的时候传递的第一个参数是Promise的`reason`
    2. 在Promise的状态切换到rejected之前不允许被调用
    3. 只允许被调用一次
4. `onFulfilled`和`onRejected`在[执行上下文](http://es5.github.io/#x10.3)堆栈只包含平台代码之前是不允许被调用的。例如：TODO
5. `onFulfilled`和`onRejected`在调用的时候必须以函数的方式来调用（也就是说没有`this`的值）
6. Promise的`then`方法可以被调用多次
    1. 如果Promise的状态是fulfilled了，那么注册过的`onFulfilled`回调函数的执行顺序应该跟调用`then`方法的顺序保持一致。
    2. 如果Promise的状态是rejected了，那么注册过的`onRejected`回调函数的执行顺序应该跟调用`then`方法的顺序保持一致。
7. `then`方法调用之后必须返回一个Promise：`promise2 = promise1.then(onFulfilled, onRejected);`
    1. 如果`onFulfilled`或者`onRejected`返回一个值`x`，那么执行Promise Resolution Procedure，简写为：`[[Resolve]](promise2, x)`
    2. 如果`onFulfilled`或者`onRejected`抛出了一个异常`e`，`promise2`的状态必须切换到rejected，并且对应的`reason`是`e`。
    3. 如果`onFulfilled`不是函数，但是`promise1`的状态切换到了fulfilled，`promise2`的状态也必须切换到fulfilled，并且它的`value`跟`promise1`是同一个`value`，也就是`promise2.value === promise1.value`。
    4. 如果`onRejected`不是函数，但是`promise1`的状态切换到了rejected，`promise2`的状态也必须切换到rejected，并且它的`reason`跟`promise1`是同一个`reason`，也就是`promise2.reason === promise1.reason`。


### Promise Resolution Procedure

Promise Resolution Procedure是一个抽象的操作过程，它的输入是promise和value，我们一般简写为：`[[Resolve]](promise, x)`。

如果`x`是`thenable`，那么`x`在尝试让`promise`适应`x`的状态转换，因为`thenable`可以让`x`看起来像一个Promise；否则的话，那么`promise`的状态切换到fulfilled，并且对应的`value`是`x`。

`thenable`的存在可以让不同的Promise实现之间可以相互操作，只要这些实现暴露一个跟 Promises/A+ 规范兼容的`then`方法即可。另外，它也允许 Promises/A+ 的实现通过合理的`then`方法来『同化』非兼容的实现方案。

执行`[[Resolve]](promise, x)`的过程如下：

1. 如果`promise`和`x`是同样的对象，也就是`promise === x`，`promise`的状态切换到rejected，对应的`reason`是TypeError
2. 如果`x`是一个Promise
    1. 当`x`的状态是pending的时候，`promise`的状态必须保持pending，直到`x`的状态切换到fulfilled或者rejected
    2. 当`x`的状态是fulfilled，`promise`的状态必须切换到fulfilled，对应的`value`跟`x`的`value`是同一个值
    3. 当`x`的状态是rejected，`promise`的状态必须切换到rejected，对应的`reason`跟`x`的`reason`是同一个值
3. 如果`x`是一个对象或者函数
    1. `var then = x.then`
    2. 如果执行`x.then`的时候抛出了异常`e`，那么`promise`的状态切换到rejected，对应的`reason`是`e`
    3. 如果`then`是一个函数，调用`then.call(x, resolvePromise, rejectPromise)`
        1. 当`resolvePromise`被调用的时候，如果传递的`value`是`y`，那么执行`[[Resolve]](promise, y)`
        2. 当`rejectPromise`被调用的时候，如果传递的`reason`是`r`，那么`promise`的状态切换到rejected，对应的`reason`是`r`
        3. 如果`resolvePromise`和`rejectPromise`都被调用了，或者`resolvePromise`，`rejectPromise`被调用了多次，那么只有第一次调用有效，后续的调用应该被忽略掉。
        4. 如果调用`then`的时候抛出了异常`e`
            1. 如果`resolvePromise`或者`rejectPromise`已经被调用了，那么忽略这个异常
            2. 否则`promise`的状态切换到rejected，对应的`reason`是`e`
    4. 如果`then`不是函数，`promise`的状态切换到fulfilled，对应的`value`是`x`
4. 如果`x`既不是对象也不是函数，`promise`的状态切换到fulfilled，对应的`value`是`x`

如果执行`[[Resolve]](promise, thenable)`的时候导致又执行了`[[Resolve]](promise, thenable)`，那么按照上述提到的算法会导致无限递归。实现Promise的时候是可以作一些必要的检测工作的，但是并不是必须要做的。如果检测到无限递归的情况出现，`promise`的状态必须切换到rejected，对应的`reason`是TypeError。

## 注意事项

1. Here “platfform code” means engine, environment, and promise implementation code. In practice, this requirement ensures that `onFulfilled` and `onRejected` execute asynchronously, after the event loop turn in which `then` is called, and with a fresh stack. This can be implemented with either a “macro-task” mechanism such as `setTimeout` or `setImmediate`, or with a “micro-task” mechanism such as `MutationObserver` or `process.nextTick`. Since the promise implementation is considered platform code, it may itself contain a task-scheduling queue or “trampoline” in which the handlers are called.
2. That is, in strict mode `this` will be `undefined` inside of them; in sloppy mode, it will be the global object.
3. Implementations may allow `promise2 === promise1`, provided the implementation meets all requirements. Each implementation should document whether it can produce `promise2 === promise1` and under what conditions.
4. Generally, it will only be known that `x` is a true promise if it comes from the current implementation. This clause allows the use of implementation-specific means to adopt the state of known-conformant promises.
5. This procedure of first storing a reference to `x.then`, then testing that reference, and then calling that reference, avoids multiple accesses to the `x.then` property. Such precautions are important for ensuring consistency in the face of an accessor property, whose value could change between retrievals.
6. Implementations should not set arbitrary limits on the depth of thenable chains, and assume that beyond that arbitrary limit the recursion will be infinite. Only true cycles should lead to a `TypeError`; if an infinite chain of distinct thenables is encountered, recursing forever is the correct behavior.