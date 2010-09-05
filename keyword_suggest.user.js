// ==UserScript==
// @name           keyword_suggest
// @namespace      http://d.hatena.ne.jp/fumokmm/
// @description    Keyword Suggest
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
		
	var sug
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
		var start = function(){ sug = new Suggest.Local("keywordInput", "suggest", []) }
		window.addEventListener ?
			window.addEventListener('load', start, false) :
			window.attachEvent('onload', start)
			
		window.setInterval(function(){ requestKeywordList() }, 500)
	}
	
	function requestKeywordList() {
		if (searchKeyword != keywordInput.value) {
			searchKeyword = keywordInput.value
			GM_xmlhttpRequest({
				method: 'GET',
				url   : 'http://h.hatena.ne.jp/api/keywords/list.json?word=' + searchKeyword,
				onload: function(httpObj) {
					var newList = resultToList(eval(httpObj.responseText))
					for (var i = 0; i < sug.candidateList.length; i++) newList.push(sug.candidateList[i])
					sug.candidateList = newList.unique()
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
	
		// init
		this.clearSuggestArea();
	
		var text = this.getInputText();
	
		if (text == '' || text == null) return;
	
		this.hookBeforeSearch(text);
		var resultList = this._search(text);
		if (resultList.length != 0) this.createSuggestArea(resultList);
	  },
	
	  _search: function(text) {
	
		var resultList = [];
		var temp; 
		this.suggestIndexList = [];
	
		for (var i = 0, length = this.candidateList.length; i < length; i++) {
		  if ((temp = this.isMatch(this.candidateList[i], text)) != null) {
			resultList.push(temp);
			this.suggestIndexList.push(i);
	
			if (this.dispMax != 0 && resultList.length >= this.dispMax) break;
		  }
		}
		return resultList;
	  },
	
	  isMatch: function(value, pattern) {
	
		if (value == null) return null;
	
		var pos = (this.ignoreCase) ?
		  value.toLowerCase().indexOf(pattern.toLowerCase())
		  : value.indexOf(pattern);
	
		if ((pos == -1) || (this.prefix && pos != 0)) return null;
	
		if (this.highlight) {
		  return (this._escapeHTML(value.substr(0, pos)) + '<strong>' 
				 + this._escapeHTML(value.substr(pos, pattern.length)) 
				   + '</strong>' + this._escapeHTML(value.substr(pos + pattern.length)));
		} else {
		  return this._escapeHTML(value);
		}
	  },
	
	  clearSuggestArea: function() {
		this.suggestArea.innerHTML = '';
		this.suggestArea.style.display = 'none';
		this.suggestList = null;
		this.suggestIndexList = null;
		this.activePosition = null;
	  },
	
	  createSuggestArea: function(resultList) {
	
		this.suggestList = [];
		this.inputValueBackup = this.input.value;
	
		for (var i = 0, length = resultList.length; i < length; i++) {
		  var element = document.createElement(this.listTagName);
		  element.innerHTML = resultList[i];
		  this.suggestArea.appendChild(element);
	
		  this._addEvent(element, 'click', this._bindEvent(this.listClick, i));
		  this._addEvent(element, 'mouseover', this._bindEvent(this.listMouseOver, i));
		  this._addEvent(element, 'mouseout', this._bindEvent(this.listMouseOut, i));
	
		  this.suggestList.push(element);
		}
	
		this.suggestArea.style.display = '';
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
		  this.keyEventDispAll();
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
	  }
	};
	
	/*-- Suggest.LocalMulti ---------------------------------*/
	Suggest.LocalMulti = function() {
	  this.initialize.apply(this, arguments);
	};
	Suggest.copyProperties(Suggest.LocalMulti.prototype, Suggest.Local.prototype);
	
	Suggest.LocalMulti.prototype.delim = ' '; // delimiter
	
	Suggest.LocalMulti.prototype.keyEventReturn = function() {
	
	  this.clearSuggestArea();
	  this.input.value += this.delim;
	  this.moveEnd();
	};
	
	Suggest.LocalMulti.prototype.keyEventOther = function(event) {
	
	  if (event.keyCode == Suggest.Key.TAB) {
		// fix
		if (this.suggestList && this.suggestList.length != 0) {
		  this._stopEvent(event);
	
		  if (!this.activePosition) {
			this.activePosition = 0;
			this.changeActive(this.activePosition);
		  }
	
		  this.clearSuggestArea();
		  this.input.value += this.delim;
		  if (window.opera) {
			setTimeout(this._bind(this.moveEnd), 5);
		  } else {
			this.moveEnd();
		  }
		}
	  }
	};
	
	Suggest.LocalMulti.prototype.listClick = function(event, index) {
	
	  this.changeUnactive();
	  this.activePosition = index;
	  this.changeActive(index);
	
	  this.input.value += this.delim;
	  this.moveEnd();
	};
	
	Suggest.LocalMulti.prototype.getInputText = function() {
	
	  var pos = this.getLastTokenPos();
	
	  if (pos == -1) {
		return this.input.value;
	  } else {
		return this.input.value.substr(pos + 1);
	  }
	};
	
	Suggest.LocalMulti.prototype.setInputText = function(text) {
	
	  var pos = this.getLastTokenPos();
	
	  if (pos == -1) {
		this.input.value = text;
	  } else {
		this.input.value = this.input.value.substr(0 , pos + 1) + text;
	  }
	};
	
	Suggest.LocalMulti.prototype.getLastTokenPos = function() {
	  return this.input.value.lastIndexOf(this.delim);
	};
	
	// --------------------------------------------------------------
	
})()
