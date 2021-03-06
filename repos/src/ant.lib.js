/***************************************************************************
 *
 * Copyright (c) 2011 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * ant.lib.js ~ 2011/04/18 23:54:59
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 * self是关键字
 **/

if (!Array.prototype.filter) {
  // @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/filter
  Array.prototype.filter = function(fun /*, thisp */) {
    'use strict';

    if (this === void 0 || this === null) {
      throw new TypeError();
    }

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== 'function') {
      throw new TypeError();
    }

    var res = [];
    var thisp = arguments[1];
    for (var i = 0; i < len; i++) {
      if (i in t) {
        var val = t[i]; // in case fun mutates this
        if (fun.call(thisp, val, i, t)) {
          res.push(val);
        }
      }
    }

    return res;
  };
}

// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.com/#x15.4.4.18
if ( !Array.prototype.forEach ) {

  Array.prototype.forEach = function( callback, thisArg ) {

    var T, k;

    if ( this == null ) {
      throw new TypeError( " this is null or not defined" );
    }

    // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
    var O = Object(this);

    // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
    // 3. Let len be ToUint32(lenValue).
    var len = O.length >>> 0; // Hack to convert O.length to a UInt32

    // 4. If IsCallable(callback) is false, throw a TypeError exception.
    // See: http://es5.github.com/#x9.11
    if ( {}.toString.call(callback) != "[object Function]" ) {
      throw new TypeError( callback + " is not a function" );
    }

    // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
    if ( thisArg ) {
      T = thisArg;
    }

    // 6. Let k be 0
    k = 0;

    // 7. Repeat, while k < len
    while( k < len ) {

      var kValue;

      // a. Let Pk be ToString(k).
      //   This is implicit for LHS operands of the in operator
      // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
      //   This step can be combined with c
      // c. If kPresent is true, then
      if ( k in O ) {

        // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
        kValue = O[ k ];

        // ii. Call the Call internal method of callback with T as the this value and
        // argument list containing kValue, k, and O.
        callback.call( T, kValue, k, O );
      }
      // d. Increase k by 1.
      k++;
    }
    // 8. return undefined
  };
}

/**
 * @type {Object}
 * @const
 */
var logger = {};

/**
 * 打印warning信息.
 * @param {string} msg 要打印的信息.
 */
logger.warning = function(msg) {
  self.log('WARNING:' + msg);
};

/**
 * 打印error信息.
 * @param {string} msg 要打印的信息.
 */
logger.error = function(msg) {
  self.log('ERROR:' + msg);
};

/**
 * 打印debug信息.
 * @param {string} msg 要打印的信息.
 */
logger.debug = function(msg) {
  self.log('DEBUG:' + msg);
};

/**
 * @param {string} name 属性的名字.
 * @param {string=} opt_value 值，可选.
 * @return {string} 环境变量的值.
 */
function _(name, opt_value) {
  if (typeof opt_value != 'undefined') {
    self.getProject().setProperty(name, opt_value);
  }
  return self.getProject().getProperty(name);
}

/**
 * @param {string} name task的名字.
 * @return {*} Task.
 */
function createTask(name) {
  return self.getProject().createTask(name);
}

/**
 * @param {string} msg 需要输出的信息.
 */
function echo(msg) {
  var task = createTask('echo');
  task.setMessage(msg);
  task.perform();
}

/**
 * @param {string=} opt_msg 退出当前的Build进程.
 */
function fail(opt_msg) {
  var task = createTask('fail');
  if (opt_msg) {
    task.setMessage(opt_msg);
  }
  task.perform();
}

/**
 * @param {Array.<string>|string} input 要删除的目录.
 */
function rmdir(input) {
  var task = createTask('delete');
  if (isString(input)) {
    task.setDir(new java.io.File(input));
  } else if (isArray(input)) {
    for (var i = 0, j = input.length; i < j; i++) {
      task.setDir(new java.io.File(input[i]));
    }
  }
  task.perform();
}

/**
 * @param {Array.<string>|string} input 要删除的文件.
 */
function rm(input) {
  var task = createTask('delete');
  if (isString(input)) {
    task.setFile(new java.io.File(input));
  } else if (isArray(input)) {
    for (var i = 0, j = input.length; i < j; i++) {
      task.setFile(new java.io.File(input[i]));
    }
  }
  task.perform();
}

/**
 * 打印出一些环境变量的信息，供调试使用.
 */
function echo_env() {
  echo('== ENV ==');
  if (_('env.OS') == 'Windows_NT') {
    echo(_('env.Path'));
  } else {
    echo(_('env.PATH'));
  }
  exec('java', ['-version']);
  exec('python', ['--version']);
  exec('python', ['-c',  '\'import sys;print(sys.path)\'']);
  exec('node', ['--version']);
  echo('== END ==');
}

/**
 * 获取不同系统下面的python版本
 * @return {string}
 */
function getPython() {
  if (_('env.USER') == 'scmpf') {
    return 'python2.7';
  } else {
    return 'python';
  }
}

/**
 * 获取不同系统下面的python版本
 * @return {string}
 */
function PYTHON() {
  return getPython();
}

/**
 * 调用jython来执行python脚本
 * @param {Array.<string>=} opt_args 一些默认的参数.
 */
function JYTHON(opt_args) {
  var args = ['-jar ' + (_('tools.dir') + '/lib/jython-2.5.2.jar')];
  if (isArray(opt_args)) {
    args = args.concat(opt_args);
  }

  exec('java', args);
}

/**
 * 需要在ant脚本里面添加这句话
 * <property environment="env" />
 * @return {string} null device.
 */
function getNullDevice() {
  if (_('env.OS') == 'Windows_NT') {
    return 'NUL:';
  } else {
    return '/dev/null';
  }
}

/**
 * @param {string} dir 需要创建的目录.
 */
function mkdir(dir) {
  var task = createTask('mkdir');
  task.setDir(new java.io.File(dir));
  task.perform();
}

/**
 * @return {Array.<string>}
 */
function echoproperties() {
  var tmp = tempfile();

  var task = createTask('echoproperties');
  task.setDestfile(new java.io.File(tmp));
  task.perform();

  var properties = readFile(tmp).split("\n");
  return properties;
}

/**
 * @return {string} uuid.
 */
function uuid() {
  return Math.floor(Math.random() * 2147483648).toString(36);
}

/**
 * 获取一个文件的目录名
 * @param {string} file 输入文件.
 * @return {string} 目录名称.
 */
function dirname(file) {
  var property = uuid();

  var task = createTask('dirname');
  task.setFile(new java.io.File(file));
  task.setProperty(property);
  task.perform();

  return _(property);
}

/**
 * @param {boolean=} opt_deleteOnExit jvm退出的时候是否删掉文件，默认是true.
 * @return {string} 获取一个临时的文件路径.
 */
function tempfile(opt_deleteOnExit) {
  var property = uuid();

  var task = createTask('tempfile');
  task.setProperty(property);
  if (opt_deleteOnExit !== false) {
    task.setDeleteOnExit(true);
  }
  task.perform();

  return _(property);
}

/**
 * 创建一个临时目录
 * @return {string} 目录的路径.
 */
function tempdir() {
  var tmp = tempfile(false);
  var file = new java.io.File(tmp);
  file.mkdirs();

  return '' + file.getAbsolutePath();
}

/**
 * 从一个路径中获取文件的名字.
 *
 * @param {string} path 输入的路径.
 * @return {string} 文件名称.
 */
function basename(path) {
  var property = uuid();

  var task = createTask('basename');
  task.setFile(new java.io.File(path));
  task.setProperty(property);
  task.perform();

  return _(property);
}

/**
 * 请参考python中的os.path.splitext
 * @param {string} name 文件名.
 * @return {Array.<string} > 数组有两项，[0]是名字,[1]是后缀包含'.'
 * 如果没有后缀，则[1]为空.
 */
function splitext(name) {
  var last_dot_pos = name.lastIndexOf('.');
  if (last_dot_pos == -1) {
    return [name, ''];
  } else {
    var basename = name.substring(0, last_dot_pos);
    var extension = name.substring(last_dot_pos);

    return [basename, extension];
  }
}

/**
 * @param {string} from 源文件.
 * @param {string} to 目标文件.
 * @param {boolean=} opt_overwrite 是否覆盖.
 */
function copy(from, to, opt_overwrite) {
  var fromFile = new java.io.File(from),
      toFile = new java.io.File(to);
  if (!fromFile.exists()) {
    return;
  }

  if (fromFile.isDirectory()) {
    var task = createTask('copydir');
    task.setSrc(fromFile);
    task.setDest(toFile);
    task.perform();
  } else {
    var task = createTask('copy');
    task.setFile(fromFile);
    task.setTofile(toFile);

    if (opt_overwrite) {
      task.setOverwrite(true);
    }
    task.perform();
  }
}

/**
 * @return {string} svnversion.
 */
function svnversion() {
  var property = uuid();

  var task = createTask('exec');
  task.setExecutable('svnversion');
  task.setOutputproperty(property);
  task.setFailonerror(false);
  task.setFailIfExecutionFails(false);
  task.setDir(_('base.dir'));

  try {
    task.perform();
    return _(property);
  } catch (e) {
    return 'BUILD_VERSION';
  }
}

/**
 * @return {string} 机器名.
 */
function hostname() {
  var property = uuid();

  var task = createTask('exec');
  task.setExecutable('hostname');
  task.setOutputproperty(property);
  task.perform();

  return _(property);
}

/**
 * @param {string} inputfile 输入文件.
 */
function md5sum(inputfile) {
  var property = uuid();

  var checksum = createTask('checksum');
  if (isString(inputfile)) {
    inputfile = new java.io.File(inputfile);
  }
  checksum.setFile(inputfile);
  checksum.setProperty(property);
  checksum.perform();

  return _(property);
}

/**
 * @param {string} inputfile 输入文件.
 */
function gen_checksum(inputfile) {
  var file = new java.io.File(inputfile);
  if (!file.exists()) {
    return;
  }

  var checksum = md5sum(inputfile);

  var destfile = '',
      last_dot_pos = inputfile.lastIndexOf('.');
  if (last_dot_pos == -1) {
    destfile = inputfile + '-' + checksum;
  } else {
    destfile = inputfile.substring(0, last_dot_pos) + '-' +
                checksum + inputfile.substring(last_dot_pos);
  }

  copy(inputfile, destfile);

  return checksum;
}

/**
 * @param {string} input 输入文件.
 * @param {string} output 输出文件.
 * @param {string=} opt_jar yui的jar文件.
 */
function yui(input, output, opt_jar) {
  var task = createTask('java'),
      jar = opt_jar || (_('tools.dir') + '/lib/yui-compressor.jar');

  task.setJar(new java.io.File(jar));
  task.setFork(true);
  task.setFailonerror(true);
  task.setMaxmemory('128m');
  task.createArg().setLine('--line-break 800');
  task.createArg().setLine('-o ' + output);
  task.createArg().setLine(input);
  task.perform();
}

/**
 * @param {string|Array.<string>} input 输入文件，可以是一个，也可以是一个数组.
 * @param {string} output 输出文件.
 * @param {string=} opt_jar gcc的jar文件.
 * @param {Array.<string>=} opt_extraflags 命令行参数.
 * @param {string=} opt_error error的输出文件.
 */
function gcc(input, output, opt_jar, opt_extraflags, opt_error) {
  var task = createTask('java'),
      jar = opt_jar || (_('tools.dir') + '/lib/google-closure-compiler.jar');

  task.setJar(new java.io.File(jar));
  task.setFork(true);
  task.setFailonerror(true);
  task.setMaxmemory('128m');
  task.createArg().setLine('--js_output_file ' + output);
  if (isString(input)) {
    task.createArg().setLine('--js ' + input);
  } else if (isArray(input)) {
    for (var i = 0, j = input.length; i < j; i++) {
      task.createArg().setLine('--js ' + input[i]);
    }
  }

  var extraflags = opt_extraflags || [];
  if (extraflags.length) {
    for (var i = 0, j = extraflags.length; i < j; i++) {
      task.createArg().setLine(extraflags[i]);
    }
  }

  if (opt_error) {
    task.setError(new java.io.File(opt_error));
  }

  try {
    logger.debug('java -jar ' + jar + (isArray(extraflags) ? (' ' + extraflags.join(' ')) : ''));
    task.perform();
  } catch (e) {
    fail('gcc failed');
  }
}

/**
 * 获取某个目录中的所有文件.
 * @param {string} dir 需要变量的目录名称.
 * @param {RegExp=} opt_exclude 通过正则来忽略某些内容.
 */
function fileset(dir, opt_exclude) {
  var dirFile = new java.io.File(dir);
  if (!dirFile.isDirectory()) {
    return [];
  }

  var files = [];
  var entries = dirFile.listFiles();
  for (var i = 0, j = entries.length; i < j; i++) {
    var entry = entries[i],
        name = getPath(dir + '/' + entry.getName());
    if (!opt_exclude ||
        (opt_exclude && !opt_exclude.test(name))) {
      if (entry.isDirectory()) {
        files = files.concat(fileset(name, opt_exclude));
      } else {
        files.push(name);
      }
    }
  }

  return files;
}

/**
 * @param {string} pattern 正则的规则.
 * @param {string=} opt_flag flag.
 * @return {RegExp}
 */
function regexp(pattern, opt_flag) {
  var escaped = pattern.replace(
      new RegExp('([.*+?^=!:\x24{}()|[\\]/\\\\])', 'g'),
      '\\\x241');
  if (opt_flag) {
    return new RegExp(escaped, opt_flag);
  } else {
    return new RegExp(escaped);
  }
}

/**
 * 判断目标参数是否Array对象
 *
 * @param {*} source 目标参数.
 * @return {boolean} 类型判断结果.
 */
function isArray(source) {
  return '[object Array]' == Object.prototype.toString.call(
                             /** @type {Object}*/ (source));
}

/**
 * 判断目标参数是否string类型或String对象
 *
 * @param {*} source 目标参数.
 * @return {boolean} 类型判断结果.
 */
function isString(source) {
  return '[object String]' == Object.prototype.toString.call(
                              /** @type {Object}*/ (source));
}

/**
 * 将源对象的所有属性拷贝到目标对象中
 *
 * @param {Object} target 目标对象.
 * @param {Object} source 源对象.
 * @return {Object} 目标对象.
 */
function extend(target, source) {
    for (var p in source) {
        if (source.hasOwnProperty(p)) {
            target[p] = source[p];
        }
    }
    return target;
}

/**
 * @param {string} input 输入文件.
 * @param {Object=} opt_options 参数选项.
 */
function calcdeps(input, opt_options) {
  var defaultOptions = {
        'output' : _('build.dir') + '/app.js',
        'jar' : _('tools.dir') + '/lib/google-closure-compiler.jar',
        'level' : 'ADVANCED_OPTIMIZATIONS',
        'mode' : 'compiled',
        'formatting' : 'PRETTY_PRINT',
        'cssoutputfile' : _('build.dir') + '/app.css',
        'tploutputfile' : _('build.dir') + '/tpl.html',
        'extraflags' : []
      },
      options = extend(defaultOptions, opt_options || {});

  // 两个task，需要sequential保证串行
  var sequential = createTask('sequential');

  var mkdir = createTask('mkdir');
  mkdir.setDir(new java.io.File(_('build.dir')));

  var exec = createTask('exec');
  exec.setExecutable('python');
  exec.setFailonerror(true);
  exec.setLogError(true);
  exec.setOutput(new java.io.File(options['output']));

  exec.createArg().setValue(_('tools.dir') + '/lib/calcdeps.py');
  exec.createArg().setLine('-i "' + input + '"');
  exec.createArg().setLine('-p "."');
  exec.createArg().setLine('-o "' + options['mode'] + '"');
  exec.createArg().setLine('-c "' + options['jar'] + '"');
  exec.createArg().setLine('-f "--compilation_level=' + options['level'] + '"');
  exec.createArg().setLine('-f "--summary_detail_level=3"');
  exec.createArg().setLine('-f "--generate_exports"');
  exec.createArg().setLine('-f "--warning_level=VERBOSE"');
  exec.createArg().setLine('-f "--css_output_file=' + options['cssoutputfile'] + '"');
  exec.createArg().setLine('-f "--tpl_output_file=' + options['tploutputfile'] + '"');
  exec.createArg().setLine('-f "--output_wrapper=(function(){%output%})();"');

  var extraflags = options['extraflags'];
  if (extraflags) {
    for (var i = 0, j = extraflags.length; i < j; i++) {
      exec.createArg().setLine(extraflags[i]);
    }
  }

  sequential.addTask(mkdir);
  sequential.addTask(exec);
  sequential.perform();
}

/**
 * @param {string} command 要执行的命令.
 * @param {Array.<string>=} opt_args 命令参数，可选.
 * @param {java.io.File=} opt_output 日志输出的文件，可选.
 */
function exec(command, opt_args, opt_output) {
  var task = createTask('exec');
  task.setExecutable(getPath(command));
  task.setFailonerror(true);
  task.setLogError(true);

  if (opt_output) {
    task.setOutput(opt_output);
  }

  if (isArray(opt_args)) {
    for (var i = 0, j = opt_args.length; i < j; i++) {
      task.createArg().setLine(opt_args[i]);
    }
  }

  try {
    logger.debug(command + (isArray(opt_args) ? (' ' + opt_args.join(' ')) : ''));
    task.perform();
  } catch (e) {
    fail(e.toString());
  }
}

/**
 * @param {string} input 输入文件.
 * @return {string} 最后一次提交人.
 */
function getLastCommitter(input) {
  var tmp = tempfile();
  exec('svn', ['info', input], new java.io.File(tmp));

  // Last Changed Author: zhoulianjie
  var lca_prefix = 'Last Changed Author: ';
  var lines = readFile(tmp).split('\n').filter(function(line) {
    return line.indexOf(lca_prefix) == 0;
  });

  if (lines.length == 1) {
    return lines[0].substring(lca_prefix.length);
  }

  return '';
}

/**
 * 使用javamail发送邮件
 * @param {string} from 发件人.
 * @param {string} to 收件人.
 * @param {string} subject 标题.
 * @param {string} message 邮件内容.
 */
function javamail(from, to, subject, message) {
  var task = createTask('mail');
  task.setSubject(subject);
  task.setFrom(from);
  task.setToList(to);
  task.setCharset('utf-8');
  task.setMessage(message);
  try {
    task.perform();
  } catch (e) {
    fail(e.toString());
  }
}

/**
 * @param {string} from 发件人.
 * @param {string} to 收件人.
 * @param {string} title 标题.
 * @param {string} body 邮件内容.
 * @param {Array.<string>=} opt_headers 额外的头部信息.
 */
function mail(from, to, title, body, opt_headers) {
  logger.debug(from + '/' + to + '/' + title + '/' + body.length());
  var args = [
    // test02上面不支持-a参数...
    // '-a "From: ' + from + '"',
    '-s "' + title + '"',
    to
  ];
  if (opt_headers) {
    for (var i = 0, j = opt_headers.length; i < j; i++) {
      args.push('-a "' + opt_headers[i] + '"');
    }
  }

  var task = createTask('exec');
  task.setExecutable('mail');
  task.setFailonerror(true);
  task.setLogError(true);
  task.setInputString(body);

  for (var i = 0, j = args.length; i < j; i++) {
    task.createArg().setLine(args[i]);
  }

  try {
    task.perform();
  } catch (e) {
    fail(e.toString());
  }
}

/**
 * @param {string} dir 输入的文件目录.
 */
function gjslint(dir) {
  if (_('env.OS') == 'Windows_NT') {
    logger.warning('gjslint target was not supported on Windows');
    return;
  }

  var tmp = tempfile();
  exec(_('tools.dir') + '/bin/Fgjslint', ['-r', dir], new java.io.File(tmp));

  var file_prefix = '----- FILE',
      line_prefix = 'Line ';
  var lines = readFile(tmp).split('\n').filter(function(line) {
    return line.indexOf(file_prefix) == 0 ||
           line.indexOf(line_prefix) == 0;
  });

  // ----- FILE  :  /home/leeight/work/svn/app/ecom/jn-core-trunk/webapp/src/er/Action.js -----
  var errors = {},
      line = null,
      current = null,
      match = null,
      pattern = /\s*([\-]+)\s*FILE\s*:\s*([\S]+)\s*([\-]+)/;
  for (var i = 0, j = lines.length; i < j; i++) {
    line = lines[i];
    if (line.indexOf(file_prefix) == 0) {
      match = pattern.exec(line);
      if (match) {
        current = match[2];
      }
    } else if (line.indexOf(line_prefix) == 0) {
      if (line == null) {
        continue;
      }

      // collect error message now.
      if (!isArray(errors[current])) {
        errors[current] = [];
      }
      errors[current].push(line);
    }
  }

  var dir = tempdir();

  var author,
      destfile,
      authors = {};
  for (var file in errors) {
    author = getLastCommitter(file);
    if (author) {
      authors[author] = true;

      destfile = new java.io.File(dir + '/' + author);
      if (!destfile.exists()) {
        writeFile(destfile, [
          'Q:How to fix these issues?',
          'A:Please see this page http://fe.baidu.com/doc/display-ads/linter.text'
        ].join('\n') + '\n\n');
      }

      writeFile(destfile, file + '\n', true);
      writeFile(destfile, errors[file].join('\n'), true);
      writeFile(destfile, '\n\n', true);
    }
  }

  for (var author in authors) {
    mail('gcl-noreply@baidu.com', author + '@baidu.com',
      '[DN-LINT]:Google Closure Linter Check Result', readFile(dir + '/' + author));
  }
  rmdir(dir);
}

// -- 下面的函数是在DAN/CLB里面用到的 --

/**
 * @param {string} input 输入文件.
 * @return {string} 文件的内容.
 */
function readFile(input) {
  var file = new java.io.File(getPath(input));
  if (!file.exists()) {
    return '';
  }

  var content = '';
  var scanner = new java.util.Scanner(file, 'utf-8').useDelimiter('\\Z');
  if (scanner.hasNext()) {
    content = scanner.next();
  }
  scanner.close();

  return String(content);
}

/**
 * @param {java.io.File|string} input 要写入的文件.
 * @param {string} content 内容.
 * @param {boolean=} opt_append 是否追加内容.
 */
function writeFile(input, content, opt_append) {
  var file = input;
  if (isString(input)) {
    file = new java.io.File(input);
  }

  var parentDir = file.getParentFile();
  if (parentDir != null && !parentDir.exists()) {
    parentDir.mkdirs();
  }

  //use OutputStreamWriter instead, so it could specify charset encoder
  var writer = new java.io.BufferedWriter(
      new java.io.OutputStreamWriter(new java.io.FileOutputStream(file, opt_append === true), 'utf-8')
  );
  writer.write(content);
  writer.close();
}

/**
 * @param {string} input 归一化文件的路径.
 * @return {string} 归一化之后的路径.
 */
function getPath(input) {
  return String(input).replace(/\//g, java.io.File.separator);
}

/**
 * @param {string} path 要检测的文件路径.
 * @return {boolean} true文件存在，false文件不存在.
 */
function fileExists(path) {
  var dummy = new java.io.File(path);
  return !!dummy.exists();
}

/**
 * @param {string} input 输入的文件.
 * @param {RegExp=} opt_pattern 正则.
 * @param {function(string):boolean=} opt_callback 验证的回调函数.
 * @return {Array.<string>} 需要加载的文件列表.
 */
function getFileSet(input, opt_pattern, opt_callback) {
  var fileset = [];

  function defaultCallback(line) {
    return line.indexOf('document.write') == 0;
  }

  var lines = readFile(input).split('\n');
  if (lines.length > 0) {
    var line,
        match,
        file,
        pattern = opt_pattern || /src="\/([^"]+)"/,
        callback = opt_callback || defaultCallback;
    for (var i = 0, j = lines.length; i < j; i++) {
      line = lines[i];
      if (!callback(line)) {
        continue;
      }
      match = pattern.exec(line);
      if (match) {
        file = new java.io.File(match[1]);
        if (file.exists()) {
          fileset.push(match[1]);
        }
      }
    }
  }

  return fileset;
}

/**
 * 获取文件的内容
 * @param {string} input 输入的js文件.
 * @return {string} 文件的内容.
 */
function getFileContent(input) {
  var fileset = getFileSet(input);
  if (fileset.length > 0) {
    var merged = [];
    for (var i = 0, j = fileset.length; i < j; i++) {
      merged.push(readFile(fileset[i]));
    }
    return merged.join('\n');
  } else {
    return '';
  }
}

/**
 * 用gcc来检测文件的错误，编译的时候给出的错误太粗略了，不能
 * 确定是哪个文件里面的。
 * @param {Array.<string>|string} input 输入文件.
 * @param {Array.<string>=} opt_extraflags 额外的参数.
 */
function gcc_lint(input, opt_extraflags) {
  var fileset = [];
  if (isString(input)) {
    fileset = getFileSet(input);
  } else if (isArray(input)) {
    for (var i = 0, j = input.length; i < j; i++) {
      fileset = fileset.concat(getFileSet(input[i]));
    }
  } else {
    // ignore
    return;
  }

  var extraflags = [
    '--warning_level=VERBOSE'
  ];

  if (opt_extraflags) {
    extraflags = extraflags.concat(opt_extraflags);
  }

  var lintLog = getPath(_('basedir') + '/lint.log');
  gcc(fileset, getNullDevice(), null, extraflags, lintLog);
  echo(readFile(lintLog));
  logger.debug('Please check file \"' + lintLog + '\" for detail.');
}

/**
 * @param {Array.<string>|string} input 输入文件.
 * @param {string=} opt_output 输出文件，会添加_("build.dir")前缀的.
 */
function merge_js(input, opt_output) {
  var content = [],
      dest;
  if (isArray(input)) {
    for (var i = 0, j = input.length; i < j; i++) {
      content.push(getFileContent(input[i]));
    }
    dest = opt_output || input[input.length - 1]; // 默认是数组的最后一个.
  } else {
    content.push(getFileContent(input));
    dest = opt_output || input;           // 需要保存的文件名
  }

  writeFile(_('build.dir') + '/' + dest, content.join('\n'));
}

/**
 * @param {string} input 输入文件.
 */
function compile_css(input) {
  echo('compiling ' + input + ' ...');

  var output = tempfile();
  yui(input, output);
  copy(output, input, true);
}

/**
 * @param {string} input 输入文件.
 */
function merge_css(input) {
  var lines = readFile(input).split('\n');
  if (lines.length > 0) {
    var line,
        match,
        merged = [],
        pattern = /@import\s+'\.\.\/\.\.\/([^']+)'/;

    for (var i = 0, j = lines.length; i < j; i++) {
      line = lines[i];
      if (line.indexOf('@import') != 0) {
        continue;
      }

      match = pattern.exec(line);
      if (match) {
        merged.push(readFile(match[1]));
      }
    }

    writeFile(_('build.dir') + '/gold/' + input, merged.join('\n'));
  }
}


/**
 * @param {string} input 输入文件.
 */
function merge_tpl(input) {
  var pattern = /^\s*'\/([^']+)'/;
  var fileset = getFileSet(input, pattern, function(line) { return true; });
  var content = [];
  for (var i = 0, j = fileset.length; i < j; i++) {
    content.push(readFile(fileset[i]));
  }

  writeFile(_('build.dir') + '/gold/assets/tpl.html', content.join('\n'));
}

function build_version() {
  return new Date().toString() + '@' + hostname();
}

/**
 * @param {string} name app的文件名，去掉.app.html的部分.
 * @param {string} dir app所在的目录.
 * @param {string} output_dir 最终要输出的目录.
 */
function build_ad_entry(name, dir, output_dir) {
  var entry_point = dir + '/' + name + '.app.html';
  if (!fileExists(entry_point)) {
    fail(entry_point + ' not exists.');
  }

  _('entry_point', entry_point);
  _('output_dir_name', output_dir);
  _('compilation_level', 'ADVANCED_OPTIMIZATIONS');
  _('FLAGS_noisy', '1');
  _('FLAGS_enable_javascript_rewriter', '1');
  _('FLAGS_enable_html_rewriter', '1');
  _('FLAGS_enable_auto_sprite', '1');
  _('FLAGS_enable_png8_convert', '0');
  _('FLAGS_ad_template_wrapper', '\'var AD_TEMPLATE_CONTENT=%output%;\'');
  _('FLAGS_ad_style_wrapper', '\'var AD_STYLE_CONTENT=%output%;\'');
  _('FLAGS_third_party', dir + '/' + name + '.config.js,assets/js/mustache.js');
  build_app_entry(_("entry_point"), _("output_dir_name"));
}

/**
 * @param {string} entry_point 入口文件.
 * @param {string} output_dir_name 输出的文件目录.
 * @param {string=} opt_third_party 默认的第三方文件列表，逗号分割.
 */
function build_app_entry(entry_point, output_dir_name, opt_third_party) {
  var ep = entry_point;
  if (!ep || !output_dir_name) {
    fail("please set -Dentry_point and -Doutput_dir_name.");
  }

  var output_dir = _('build.dir') + '/' + output_dir_name;
  rmdir(output_dir);

  var target = self.getOwningTarget();
  var ad_deploy_phrase = (target == "ad.deploy" || target == "ad.all");

  var args = ([
    getPath(_('tools.dir') + '/bin/Fer.py'),
    '--gen_deploy',
    '-p src',
    '--entry_point ' + ep,
    '--less_include_path ' + _('less_include_path'),
    '-f "--compilation_level=' + _("compilation_level") + '"',
    // '-f "--formatting=PRETTY_PRINT"',
    '-f "--warning_level=VERBOSE"',
    '-f "--externs=' + _("externs.js") + '"',
    '-r ' + _('build.dir') + '/' + output_dir_name
  ]);

  if (!ad_deploy_phrase) {
    args = args.concat([
      '-f "--define=app.version=\'' + build_version() + '\'"',
      '-f "--flagfile=' + _("flagfile") +'"',
    ]);
  } else {
    args = args.concat([
      '-f "--generate_exports"'
    ]);
  }

  if (!ad_deploy_phrase) {
    // 如果是build广告的阶段，是不需要添加这些变量的
    // 可能以后需要（比如生成不同版式的代码）
    var properties = echoproperties();
    for(var i = 0; i < properties.length; i ++) {
      if (properties[i].indexOf("#") === 0) {
        continue;
      }
      if (properties[i].match(/^([a-zA-Z_\.]+)_URL=/)) {
        var name = properties[i].split('=')[0];
        args.push('-f "--define=' + name + '=\'' + _(name) + '\'"');
      } else if (properties[i].match(/FLAGS_enable/)) {
        var name = properties[i].split('=')[0];
        if (_(name) == "1") {
          // FLAGS_enable_javascript_rewriter -> --enable_javascript_rewriter
          args.push(name.replace('FLAGS_', '--'));
        }
      }
    }
  }

  if (!opt_third_party) {
    opt_third_party = _("FLAGS_third_party");
  }
  if (opt_third_party) {
    var third_party_files = opt_third_party.split(",");
    for(var i = 0; i < third_party_files.length; i ++) {
      if (String(third_party_files[i]).length > 0) {
        args.push('-j ' + third_party_files[i]);
      }
    }
  }

  if (_("FLAGS_noisy") == "1") {
    args.push('--noisy');
  }

  if (_("FLAGS_ad_template_wrapper")) {
    args.push('--ad_template_wrapper=' + _("FLAGS_ad_template_wrapper"))
  }

  if (_("FLAGS_ad_style_wrapper")) {
    args.push('--ad_style_wrapper=' + _("FLAGS_ad_style_wrapper"))
  }


  exec(PYTHON(), args);
}

// -- END
















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
