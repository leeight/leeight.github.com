/***************************************************************************
 *
 * Copyright (c) 2012 Baidu.com, Inc. All Rights Reserved
 * $Id$
 *
 **************************************************************************/



/**
 * src/app/gen_map.js ~ 2012/07/31 23:54:45
 * @author leeight(liyubei@baidu.com)
 * @version $Revision$
 * @description
 *
 **/

var esprima = require('esprima');
var fs = require('fs');
var sys = require('sys');
var path = require('path');

/**
 * 根据JS的路径来推算app.html的路径
 * @param {string} file js的路径.
 * @return {string} app.html的路径或者'-'
 */
function getAppFile(file) {
  if (!file) {
    return '-';
  }

  var app_path = file.replace(/\.js$/, '.app.html');
  if (fs.existsSync('src/' + app_path)) {
    return app_path;
  } else {
    return '-';
  }
}

/**
 * 用来检测一个对象是否符合{'action':string,'location':string,'authority':?string}的结构
 * @param {Array.<Object>} properties 要检测的属性集合.
 * @return {?Object} 如果符合要求，返回检测之后的内容，否则返回null.
 */
function IsValidConfig(properties) {
  var location = null;
  var action = null;
  var authority = null;

  properties.forEach(function(property) {
    var type = property.key.type;
    var name = property.key.name || property.key.value;

    if ((type === 'Identifier' || type === 'Literal')) {
      if (name === 'location') {
        location = property.value.value;
      } else if (name === 'action') {
        action = property.value.value;
      } else if (name === 'authority') {
        authority = property.value.value;
      }
    }
  });

  if (location && action) {
    return {
      'action' : action,
      'location' : location,
      'authority' : authority || '-',
      'file' : dependencies[action] || '-',
      'app_file' : getAppFile(dependencies[action])
    };
  } else {
    return null;
  }
}

// 重新建立dependencies，方便从ns获取到file path
var dependencies = {};
function addDependency(relPath, provides, requires) {
  provides.forEach(function(ns){
    dependencies[ns] = relPath;
  });
}
var deps = fs.readFileSync('src/deps.js', 'utf-8');
eval(deps.replace(/goog\./g, ''));

// 获取到所有的js文件列表 src/jn
function walk(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};


walk('src/jn', function(error, results){
  var result = [];

  results = results.filter(function(file){ return file.match(/\.js$/) && !file.match(/\.data\.js$/); });
  results.forEach(function(file){
    // 扫描文件
    var code = fs.readFileSync(file, 'utf-8');
    var syntax = esprima.parse(code);
    var type = null;
    JSON.stringify(syntax, function(key, value) {
      if (type === 'ObjectExpression') {
        if (key == 'properties') {
          var valid = IsValidConfig(value);
          if (valid) {
            result.push(valid);
          }
          type = null;
        }
        return value;
      }

      if (key === 'type' && value === 'ObjectExpression') {
          type = 'ObjectExpression';
        return value;
      } else {
        type = null;
      }

      return value;
    });
  });

  var ER_ACTION_LIST = {
      'success' : 'true',
      'message' : {},
      'page' : {
          'pageNo': 1,
          'pageSize': result.length,
          'orderBy': 'action',
          'order': 'desc',
          'totalCount': result.length,
          'result' : result
      }
  }
  var code = 'var ER_ACTION_LIST = ' + JSON.stringify(ER_ACTION_LIST, null, 4) + ';';
  fs.writeFileSync("src/jn/demo/er_action_list.data.js", code);
});


walk("src/ad/impl", function(error, results){
  var req_regex = /goog\.require\s*\(\s*[\'\"]([^\)]+)[\'\"]\s*\)/;
  var result = [];
  results.filter(function(file){ return file.match(/\.app.html$/); })
         .forEach(function(file){
            // goog.require('ad.impl.Style2');
            var code = fs.readFileSync(file, 'utf-8');
            var match = req_regex.exec(code);
            if (match) {
              var ns = match[1];
              var preview_file = 'ad/preview/' + path.basename(file, '.app.html') + '.png';
              result.push({
                'ns' : ns,
                'app_file' : file.replace('src/', ''),
                'file' : dependencies[ns] || '-',
                'preview_file' : fs.existsSync('src/' + preview_file) ? preview_file : '-',
              });
            }
         });
  result.sort(function(a, b){ return a['ns'].localeCompare(b['ns']); });

  var ER_AD_LIST = {
      'success' : 'true',
      'message' : {},
      'page' : {
          'pageNo': 1,
          'pageSize': result.length,
          'orderBy': 'action',
          'order': 'desc',
          'totalCount': result.length,
          'result' : result
      }
  }
  var code = 'var ER_AD_LIST = ' + JSON.stringify(ER_AD_LIST, null, 4) + ';';
  fs.writeFileSync("src/jn/demo/er_ad_list.data.js", code);
});


walk("src/ad/widget", function(error, results){
  var req_regex = /goog\.require\s*\(\s*[\'\"]([^\)]+)[\'\"]\s*\)/g;
  var result = [];
  results.filter(function(file){ return file.match(/\.app.html$/); })
         .forEach(function(file){
            // goog.require('ad.impl.Style2');
            var code = fs.readFileSync(file, 'utf-8');
            var lines = code.split(/\r?\n/g);
            for(var i = 0; i < lines.length; i ++) {
              var match = req_regex.exec(code);
              if (match && match[1].indexOf("ad.widget.") === 0) {
                var ns = match[1];
                var preview_file = 'ad/preview/widget/' + path.basename(file, '.app.html') + '.png';
                var style_config_file = file.replace('.app.html', '.style.config.json');
                var schema_file = file.replace('.app.html', '.schema.json');
                result.push({
                  'ns' : ns,
                  'app_file' : file.replace('src/', ''),
                  'file' : dependencies[ns] || '-',
                  'style_config_file' : fs.existsSync(style_config_file) ? style_config_file.replace('src/', '') : '-',
                  'preview_file' : fs.existsSync('src/' + preview_file) ? preview_file : '-',
                  'schema_file' : fs.existsSync('src/' + schema_file) ? schema_file : '-',
                });
                break;
              }
            }
         });
  result.sort(function(a, b){ return a['ns'].localeCompare(b['ns']); });

  var ER_AD_WIDGET_LIST = {
      'success' : 'true',
      'message' : {},
      'page' : {
          'pageNo': 1,
          'pageSize': result.length,
          'orderBy': 'action',
          'order': 'desc',
          'totalCount': result.length,
          'result' : result
      }
  }
  var code = 'var ER_AD_WIDGET_LIST = ' + JSON.stringify(ER_AD_WIDGET_LIST, null, 4) + ';';
  fs.writeFileSync("src/jn/demo/er_ad_widget_list.data.js", code);
});





















/* vim: set ts=4 sw=4 sts=4 tw=100 noet: */
