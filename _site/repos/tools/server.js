/***************************************************************************
 *
 * Copyright (c) 2011 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * server.js ~ 2011/10/20 16:23:32
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 *
 **/

var fs = require('fs'),
    async = require('async'),
    er = require('er-server'),
    path = require('path'),
    less = require('less');

var server = new er.ErServer();

/**
 * SESSION = {
 *   "request_id" : {
 *     "count" : 3,
 *     "buffer_size" : 0,
 *     "buffer" : [
 *       list<string>,
 *       list<string>,
 *       list<string>,
 *       ...
 *     ]
 *   }
 * }
 * @type {Object}
 */
var SESSION = {};

/**
 * return the file list from the request url.
 * @param {string} url the request url.
 * @param {string=} opt_key the optional key for the query, default
 *   is 'uris'.
 * @return {Array.<string>}
 */
function getFileList(url, opt_key) {
  var key = opt_key || 'uris';
  var query = require('url').parse(url, true).query;

  if (!query[key] || query[key].length <= 0) {
    return [];
  }

  var uris = decodeURIComponent(query[key]).split(',');

  var request_id = query['request_id'];
  var index = parseInt(query['index'], 10);
  var count = parseInt(query['count'], 10);

  if ((!!request_id) && (index >= 0) && (count > 0)) {
    // the batch request
    if (!SESSION[request_id]) {
      SESSION[request_id] = {
        'count' : count,
        'buffer_size' : 0,
        'buffer' : []
      };
    }

    var cache = SESSION[request_id];
    if (!cache['buffer'][index]) {
      cache['buffer'][index] = uris;
      cache['buffer_size'] += 1;
    }
    if (cache['count'] == cache['buffer_size']) {
      // the buffer is full, concat all of the uris in the buffer, and
      // return the result to the upper level.
      uris = [];
      cache['buffer'].forEach(function(item) {
        uris = uris.concat(item);
      });

      // clear the cache
      delete SESSION[request_id];

      return uris;
    } else {
      return [];
    }
  } else {
    // the normal request
    return uris;
  }
}

/**
 * @param {Array.<string>} files the request url.
 * @param {string=} opt_callback the handler for each file.
 *
 * @return {string} the file contents.
 */
function combineFiles(files, opt_callback) {
  var defaultCallback = function(file, callback) {
    var abs_path = server.getAbsPath(file);
    er.log('[REQUEST] '.blue + abs_path);
    fs.readFile(abs_path, callback);
  }
  var callback = opt_callback || defaultCallback;

  var validFiles = files.filter(function(item) { return !!item; });

  var ee = new(require('events').EventEmitter);
  async.map(validFiles, callback, function(err, results) {
    if (err) {
      ee.emit('error', err);
    } else {
      ee.emit('success', results.join('\n'));
    }
  });
  return ee;
}

/**
 * lauch the less compiler, and generate the
 * *.css file when necessary.
 * @param {string} less_abs_path the absolute file path.
 * @param {string} css the compiled css code.
 */
function generateCompiledStyles(less_abs_path, css) {
  var out_of_date = false,
      abs_path = less_abs_path,
      compiled_css = abs_path.replace(/\.less$/, '.compiled.css');

  if (!path.existsSync(compiled_css)) {
    out_of_date = true;
  } else {
    var a = Date.parse(fs.statSync(abs_path).mtime),
        b = Date.parse(fs.statSync(compiled_css).mtime);
    if (a > b) {
      // *.less was changed again
      out_of_date = true;
    }
  }

  if (out_of_date) {
    // XXX need toString
    fs.writeFile(compiled_css, css, function(err) {
      if (err) {
        throw err;
      }
      er.log('[REBUILD] '.yellow + compiled_css);
    });
  }
}

/**
 * @param {string} code less或者css代码.
 * @param {string} absPath less或者css文件的绝对路径.
 * @param {string} reqPath 请求的文件路径，例如/combine/all.css.
 */
function rewriteResourcePath(code, absPath, reqPath) {
  var urlPattern = /url\s*\(\s*(['"]?)([^\)'"]+)(\1)\s*\)/g;
  var dirName = path.dirname(absPath);
  return code.replace(urlPattern, function(match, p1, p2, p3, offset, string) {
    if (p2[0] == '/' ||
        p2.match(/^https?:\/\//g)) {
      return match;
    }
    var resource = path.relative(reqPath, path.normalize(path.join(dirName, p2)));
    var url = resource.replace(/\\/g, '/');
    return 'url(' + url + ')';
  });
}


// multi *.css and *.less request
server.addHandler('/combine/all.css', function(request, response) {
  var filelist = getFileList(request.url);
  if (filelist.length <= 0) {
    return '/** Waiting for next chunk. */';
  }

  var query = require('url').parse(request.url, true).query;
  var request_id = query['request_id'];
  if (request_id) {
    // we need generate an temp file
    var tempfile = '8964-' + request_id + '.less';
    var buffer = [];
    filelist.forEach(function(file) {
      var abs_path = server.getAbsPath(file);
      var stat = fs.statSync(abs_path);
      if (stat.isFile()) {
        var code = fs.readFileSync(abs_path);
        code = rewriteResourcePath(code.toString(), abs_path, server.getAbsPath('/combine/all.css'));
        buffer.push(code);
      }
    });
    fs.writeFileSync(server.getAbsPath(tempfile), buffer.join('\n'));
    filelist = [tempfile];
  } else {
    // the normal request, ignore
  }

  return combineFiles(filelist, function(file, callback) {
    var abs_path = server.getAbsPath(file);
    path.exists(abs_path, function(exists) {
      if (!exists) {
        er.log('[NOFOUND] '.red + abs_path);
        callback(null, '');
        return;
      }
      er.log('[REQUEST] '.blue + abs_path);
      if (/\.less$/.test(abs_path)) {
        // less file
        fs.readFile(abs_path, function(err, input) {
          if (err) {
            callback(err, '');
            return;
          }
          var options = {
                'paths' : ['.', server.getAbsPath('src/css/less')],
                'filename' : abs_path
              },
              parser = new(less.Parser)(options);

          parser.parse(input.toString(), function(e, root) {
            try {
              if (e) {
                callback(e, '');
              } else {
                // generate *.compiled.css
                var css = root.toCSS(options);
                if (!request_id) {
                  generateCompiledStyles(abs_path, css);
                }
                callback(null, css);
                if (request_id) {
                  // delete the temp file
                  fs.unlink(abs_path, function(e) {
                    if (e) {
                      throw e;
                    }
                  });
                }
              }
            } catch (x) {
              callback(null, require('util').inspect(x, true, null));
            }
          });
        });
      } else {
        // css file
        fs.readFile(abs_path, callback);
      }
    });
  });
});

// multi *.html request
server.addHandler('/combine/tpl.html', function(request, response) {
  return combineFiles(getFileList(request.url));
});

if (!path.existsSync(server.getAbsPath('src/css/less'))) {
  er.log(server.getAbsPath('src/css/less').red +
    ' not exists, some less files can not be compiled correctly');
}
server.start();



















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
