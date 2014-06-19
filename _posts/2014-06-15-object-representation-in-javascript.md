---
layout: post
title: Value Representation In JavaScript
author: leeight
---



如果想弄清楚 JavaScript 引擎内部是如何表示『值』的，这两篇文章是不能错过的。

1. <http://wingolog.org/archives/2011/05/18/value-representation-in-javascript-implementations>
2. <http://nikic.github.io/2012/02/02/Pointer-magic-for-efficient-dynamic-value-representations.html>

第二篇文章中的 C++ 代码有人用 JavaScript 重新实现了一遍：

1. <https://gist.github.com/Benvie/5021724>
2. <https://gist.github.com/Benvie/5022360>


### Tagged Pointer

`sizeof(void *)`代表的是指针的大小，在32位的机器上，应该是4，也就是32比特；在64位的机器上，应该是8，也就是64比特。但是[维基百科](http://en.wikipedia.org/wiki/X86-64#Virtual_address_space_details)上面提到了这句话

> AMD therefore decided that, in the first implementations of the architecture, only the least significant 48 bits of a virtual address would actually be used in address translation (page table lookup).

这句话的意思是在寻址的时候（通过分页表进行虚拟地址到物理地址转化的时候）实际上只有最低的 48个比特是有用的，48~63 这 16 个比特跟 47 这个比特的内容是完全一样的。因为 2^48 已经有 256TB 的大小了，实际情况下很少有机器能支持这么大的内存。

### NAN-Boxing

据 <http://wingolog.org> 介绍，这个技术最早来源于 LuaJIT，后来被 Mozilla 应用到了 SpiderMonkey 里面。Mozilla 的一个工程师 Rob Sayre 曾经发表过[博客](http://blog.mozilla.com/rob-sayre/2010/08/02/mozillas-new-javascript-value-representation/)详细的介绍了这个技术，但是链接已经失效了，需要从<http://web.archive.org>上面重新找回才可以。

实际上这个技术也是相当的古老了，据说 1993 年就已经有人介绍过了：<http://lambda-the-ultimate.org/node/3912>

使用 64 比特来存储数据和指针，解决 32 比特无法处理的问题，比如浮点数无法表示，超过 31 个比特能够表示的整数之类的情况。

对于Object, String, Integer，用高 32 比特表示类型，用低 32 比特存储数据或者指针的值。

按照 NaN 的定义，把高 16 比特默认设置为 1，那么高位还剩余 16 比特，用来表示 Type Tag 已经绰绰有余了。

按照[IEEE-754 double precision numbers](http://en.wikipedia.org/wiki/IEEE_754-1985#Double-precision_64_bit)的规定：

![double precision numbers](http://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/IEEE_754_Double_Floating_Point_Format.svg/618px-IEEE_754_Double_Floating_Point_Format.svg.png)

`NaN`指的就是：

1. 11 个指数位全部是 1
2. 剩余的 52 个尾数位不是 0

这样子的话我们拿掉1个符号位，11 个指数位，4 个尾数位，总共 16 个比特；还剩余 48 个比特，已经可以表示足够多的类型了。因为在 64 位系统上，因为对齐内存地址的缘故，剩余的 48 个比特最低 3 位总是 0，这就可以表示 8 种类型了。如果还不够的话，从 4 个尾数位中去掉三个，还能表示 8 种，所以我们有64种类型可以用来表示。
