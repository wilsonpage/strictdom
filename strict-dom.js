!(function() {

'use strict';

var debug = 0 ? console.log.bind(console, '[strict-dom]') : function() {};

var FORBIDDEN = 0;
var READ = 1;
var WRITE = 2;
var ACCESSOR = 3;
var VALUE = 4;
var INLINE_STYLE = 5;
var COMPUTED_STYLE = 6;
var CLASS_LIST = 7;
var DATASET = 8;

/**
 * Crude webkit test.
 *
 * @type {Boolean}
 */
var isWebkit = !!window.webkitURL;

var PrototypeProperties = window.ppp = {
  Document: {
    execCommand: WRITE,
    elementFromPoint: READ,
    elementsFromPoint: READ,
    scrollingElement: READ,
    // write: FORBIDDEN,
    // writeln: FORBIDDEN,
    // open: FORBIDDEN,
    // close: FORBIDDEN
  },

  Node: {
    appendChild: {
      type: WRITE,
      test: function(dom, parent, args) {
        var inDocument = document.contains(parent) || document.contains(args[0]);
        return !inDocument || dom.is('write');
      }
    },

    removeChild: {
      type: WRITE,
      test: function(dom, parent, args) {
        var inDocument = document.contains(parent) || document.contains(args[0]);
        return !inDocument || dom.is('write');
      }
    },

    insertBefore: {
      type: WRITE,
      test: function(dom, parent, args) {
        var inDocument = document.contains(parent) || document.contains(args[0]);
        return !inDocument || dom.is('write');
      }
    },

    textContent: WRITE
  },

  Element: {
    scrollIntoView: WRITE,
    scrollBy: WRITE,
    scrollTo: WRITE,
    getClientRects: READ,
    getBoundingClientRect: READ,
    // computedRole: ACCESSOR,
    // computedName: ACCESSOR,
    clientLeft: READ,
    clientWidth: READ,
    clientHeight: READ,
    scrollLeft: ACCESSOR,
    scrollTop: ACCESSOR,
    scrollWidth: READ,
    scrollHeight: READ,
    innerHTML: WRITE,
    outerHTML: WRITE,
    insertAdjacentHTML: WRITE,
    remove: WRITE,
    setAttribute: WRITE,
    removeAttribute: WRITE,
    // attributes: FORBIDDEN,
    className: WRITE,
    classList: CLASS_LIST,
  },

  HTMLElement: {
    offsetLeft: READ,
    offsetTop: READ,
    offsetWidth: READ,
    offsetHeight: READ,
    offsetParent: READ,
    innerText: ACCESSOR,
    outerText: ACCESSOR,
    focus: READ,
    blur: READ,
    style: INLINE_STYLE,
    // dataset: DATASET,
  },

  CharacterData: {
    remove: WRITE,
    data: WRITE
  },

  Range: {
    getClientRects: { type: READ },
    getBoundingClientRect: READ
  },

  // MouseEvent: {
  //   layerX: { type: READ },
  //   layerY: { type: READ },
  //   offsetX: { type: READ },
  //   offsetY: { type: READ },
  // },

  // HTMLButtonElement: [
  //   ['reportValidity', READ]
  // ],

  // HTMLDialogElement: [
  //   ['showModal', WRITE]
  // ],

  // HTMLFieldSetElement: [
  //   ['reportValidity', READ]
  // ],

  // HTMLImageElement: [
  //   ['width', ACCESSOR],
  //   ['height', ACCESSOR],
  //   ['x', ACCESSOR],
  //   ['y', ACCESSOR]
  // ],

  // HTMLInputElement: [
  //   ['reportValidity', READ]
  // ],

  // HTMLKeygenElement: [
  //   ['reportValidity', READ]
  // ],

  // // TODO(esprehn): This doesn't really work, you can just do style.width to
  // // force a layout, we need to overwrite getComputedStyle, but since you can
  // // also save the return value we need to also probably make it reutrn a
  // // wrapper.
  // CSSStyleDeclaration: [
  //   ['getPropertyValue', READ]
  // ],

  // SVGSVGElement: [
  //   ['currentScale', ACCESSOR]
  // ]
};

var InstanceProperties = {
  window: {
    innerWidth: {
      type: isWebkit ? VALUE : READ,
      test: function(dom) {
        var inIframe = window !== window.top;
        if (!inIframe || dom.is('read')) return true;
        throw error(2, '`.innerWidth` (in iframe)');
      }
    },

    innerHeight: {
      type: isWebkit ? VALUE : READ,
      test: function(dom) {
        var inIframe = window !== window.top;
        if (!inIframe || dom.is('read')) return true;
        if (!pass) throw error(2, '`.innerHeight` (in iframe)');
      }
    },

    scrollX: isWebkit ? VALUE : READ,
    scrollY: isWebkit ? VALUE : READ,
    scrollBy: WRITE,
    scrollTo: WRITE,
    scroll: WRITE,
    // alert: FORBIDDEN,
    // prompt: FORBIDDEN,
    // confirm: FORBIDDEN,
    // find: FORBIDDEN,
    // getMatchedCSSRules: FORBIDDEN,
    getComputedStyle: {
      type: READ,
      test: function(dom, win, args) {
        return dom.can('read', args[0]);
      }
    }
  }
};



function StrictDom(win) {
  this.descriptors = {};
  this.win = win;
  this.enable();
}

StrictDom.prototype = {
  constructor: StrictDom,

  mode: function(value) {
    debug('set mode', value);
    this._mode = value;
  },

  is: function(value) {
    return this._mode === value;
  },

  not: function(value) {
    return !this.is(value);
  },

  can: function(mode, ctx) {
    ctx = ctx || window;
    var attached = ctx === window || document.contains(ctx);
    return !attached || this._mode == mode;
  },

  cant: function(mode, el) {
    return !this.can(mode, el);
  },

  enable: function() {
    debug('enable');
    this.wrapPrototypeProperties();
    this.wrapInstanceProperties();
  },

  disable: function() {
    this.unwrapProperties(PrototypeProperties);
    this.unwrapProperties(InstanceProperties);
  },

  normalizeData: function(object, prop) {
    var data = object[prop];
    var result = typeof data === 'object'
      ? data
      : object[prop] = { type: data };

    result.name = prop;
    return result;
  },

  wrapPrototypeProperties: function() {
    var props = PrototypeProperties;

    for (var key in props) {
      for (var name in props[key]) {
        var object = this.win[key] && this.win[key].prototype;
        if (!object) continue;

        var property = this.normalizeData(props[key], name);
        property.descriptor = this.getDescriptor(object, property);
        if (!property.descriptor) continue;

        var wrapped = this.wrapProperty(property);
        if (wrapped) Object.defineProperty(object, name, wrapped);
      }
    }
  },

  unwrapProperties: function(props) {
    for (var key in props) {
      for (var name in props[key]) {
        var object = this.win[key] && this.win[key].prototype;
        if (!object) continue;

        var property = props[key][name];
        if (!property.descriptor) continue;

        Object.defineProperty(object, name, property.descriptor);
      }
    }
  },

  wrapInstanceProperties: function() {
    debug('wrap instance properties');
    var props = InstanceProperties;

    for (var key in props) {
      for (var name in props[key]) {

        var object = this.win[key];
        if (!object || !(name in object)) continue;

        var property = this.normalizeData(props[key], name);
        property.descriptor = this.getDescriptor(object, property);
        if (!property.descriptor) continue;

        var wrapped = this.wrapProperty(property);
        if (wrapped) Object.defineProperty(object, name, wrapped);
      }
    }
  },

  unwrapInstanceProperties: function() {
    var props = InstanceProperties;

    for (var name in props) {
      for (var prop in props[name]) {
        var object = this.win[name];
        if (!object || !(name in object)) continue;

        var type = props[name][prop];
        var descriptor = this.getDescriptor(object, name, prop, type);
        if (!descriptor) continue;

        var wrapped = this.wrapProperty(descriptor, name, prop, type);
        if (wrapped) Object.defineProperty(object, prop, wrapped);
      }
    }
  },

  wrapProperty: function(property) {
    switch (property.type) {
      case ACCESSOR: return this.wrapAccessor(property);
      case WRITE: return this.wrapWrite(property);
      case READ: return this.wrapRead(property);
      case INLINE_STYLE: return this.wrapStyle(property);
      case CLASS_LIST: return this.wrapClassList(property);
      case VALUE: return this.wrapValue(property);
    }
  },

  getDescriptor: function(object, property) {
    if (property.type != VALUE) return getDescriptor(object, property.name);
    else if (object.hasOwnProperty(property.name)) return {};
  },

  unwrap: function() {

  },

  wrapAccessor: function(property) {
    var wrapped = this.wrapRead(property);
    return this.wrapWrite({
      property: name,
      descriptor: wrapped
    });
  },

  wrapRead: function(property) {
    debug('wrap read', property.name);

    var descriptor = property.descriptor;
    var clone = Object.assign({}, descriptor);
    var value = descriptor.value;
    var name = property.name;
    var self = this;

    if (typeof value == 'function') {
      clone.value = function() {
        debug('read', name);
        test(this, arguments);
        return value.apply(this, arguments);
      };
    } else if (descriptor.get) {
      var get = descriptor.get;
      clone.get = function() {
        debug('read', name);
        test(this, arguments);
        return get.apply(this, arguments);
      };
    }

    function test(ctx, args) {
      var result = property.test
        ? property.test(self, ctx, args)
        : self.can('read', ctx);

      if (!result) throw error(2, name);
    }

    return clone;
  },

  wrapWrite: function(property) {
    debug('wrap write', property.name);

    var name = property.name;
    var descriptor = property.descriptor;
    var clone = Object.assign({}, descriptor);
    var value = descriptor.value;
    var self = this;

    if (typeof value == 'function') {
      clone.value = function() {
        test(this, arguments);
        return value.apply(this, arguments);
      };
    } else if (descriptor.set) {
      clone.set = function() {
        test(this, arguments);
        return descriptor.set.apply(this, arguments);
      };
    }

    function test(ctx, args) {
      debug('test write', name, property.test);
      var result = property.test
        ? property.test(self, ctx, args)
        : self.can('write', ctx);

      if (!result) throw error(3, name);
    }

    return clone;
  },

  wrapValue: function(property) {
    debug('wrap value', property.name);

    var descriptor = property.descriptor;
    var name = property.name;
    var self = this;

    // Some properties are actually on the instance of objects and we need
    // to replace them with accessors which magically delete themselves on
    // access, call into the v8 interceptor, and then add themselves back.
    // This won't be fast, but these are rarely accessed so it should be fine.
    descriptor.get = function() {
      debug('get value', name);
      test(this, arguments);
      delete this[name];
      var result = this[name];
      Object.defineProperty(this, name, descriptor);
      return result;
    };

    function test(ctx, args) {
      var result = property.test
        ? property.test(self, ctx, args)
        : self.can('read', ctx);

      if (!result) throw error(2, name);
    }

    return descriptor;
  },

  wrapStyle: function(property) {
    var self = this;
    var clone = Object.assign({}, property.descriptor);
    clone.get = function() { return new Style(this, self); };
    return clone;
  },

  wrapClassList: function(property) {
    var self = this;
    var clone = Object.assign({}, property.descriptor);
    clone.get = function() { return new ClassList(this, self); };
    return clone;
  }
};

function Style(el, dom) {
  this.dom = dom;
  this.el = el;
}

Style.prototype = {
  _getter: getDescriptor(HTMLElement.prototype, 'style').get,
  _get: function() {
    return this._getter.call(this.el);
  },

  setProperty: function(key, value) {
    if (this.dom.cant('write', this.el)) throw error(1, 'style.' + key);
    return this._get()[key] = value;
  },

  removeProperty: function(key) {
    if (this.dom.cant('write', this.el)) throw error(1, 'style.' + key);
    return this._get().removeProperty(key);
  }
};

(function addDynamicProperties() {
  var styles = document.createElement('div').style;
  var proto = {};

  for (var key in styles) {
    if (styles[key] === '') {
      Object.defineProperty(Style.prototype, key, {
        get: getter(key),
        set: setter(key)
      });
    }
  }

  [
    'item',
    'getPropertyValue',
    'getPropertyCSSValue',
    'getPropertyPriority'
  ].forEach(function(method) {
    Style.prototype[method] = caller(method);
  });

  function getter(key) {
    return function() {
      return this._get()[key];
    };
  }

  function setter(key) {
    return function(value) {
      if (this.dom.cant('write', this.el)) throw error(1, 'style.' + key);
      return this.setProperty(key, value);
    };
  }

  function caller(key) {
    return function() {
      var style = this._get();
      return style[key].apply(style, arguments);
    };
  }

  return proto;
})();

function ClassList(el, dom) {
  this.dom = dom;
  this.el = el;
}

ClassList.prototype = {
  _getter: getDescriptor(Element.prototype, 'classList').get,
  _get: function() {
    return this._getter.call(this.el);
  },

  add: function(className) {
    if (this.dom.cant('write', this.el)) throw error(1, 'class names');
    this._get().add(className);
  },

  contains: function(className) {
    return this._get().contains(className);
  },

  remove: function(className) {
    if (this.dom.cant('write', this.el)) throw error(1, 'class names');
    this._get().remove(className);
  },

  toggle: function() {
    if (this.dom.cant('write', this.el)) throw error(1, 'class names');
    var classList = this._get();
    return classList.toggle.apply(classList, arguments);
  }
};

/**
 * Exports
 */

window.strictDom = new StrictDom(window);

/**
 * Utils
 */

function error(type) {
  return new Error({
    1: 'Can only set ' + arguments[1] + ' during \'write\' phase',
    2: 'Can only get ' + arguments[1] + ' during \'read\' phase',
    3: 'Can only call `.' + arguments[1] + '()` during \'write\' phase',
    4: arguments[1] + ' is forbidden'
  }[type]);
}

function getDescriptor(object, prop) {
  return Object.getOwnPropertyDescriptor(object, prop);
}

})();
