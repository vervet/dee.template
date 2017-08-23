/*
 * @Author: wangdi
 * @Date:   2017-05-03 19:22:02
 * @Last Modified by:   wangdi
 * @Last Modified time: 2017-05-04 09:27:57
 */
'use strict';
const http = require('http');
var FS = require("fs");
const path = require('path');
if (typeof(window.$) == 'undefined') {
	console.error('%c $ jquery  is not ready!!!!!', 'font-size:20pt');
	return;
}

class Template {
	constructor() {

		}
		/** 根据魔板及数据  生成html代码,
		1.0仅支持一层json数据  2.0支持json对象(不支持数组) 3.0支持全json(内含数组)
	
		* 模板：
		* <TEXTAREA id='mytpl0'>
		* 	<input name=user  value='{myvalue}'>
		*   <img src='${mypicurl}'>
		* </TEXTAREA>
		* 
		* 数据： jsonData = {myvalue: 'user123', mypicurl:'http://aaaaa/aaa.jpg' } 
		* 
		* 使用：
		* Template.makeNode('#mytpl0', jsonData);
		* 
		* **/

	static makeNode(tplSel, jsonData) {
		//TODO   html模板
		var html = $(tplSel).text();
		//html = "<div>"+html+"</div>";
		html = Template.applyData(html, jsonData);

		return $(html);

	}


	/**
	将某魔板应用上数据，生成html，并append到某节点上
	**/
	static makeNodeTo(tplSel, jsonData, applySel) {
		$(applySel).append(Template.makeNode(tplSel, jsonData));

	}

	static makeToNode(tplSel, jsonData, applySel) {
		$(applySel).prepend(Template.makeNode(tplSel, jsonData));
		//		prepend

	}

	static applyData(tplTxt, data) {
		if (typeof(Map) == 'undefined') {
			return Template.applyData10(tplTxt, data);
		}

		tplTxt = tplTxt.replace(/\$\{(.+?)\}/g, "\${data\.$1\}");
		var tmpl = "`" + tplTxt + "`";
		return eval(tmpl);

	}

	static applyDataAdv(template, data) {
		var compiledScript = Template.compile(template);
		//console.log(compiledScript);
		var parse = eval(compiledScript);
		return parse(data);
	}

	static makeCode() {


	}
	static compile(template) {
		//意外地被jquery转化了

		template = template.replace(/&lt;/gm, '<')
			.replace(/&gt;/gm, '>');


		var evalExpr = /<%=(.+?)%>/g;
		var expr = /<%([\s\S]+?)%>/g;

		template = template
			.replace(evalExpr, '`); \n  echo( $1 ); \n  echo(`')
			.replace(expr, '`); \n $1 \n  echo(`')
			.replace(/\$\{(.+?)\}/g, "\${data\.$1\}"); //替换旧格式

		//console.log(template);

		template = 'echo(`' + template + '`);';

		var script =
			`(function parse(data){
			    var output = "";

			    function echo(html){
			      output += html;
			    }

			    ${ template }

			    return output;
			  })`;

		return script;
	}
	static applyData10(tplTxt, data) { /*1.0未完善*/
		for (var key in data) {
			var value = data[key];
			var keyname = "${" + key + "}";
			tplTxt = tplTxt.replace(keyname, value);

		}
		return tplTxt;
	}
	static tmplateTextfromfile(filepath) {

	}


}

class FromEbededObject {
	constructor(sel) {
		var selection = $(sel);
		if (selection.length < 1) {
			return;
		}
		this.document = selection[0].contentDocument;
	}

	//从include文件内，获取一段html
	element(sel) {
			var elem = $(sel, this.document);
			if (elem.length < 1) {
				return;
			}
			return elem[0].innerHTML;
		}
		//获取html并给魔板内变量赋值 
	template(sel, json) {
		var html = this.element(sel);
		return Template.applyDataAdv(html, json);
	}


}


class TemplateFromFile {
	constructor(filepath, code) {
		this.code = code;
		this.readfile(filepath);

	}
	readfile(filepath) {
		var html = '';
		if (!fileExistsSync(filepath)) {
			console.error("[dee-template]file not exists: " + filepath);
			console.log(this.code);
		} else {
			html = FS.readFileSync(filepath, "utf-8");
		}


		this.templateObj = $("<div>" + html + "</div>");

	}
	getOrignalHtml(sel) {
		return this.templateObj.find(sel).prop('innerHTML') + "";
	}
	template(sel, jsonData) {
		var text = this.getOrignalHtml(sel);
		//var text = this.templateObj.find(sel).text();
		return Template.applyDataAdv(text, jsonData);
	}

}
//vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv include 功能 vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
function fileExistsSync(path) {
	var path0 = decodeURI(path);
	return FS.existsSync(path0);
}

var HTMLinclude = (scope, baseURI) => {
	var basedir = path.join(baseURI).replace(path.sep == '/' ? 'file:' : 'file:\\', '');

	basedir = path.dirname(basedir);


	var selAll = $("include[loaded!='yes']", scope);
	var selCount = selAll.length;
	for (var i = 0; i < selCount; i++) {
		var ele = selAll.eq(i);
		var filepath = ele.attr('src');
		var fileid = ele.attr('module');
		var sel = ele.attr('node');
		var data = ele.attr('data');
		var script = ele.attr('script');

		if (!fileid) fileid = 'i_' + Math.random();

		var fileurl = '';
		if (!HTMLinclude.maker[fileid]) {
			if (!filepath) {
				console.log((ele[0].outerHTML));
			}

			fileurl = path.join(basedir, filepath);
			if (!fileExistsSync(fileurl)) {
				console.error("[include]file not exist:" + fileurl);
				return;
			}

			HTMLinclude.maker[fileid] = new TemplateFromFile(fileurl, (ele[0].outerHTML).trim());
			HTMLinclude.maker[fileid]._htmlfile = fileurl;
		}


		if (!sel) {
			continue;
		}

		var html = '';
		if (data) {
			try {
				html = HTMLinclude.maker[fileid].template('#' + sel, data);
			} catch (e) {
				console.error(e);
				console.error(data);
			}
		} else {
			html = HTMLinclude.maker[fileid].getOrignalHtml('#' + sel);
		}


		var oldNode = ele.get(0);
		oldNode.innerHTML = html;
		oldNode.setAttribute('loaded', 'yes');

		if (script) {
			var moduleID = ('M' + Math.random()).replace('0.', '');
			if (!oldNode.id) {
				oldNode.id = moduleID;
			} else {
				moduleID = oldNode.id;
			}

			let jsurl = path.join(basedir, script);

			runJs(oldNode, jsurl);

		}

		//execute script first OR fill html ?
		if (!fileurl) {
			fileurl = HTMLinclude.maker[fileid]._htmlfile;
		}
		Template.HTMLinclude(oldNode, fileurl);

		//执行代码
		function runJs(oldNode, jsurl) {
			if (!fileExistsSync(jsurl) && !fileExistsSync(jsurl + '.js')) {
				console.error("[include]file not exist:" + jsurl);
				return;
			}

			var localScript = require(jsurl);
			oldNode.runtime = new localScript(function(a) {
				return window.$(a, oldNode); //window.$('#' + moduleID));
			});
		}

	}

};
HTMLinclude.maker = [];


//！！在多实例情况下， 限制include代码对内部HTML节点作用域范围 
class IncludeBaseScript {
	constructor(data) {
		this.scope = data;
		this.$ = (a) => {
			return window.$(a, this.scope)
		};
	}
}

Template.include = IncludeBaseScript;

/*
用法： 
const Template = require('dee-template');

class VIP extends Template.include{
	constructor(scope) {
	   super(scope); //IMPORTANT
       
       alert( this.$('#tab_7').html() );
		//window.$
	}
}
module.exports = VIP;
*/
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^



//激活HTML里的include标签
Template.HTMLinclude = HTMLinclude;
//使用<object src='xxxx.html'> 方法获取魔板
Template.fromEmbededObject = FromEbededObject;
//使用文件系统里的文件作为魔板
Template.fromFile = TemplateFromFile;
Template.activeInclude = () => {
	console.log('the function [activeInclude] is not ready yet!')
}

//window.addEventListener('load',function(){ console.log('window.onload'); });

if (!Template.isLoad) {
	document.addEventListener('DOMContentLoaded', function() {
		console.log('document.ready');
		//Template.HTMLinclude(document);
	});
}
Template.isLoad = true;

module.exports = Template;

Template.HTMLinclude(document, document.baseURI);