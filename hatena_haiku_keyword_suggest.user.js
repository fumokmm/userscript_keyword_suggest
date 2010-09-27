// ==UserScript==
// @name           hatena_haiku_keyword_suggest
// @namespace      http://d.hatena.ne.jp/fumokmm/
// @description    hatena_haiku_Keyword Suggest
// @include        http://h.hatena.ne.jp/*
// @include        http://h.hatena.com/*
// @exclude        http://h.hatena.ne.jp/id/*
// @exclude        http://h.hatena.ne.jp/keyword/*
// @exclude        http://h.hatena.ne.jp/http/*
// @exclude        http://h.hatena.ne.jp/asin/*
// @exclude        http://h.hatena.com/id/*
// @exclude        http://h.hatena.com/keyword/*
// @exclude        http://h.hatena.com/http/*
// @exclude        http://h.hatena.com/asin/*
// @author         fumokmm
// @date           2010-10-xx
// @version        0.01
// ==/UserScript==

(function() {

	// スタイルを追加
	var style = <><![CDATA[
		#suggest {
			position: absolute;
			background-color: #FFFFFF;
			border: 1px solid #CCCCFF;
			font-size: 90%;
			width: 300px;
		    z-index: 1;
		}
		#suggest div {
			display: block;
			width: 300px;
			overflow: hidden;
			white-space: nowrap;
		}
		#suggest div.select{ /* キー上下で選択した場合のスタイル */
			color: #FFFFFF;
			background-color: #3366FF;
		}
		#suggest div.over{ /* マウスオーバ時のスタイル */
			background-color: #99CCFF;
		}
	]]></>;
	GM_addStyle(style);

	/**
	 * XPathを便利に扱う関数
	 *   by http://yamanoue.sakura.ne.jp/blog/coding/68
	 * @param query
	 * @param context
	 */
	var xpath = function(query, context) {
		context || (context = document)
		var results = document.evaluate(query, context, null,
			XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null)
		var nodes = []
		for (var i = 0; i < results.snapshotLength; i++) {
			nodes.push(results.snapshotItem(i))
		}
		return nodes
	}
		
	var searchKeyword = ''
	var keywordInput = xpath("//input[@type='text' and @name='word' and @class='text']")[0]
	
	/**
	 * メイン処理
	 */
	var main = function() {
		var suggestDiv = document.createElement('div')
		suggestDiv.setAttribute('id', 'suggest')
		keywordInput.parentNode.insertBefore(suggestDiv, keywordInput.nextSibling)
		keywordInput.setAttribute('autocomplete', 'off')
		keywordInput.setAttribute('id', 'keywordInput')

		// wondowのonloadイベントでSuggestを生成
		var start = function(){ new Suggest.Local("keywordInput", "suggest", []) }
		window.addEventListener ?
			window.addEventListener('load', start, false) :
			window.attachEvent('onload', start)
	}
	
	function requestKeywordList(callback) {
		if (searchKeyword != keywordInput.value) {
			searchKeyword = keywordInput.value
			GM_xmlhttpRequest({
				method: 'GET',
				url   : 'http://h.hatena.ne.jp/api/keywords/list.json?word=' + searchKeyword,
				onload: function(httpObj) {
					var newList = resultToList(eval(httpObj.responseText))
					callback(newList) // コールバック関数を呼び出し
				}
			});
		}
	}
	
	function resultToList(result, limit) {
		var res = []
		var size = limit < result.length ? limit : result.length
		for (var i = 0; i < size; i++) res.push(result[i].title)
		return res
	}
	
	/** 重複を除去したリストを新たに生成して返却 */
	Array.prototype.unique = function(clos) {
		clos || (clos = function(item){return item});
		var hash = {};
		for (var i = 0; i < this.length; i++) hash[clos(this[i])] = this[i];
		var newList = [];
		for (key in hash) newList.push(hash[key]);
		return newList;
	}
	
	//メイン処理を実行
	main()

	// --------------------------------------------------------------
	
	/*
	--------------------------------------------------------
	suggest.js - Input Suggest
	Version 2.1.1 (Update 2009/10/04)
	
	Copyright (c) 2006-2009 onozaty (http://www.enjoyxstudy.com)
	
	Released under an MIT-style license.
	
	For details, see the web site:
	 http://www.enjoyxstudy.com/javascript/suggest/
	
	--------------------------------------------------------
	*/
	
	if (!Suggest) {
	  var Suggest = {};
	}
	/*-- KeyCodes -----------------------------------------*/
	Suggest.Key = {
	  TAB:     9,
	  RETURN: 13,
	  ESC:    27,
	  UP:     38,
	  DOWN:   40
	};
	
	/*-- Utils --------------------------------------------*/
	Suggest.copyProperties = function(dest, src) {
	  for (var property in src) {
		dest[property] = src[property];
	  }
	  return dest;
	};
	
	/*-- Suggest.Local ------------------------------------*/
	Suggest.Local = function() {
	  this.initialize.apply(this, arguments);
	};
	Suggest.Local.prototype = {
	  initialize: function(input, suggestArea, candidateList) {
	
		this.input = this._getElement(input);
		this.suggestArea = this._getElement(suggestArea);
		
		this.candidateList = candidateList;
		this.oldText = this.getInputText();
	
		if (arguments[3]) this.setOptions(arguments[3]);
	
		// reg event
		this._addEvent(this.input, 'focus', this._bind(this.checkLoop));
		this._addEvent(this.input, 'blur', this._bind(this.inputBlur));
	
		var keyevent = 'keydown';
		if (window.opera || (navigator.userAgent.indexOf('Gecko') >= 0 && navigator.userAgent.indexOf('KHTML') == -1)) {
		  keyevent = 'keypress';
		}
		this._addEvent(this.input, keyevent, this._bindEvent(this.keyEvent));
	
		// init
		this.clearSuggestArea();
	  },
	
	  // options
	  interval: 500,
	  dispMax: 20,
	  listTagName: 'div',
	  prefix: false,
	  ignoreCase: true,
	  highlight: false,
	  dispAllKey: false,
	  classMouseOver: 'over',
	  classSelect: 'select',
	  hookBeforeSearch: function(){},
	
	  setOptions: function(options) {
		Suggest.copyProperties(this, options);
	  },
	
	  inputBlur: function() {
		this.changeUnactive();
		this.oldText = this.getInputText();
	
		if (this.timerId) clearTimeout(this.timerId);
		this.timerId = null;
	
		setTimeout(this._bind(this.clearSuggestArea), 500);
	  },
	
	  checkLoop: function() {
		var text = this.getInputText();
		if (text != this.oldText) {
		  this.oldText = text;
		  this.search();
		}
		if (this.timerId) clearTimeout(this.timerId);
		this.timerId = setTimeout(this._bind(this.checkLoop), this.interval);
	  },
	
	  search: function() {
		var text = this.getInputText();
		if (text == '' || text == null) return;
		this.hookBeforeSearch(text);
		this._search(text);
	  },
	
	  _search: function(text) {
		var self = this
		var func = function(resultList) {
		  self.clearSuggestArea()
		  self.createSuggestArea(resultList, self)
		}
		requestKeywordList(function(resultList) {
			if (resultList.length != 0) func(resultList)
			self.candidateList = self._take(resultList, self.dispMax)
			self.suggestIndexList = [];
			for (var i = 0, length = self.candidateList.length; i < length && i < self.dispMax; i++) {
				self.suggestIndexList.push(i);
			}
		    //alert(self.candidateList + "/" + self.suggestIndexList)
		})
	  },
	
	  clearSuggestArea: function() {
		this.suggestArea.innerHTML = '';
		this.suggestArea.style.display = 'none';
		this.suggestList = null;
		this.suggestIndexList = null;
		this.activePosition = null;
	  },
	
	  createSuggestArea: function(resultList, self) {
		GM_log("1: " + resultList.length)
		var target = self ? self : this
	
		target.suggestList = [];
		target.inputValueBackup = target.input.value
	
		for (var i = 0, length = resultList.length; i < length; i++) {
		  GM_log("2: " + resultList[i]);
		  var element = document.createElement(target.listTagName);
		  element.innerHTML = resultList[i];
		  target.suggestArea.appendChild(element);
	
		  target._addEvent(element, 'click', target._bindEvent(target.listClick, i));
		  target._addEvent(element, 'mouseover', target._bindEvent(target.listMouseOver, i));
		  target._addEvent(element, 'mouseout', target._bindEvent(target.listMouseOut, i));
	
		  target.suggestList.push(element);
		}
	
		GM_log("3 " + target.suggestList)
		target.suggestArea.style.display = '';
	  },
	
	  getInputText: function() {
		return this.input.value;
	  },
	
	  setInputText: function(text) {
		this.input.value = text;
	  },
	
	  // key event
	  keyEvent: function(event) {
		if (!this.timerId) {
		  this.timerId = setTimeout(this._bind(this.checkLoop), this.interval);
		}
	
		if (this.dispAllKey && event.ctrlKey 
			&& this.getInputText() == ''
			&& !this.suggestList
			&& event.keyCode == Suggest.Key.DOWN) {
		  // dispAll
		  this._stopEvent(event);
		 // this.keyEventDispAll();
		} else if (event.keyCode == Suggest.Key.UP ||
				   event.keyCode == Suggest.Key.DOWN) {
		  // key move
		  if (this.suggestList && this.suggestList.length != 0) {
			this._stopEvent(event);
			this.keyEventMove(event.keyCode);
		  }
		} else if (event.keyCode == Suggest.Key.RETURN) {
		  // fix
		  if (this.suggestList && this.suggestList.length != 0) {
			this._stopEvent(event);
			this.keyEventReturn();
		  }
		} else if (event.keyCode == Suggest.Key.ESC) {
		  // cancel
		  if (this.suggestList && this.suggestList.length != 0) {
			this._stopEvent(event);
			this.keyEventEsc();
		  }
		} else {
		  this.keyEventOther(event);
		}
	  },
	
	  keyEventDispAll: function() {
		// init
		this.clearSuggestArea();
	
		this.oldText = this.getInputText();
	
		this.suggestIndexList = [];
		for (var i = 0, length = this.candidateList.length; i < length; i++) {
		  this.suggestIndexList.push(i);
		}
	
		this.createSuggestArea(this.candidateList);
	  },
	
	  keyEventMove: function(keyCode) {
		this.changeUnactive();
	
		if (keyCode == Suggest.Key.UP) {
		  // up
		  if (this.activePosition == null) {
			this.activePosition = this.suggestList.length -1;
		  }else{
			this.activePosition--;
			if (this.activePosition < 0) {
			  this.activePosition = null;
			  this.input.value = this.inputValueBackup;
			  return;
			}
		  }
		}else{
		  // down
		  if (this.activePosition == null) {
			this.activePosition = 0;
		  }else{
			this.activePosition++;
		  }
	
		  if (this.activePosition >= this.suggestList.length) {
			this.activePosition = null;
			this.input.value = this.inputValueBackup;
			return;
		  }
		}
	
		this.changeActive(this.activePosition);
	  },
	
	  keyEventReturn: function() {
		this.clearSuggestArea();
		this.moveEnd();
	  },
	
	  keyEventEsc: function() {
		this.clearSuggestArea();
		this.input.value = this.inputValueBackup;
		this.oldText = this.getInputText();
		if (window.opera) setTimeout(this._bind(this.moveEnd), 5);
	  },
	
	  keyEventOther: function(event) {},
	
	  changeActive: function(index) {
		this.setStyleActive(this.suggestList[index]);
		this.setInputText(this.candidateList[this.suggestIndexList[index]]);
		this.oldText = this.getInputText();
		this.input.focus();
	  },
	
	  changeUnactive: function() {
		if (this.suggestList != null 
			&& this.suggestList.length > 0
			&& this.activePosition != null) {
		  this.setStyleUnactive(this.suggestList[this.activePosition]);
		}
	  },
	
	  listClick: function(event, index) {
		this.changeUnactive();
		this.activePosition = index;
		this.changeActive(index);
		this.moveEnd();
	  },
	
	  listMouseOver: function(event, index) {
		this.setStyleMouseOver(this._getEventElement(event));
	  },
	
	  listMouseOut: function(event, index) {
		if (!this.suggestList) return;
		var element = this._getEventElement(event);
		if (index == this.activePosition) {
		  this.setStyleActive(element);
		}else{
		  this.setStyleUnactive(element);
		}
	  },
	
	  setStyleActive: function(element) {
		element.className = this.classSelect;
	  },
	
	  setStyleUnactive: function(element) {
		element.className = '';
	  },
	
	  setStyleMouseOver: function(element) {
		element.className = this.classMouseOver;
	  },
	
	  moveEnd: function() {
		if (this.input.createTextRange) {
		  this.input.focus(); // Opera
		  var range = this.input.createTextRange();
		  range.move('character', this.input.value.length);
		  range.select();
		} else if (this.input.setSelectionRange) {
		  this.input.setSelectionRange(this.input.value.length, this.input.value.length);
		}
	  },
	
	  // Utils
	  _getElement: function(element) {
		return (typeof element == 'string') ? document.getElementById(element) : element;
	  },
	  _addEvent: (window.addEventListener ?
		function(element, type, func) {
		  element.addEventListener(type, func, false);
		} :
		function(element, type, func) {
		  element.attachEvent('on' + type, func);
		}),
	  _stopEvent: function(event) {
		if (event.preventDefault) {
		  event.preventDefault();
		  event.stopPropagation();
		} else {
		  event.returnValue = false;
		  event.cancelBubble = true;
		}
	  },
	  _getEventElement: function(event) {
		return event.target || event.srcElement;
	  },
	  _bind: function(func) {
		var self = this;
		var args = Array.prototype.slice.call(arguments, 1);
		return function(){ func.apply(self, args); };
	  },
	  _bindEvent: function(func) {
		var self = this;
		var args = Array.prototype.slice.call(arguments, 1);
		return function(event){ event = event || window.event; func.apply(self, [event].concat(args)); };
	  },
	  _escapeHTML: function(value) {
		return value.replace(/\&/g, '&amp;').replace( /</g, '&lt;').replace(/>/g, '&gt;')
				 .replace(/\"/g, '&quot;').replace(/\'/g, '&#39;');
	  },
	  _take: function(list, num) {
	    var newList = []
		for (var i = 0; i < num && i < list.length; i++) {
	      newList.push(list[i]) 
		}
		return newList
	  }
	};
	
	// --------------------------------------------------------------
	
})()
