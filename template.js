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
		//20170509 新增  反向模板
	static makeToNode(tplSel, jsonData, applySel) {
			$(applySel).prepend(Template.makeNode(tplSel, jsonData));
			//		prepend

		}
		//data={x:100}
	static applyData(tplTxt, data) {
		if (typeof(Map) == 'undefined') {
			return Template.applyData10(tplTxt, data);
		}

		tplTxt = tplTxt.replace(/\$\{(.+?)\}/g, "\${data\.$1\}");
		var tmpl = "`" + tplTxt + "`";
		return eval(tmpl);

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
		return Template.applyData(html, json);
	}


}


class TemplateFromFile {
	constructor(filepath, callback) {
		this.readfile(filepath, callback);

	}
	readfile(filepath, callback) {

		//ajax 
		var html = FS.readFileSync(filepath, "utf-8");

		this.templateObj = $("<div>" + html + "</div>");

	}
	template(sel, jsonData) {
		var text = this.templateObj.find(sel).prop('innerHTML') + "";
		//var text = this.templateObj.find(sel).text();
		return Template.applyData(text, jsonData);
	}

}
//vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv include 功能 vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

var HTMLinclude = (scope) => {

	for (var i = 0; i < $('include', scope).length; i++) {
		var ele = $('include', scope).eq(i);
		var filepath = ele.attr('src');
		var fileid = ele.attr('module');
		var sel = ele.attr('node');
		var data = ele.attr('data');
		var script = ele.attr('script');

		if (!fileid) fileid = 'i_' + Math.random();

		if (!HTMLinclude.maker[fileid]) {
			let fileurl = `${path.join(window.VIEWROOT, filepath)}`;

			HTMLinclude.maker[fileid] = new TemplateFromFile(fileurl);
		}


		if (sel) {
			var html = HTMLinclude.maker[fileid].template('#' + sel, data);
			if (!script) {
				ele.get(0).outerHTML = html;
			} else {
				var moduleID = ('M' + Math.random()).replace('0.', '');
				ele.get(0).outerHTML = `<MODULE id='${moduleID}'>${html}</MODULE>`;

				let fileurl = `${path.join(window.ROOT, script)}`;

				var localScript = require(fileurl);


				new localScript(function(a) {
					return window.$(a, $('#' + moduleID));
				});


			}
			//execute script first OR fill html ?
			Template.HTMLinclude(document);

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
		Template.HTMLinclude(document);
	});
}
Template.isLoad = true;
//Template.HTMLinclude();

module.exports = Template;