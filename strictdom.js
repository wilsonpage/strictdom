!(function() {
'use strict';

var debug = 0 ? console.log.bind(console, '[strictdom]') : function() {};

/**
 * Crude webkit test.
 *
 * @type {Boolean}
 */
var isWebkit = !!window.webkitURL;

/**
 * List of properties observed.
 *
 * @type {Object}
 */
var properties = {
  prototype: {
    Document: {
      execCommand: Write,
      elementFromPoint: Read,
      elementsFromPoint: Read,
      scrollingElement: Read
    },

    Node: {
      appendChild: {
        type: Write,
        test: function(dom, parent, args) {
          var attached = isAttached(parent) || isAttached(args[0]);
          if (attached && dom.not('write')) throw error(3, this.name);
        }
      },

      insertBefore: {
        type: Write,
        test: function(dom, parent, args) {
          var attached = isAttached(parent) || isAttached(args[0]);
          if (attached && dom.not('write')) throw error(3, this.name);
        }
      },

      removeChild: {
        type: Write,
        test: function(dom, parent, args) {
          var attached = isAttached(parent) || isAttached(args[0]);
          if (attached && dom.not('write')) throw error(3, this.name);
        }
      },

      textContent: Write
    },

    Element: {
      scrollIntoView: Write,
      scrollBy: Write,
      scrollTo: Write,
      getClientRects: Read,
      getBoundingClientRect: Read,
      clientLeft: Read,
      clientWidth: Read,
      clientHeight: Read,
      scrollLeft: Accessor,
      scrollTop: Accessor,
      scrollWidth: Read,
      scrollHeight: Read,
      innerHTML: Write,
      outerHTML: Write,
      insertAdjacentHTML: Write,
      remove: Write,
      setAttribute: Write,
      removeAttribute: Write,
      className: Write,
      classList: ClassList
    },

    HTMLElement: {
      offsetLeft: Read,
      offsetTop: Read,
      offsetWidth: Read,
      offsetHeight: Read,
      offsetParent: Read,
      innerText: Accessor,
      outerText: Accessor,
      focus: Read,
      blur: Read,
      style: Style,

      // `element.dataset` is hard to wrap.
      // We could use `Proxy` but it's not
      // supported in Chrome yet. Not too
      // concerned as `data-` attributes are
      // not often associated with render.
      // dataset: DATASET
    },

    CharacterData: {
      remove: Write,
      data: Write
    },

    Range: {
      getClientRects: Read,
      getBoundingClientRect: Read
    },

    MouseEvent: {
      layerX: Read,
      layerY: Read,
      offsetX: Read,
      offsetY: Read
    },

    HTMLButtonElement: {
      reportValidity: Read
    },

    HTMLDialogElement: {
      showModal: Write
    },

    HTMLFieldSetElement: {
      reportValidity: Read
    },

    HTMLImageElement: {
      width: Accessor,
      height: Accessor,
      x: Read,
      y: Read
    },

    HTMLInputElement: {
      reportValidity: Read
    },

    HTMLKeygenElement: {
      reportValidity: Read
    },

    SVGSVGElement: {
      currentScale: Accessor
    }
  },

  instance: {
    window: {
      getComputedStyle: {
        type: Read,

        /**
         * Throws when the Element is in attached
         * and strictdom is not in the 'read' phase.
         *
         * @param  {StrictDom} strictdom
         * @param  {Window} win
         * @param  {Object} args
         */
        test: function(strictdom, win, args) {
          if (isAttached(args[0]) && strictdom.not('read')) {
            throw error(2, 'getComputedStyle');
          }
        }
      },

      innerWidth: {
        type: isWebkit ? Value : Read,

        /**
         * Throws when the window is nested (in <iframe>)
         * and StrictDom is not in the 'read' phase.
         *
         * @param  {StrictDom} strictdom
         */
        test: function(strictdom) {
          var inIframe = window !== window.top;
          if (inIframe && strictdom.not('read')) {
            throw error(2, '`.innerWidth` (in iframe)');
          }
        }
      },

      innerHeight: {
        type: isWebkit ? Value : Read,

        /**
         * Throws when the window is nested (in <iframe>)
         * and StrictDom is not in the 'read' phase.
         *
         * @param  {StrictDom} strictdom
         */
        test: function(strictdom) {
          var inIframe = window !== window.top;
          if (inIframe && strictdom.not('read')) {
            throw error(2, '`.innerHeight` (in iframe)');
          }
        }
      },

      scrollX: isWebkit ? Value : Read,
      scrollY: isWebkit ? Value : Read,
      scrollBy: Write,
      scrollTo: Write,
      scroll: Write,
    }
  }
};

/**
 * The master controller for all properties.
 *
 * @param {Window} win
 */
function StrictDom(win) {
  this.properties = [];
  this._phase = null;
  this.win = win;

  this.createPrototypeProperties();
  this.createInstanceProperties();
}

StrictDom.prototype = {

  /**
   * Set the current phase.
   * @param  {[type]} value [description]
   * @return {[type]}       [description]
   */
  phase: function(type, task) {
    if (!arguments.length) return this._phase;
    if (!this.knownPhase(type)) throw error(4, type);

    var previous = this._phase;
    this._phase = type;

    if (typeof task != 'function') return;

    var result = task();
    this._phase = previous;
    return result;
  },

  knownPhase: function(value) {
    return !!~['read', 'write', null].indexOf(value);
  },

  is: function(value) {
    return this._phase === value;
  },

  not: function(value) {
    return !this.is(value);
  },

  /**
   * Enable strict mode.
   *
   * @public
   */
  enable: function() {
    if (this.enabled) return;
    debug('enable');
    var i = this.properties.length;
    while (i--) this.properties[i].enable();
    this.enabled = true;
  },

  /**
   * Disable strict mode.
   *
   * @public
   */
  disable: function() {
    if (!this.enabled) return;
    debug('disable');
    var i = this.properties.length;
    while (i--) this.properties[i].disable();
    this.enabled = false;
    this.phase(null);
  },

  /**
   * Create wrappers for each of
   * of the prototype properties.
   *
   * @private
   */
  createPrototypeProperties: function() {
    debug('create prototype properties');
    var props = properties.prototype;
    for (var key in props) {
      for (var name in props[key]) {
        var object = this.win[key] && this.win[key].prototype;
        if (!object || !object.hasOwnProperty(name)) continue;
        this.properties.push(this.create(object, name, props[key][name]));
      }
    }
  },

  /**
   * Create wrappers for each of
   * of the instance properties.
   *
   * @private
   */
  createInstanceProperties: function() {
    debug('create instance properties');
    var props = properties.instance;
    for (var key in props) {
      for (var name in props[key]) {
        var object = this.win[key];
        if (!object || !object.hasOwnProperty(name)) continue;
        this.properties.push(this.create(object, name, props[key][name]));
      }
    }
  },

  /**
   * Create a wrapped `Property` that
   * can be individually enabled/disabled.
   *
   * @param  {Object} object - the parent object (eg. Node.prototype)
   * @param  {String} name - the property name (eg. 'appendChild')
   * @param  {(constructor|Object)} config - from the above property definition
   * @return {Property}
   */
  create: function(object, name, config) {
    debug('create', name);
    var Constructor = config.type || config;
    return new Constructor(object, name, config, this);
  }
};

/**
 * Create a new `Property`.
 *
 * A wrapper around a property that observes
 * usage, throwing errors when used in the
 * incorrect phase.
 *
 * @param {Object} object - the parent object (eg. Node.prototype)
 * @param {[type]} name - the property name (eg. 'appendChild')
 * @param {(constructor|Object)} config - from the above definition
 * @param {StrictDom} strictdom - injected as a dependency
 */
function Property(object, name, config, strictdom) {
  debug('Property', name, config);

  this.strictdom = strictdom;
  this.object = object;
  this.name = name;

  var descriptor = this.getDescriptor();

  // defaults can be overriden from config
  if (typeof config == 'object') Object.assign(this, config);

  this.descriptors = {
    unwrapped: descriptor,
    wrapped: this.wrap(descriptor)
  };
}

Property.prototype = {

  /**
   * Get the property's descriptor.
   *
   * @return {Object}
   * @private
   */
  getDescriptor: function() {
    debug('get descriptor', this.name);
    return Object.getOwnPropertyDescriptor(this.object, this.name);
  },

  /**
   * Enable observation by replacing the
   * current descriptor with the wrapped one.
   *
   * @private
   */
  enable: function() {
    debug('enable', this.name);
    Object.defineProperty(this.object, this.name, this.descriptors.wrapped);
  },

  /**
   * Disable observation by replacing the
   * current descriptor with the original one.
   *
   * @private
   */
  disable: function() {
    debug('disable', this.name);
    Object.defineProperty(this.object, this.name, this.descriptors.unwrapped);
  },

  // to be overwritten by subclass
  wrap: function() {}
};

/**
 * A wrapper for properties that read
 * geometry data from the DOM.
 *
 * Once a `Read` property is enabled
 * it can only be used when StrictDom
 * is in the 'read' phase, else it
 * will throw.
 *
 * @constructor
 * @extends Property
 */
function Read() {
  Property.apply(this, arguments);
}

Read.prototype = extend(Property, {

  /**
   * Return a wrapped descriptor.
   *
   * @param  {Object} descriptor
   * @return {Object}
   */
  wrap: function(descriptor) {
    debug('wrap read', this.name);

    var clone = Object.assign({}, descriptor);
    var value = descriptor.value;
    var get = descriptor.get;
    var self = this;

    if (typeof value == 'function') {
      clone.value = function() {
        debug('read', self.name);
        self.test(self.strictdom, this, arguments);
        return value.apply(this, arguments);
      };
    } else if (get) {
      clone.get = function() {
        debug('read', self.name);
        self.test(self.strictdom, this, arguments);
        return get.apply(this, arguments);
      };
    }

    return clone;
  },

  /**
   * Throws an Error if the element is attached
   * and StrictDOM is not in the 'read' phase.
   *
   * If methods/properties are used without
   * a context (eg. `getComputedStyle()` instead
   * of `window.getComputedStyle()`) we infer
   * a `window` context.
   *
   * @param  {StrictDom} strictdom
   * @param  {Node} ctx
   */
  test: function(strictdom, ctx) {
    if (isAttached(ctx || window) && strictdom.not('read')) {
      throw error(2, this.name);
    }
  }
});

/**
 * A wrapper for properties that write
 * to the DOM, triggering style/reflow
 * operations.
 *
 * Once a `Write` property is enabled
 * it can only be used when StrictDom
 * is in the 'read' phase, else it
 * will throw.
 *
 * @constructor
 * @extends Property
 */
function Write() {
  Property.apply(this, arguments);
}

Write.prototype = extend(Property, {

  /**
   * Return a wrapped descriptor.
   *
   * @param  {Object} descriptor
   * @return {Object}
   */
  wrap: function(descriptor) {
    debug('wrap write', this.name);

    var clone = Object.assign({}, descriptor);
    var value = descriptor.value;
    var self = this;

    if (typeof value == 'function') {
      clone.value = function() {
        self.test(self.strictdom, this, arguments);
        return value.apply(this, arguments);
      };
    } else if (descriptor.set) {
      clone.set = function() {
        self.test(self.strictdom, this, arguments);
        return descriptor.set.apply(this, arguments);
      };
    }

    return clone;
  },

  /**
   * Throws an Error if the element is attached
   * and StrictDOM is not in the 'write' phase.
   *
   * If methods/properties are used without
   * a context (eg. `getComputedStyle()` instead
   * of `window.getComputedStyle()`) we infer
   * a `window` context.
   *
   * @param  {StrictDom} strictdom
   * @param  {Node} ctx
   */
  test: function(strictdom, ctx) {
    if (isAttached(ctx || window) && strictdom.not('write')) {
      throw error(3, this.name);
    }
  }
});

/**
 * A wrapper for 'accessor' (get/set) properties.
 *
 * An `Accessor` should be used to wrap
 * properties that can both read and write
 * to the DOM (eg. `element.scrollTop`).
 *
 * @constructor
 * @extends Property
 */
function Accessor() {
  Property.apply(this, arguments);
}

Accessor.prototype = extend(Property, {

  /**
   * Return a wrapped descriptor.
   *
   * @param  {Object} descriptor
   * @return {Object}
   */
  wrap: function(descriptor) {
    debug('wrap accessor', this.name);

    var clone = Object.assign({}, descriptor);
    var get = descriptor.get;
    var set = descriptor.set;
    var self = this;

    if (get) {
      clone.get = function() {
        self.testRead(self.strictdom, this, arguments);
        return get.apply(this, arguments);
      };
    }

    if (descriptor.set) {
      clone.set = function() {
        self.testWrite(self.strictdom, this, arguments);
        return set.apply(this, arguments);
      };
    }

    return clone;
  },

  testRead: Read.prototype.test,
  testWrite: Write.prototype.test
});

/**
 * A wrapper for 'value' properties.
 *
 * A `Value` should be used to wrap special
 * values that like `window.innerWidth`, which
 * in Chrome (not Gecko) are not normal 'getter'
 * functions, but magical flat getters.
 *
 * Value wrappers are a for very special cases.
 *
 * @constructor
 * @extends Property
 */
function Value() {
  Property.apply(this, arguments);
}

Value.prototype = extend(Property, {

  /**
   * Calling `Object.getOwnDescriptor()` can
   * trigger a reflow as it returns the `value`
   * of the property. So here we just
   * return an empty object instead.
   *
   * @return {Object}
   * @private
   */
  getDescriptor: function() {
    return {};
  },

  /**
   * Value wrappers are disabled by simply
   * deleting them from the instance,
   * revealing the original descriptor.
   *
   * @private
   */
  disable: function() {
    delete this.object[this.name];
  },

  /**
   * Return a wrapped descriptor.
   *
   * `Value` properties are actually on the
   * instance of objects. To wrap them we need
   * to replace them with a getter which
   * deletes itself on access, call into the v8
   * interceptor, and then add themselves back.
   *
   * This won't be fast, but these are rarely
   * accessed so it should be fine.
   *
   * @param  {Object} descriptor
   * @return {Object}
   */
  wrap: function(descriptor) {
    debug('wrap value');
    var name = this.name;
    var self = this;

    descriptor.get = function() {
      debug('get value', name);
      self.test(self.strictdom, this, arguments);
      self.disable();
      var result = this[name];
      self.enable();
      return result;
    };

    return descriptor;
  },

  test: Read.prototype.test
});

function Style() {
  Property.apply(this, arguments);
}

Style.prototype = extend(Property, {
  wrap: function(descriptor) {
    debug('wrap style');
    var strictdom = this.strictdom;
    var clone = Object.assign({}, descriptor);
    clone.get = function() { return new StrictStyle(this, strictdom); };
    return clone;
  }
});

function ClassList() {
  Property.apply(this, arguments);
}

ClassList.prototype = extend(Property, {
  wrap: function(descriptor) {
    debug('wrap style');
    var strictdom = this.strictdom;
    var clone = Object.assign({}, descriptor);
    clone.get = function() { return new StrictClassList(this, strictdom); };
    return clone;
  }
});

function StrictStyle(el, strictdom) {
  this.strictdom = strictdom;
  this.el = el;
}

StrictStyle.prototype = {
  _getter: getDescriptor(HTMLElement.prototype, 'style').get,
  _get: function() {
    return this._getter.call(this.el);
  },

  setProperty: function(key, value) {
    var illegal = isAttached(this.el) && this.strictdom.not('write');
    if (illegal) throw error(1, 'style.' + key);
    return this._get()[key] = value;
  },

  removeProperty: function(key) {
    var illegal = isAttached(this.el) && this.strictdom.not('write');
    if (illegal) throw error(1, 'style.' + key);
    return this._get().removeProperty(key);
  }
};

// dynamically construct prototype
// from real element.style
(function() {
  var styles = document.createElement('div').style;
  var proto = {};

  for (var key in styles) {
    if (styles[key] === '') {
      Object.defineProperty(StrictStyle.prototype, key, {
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
    StrictStyle.prototype[method] = caller(method);
  });

  function getter(key) {
    return function() {
      return this._get()[key];
    };
  }

  function setter(key) {
    return function(value) {
      var illegal = isAttached(this.el) && this.strictdom.not('write');
      if (illegal) throw error(1, 'style.' + key);
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

function StrictClassList(el, strictdom) {
  this.strictdom = strictdom;
  this.el = el;
}

StrictClassList.prototype = {
  _getter: getDescriptor(Element.prototype, 'classList').get,
  _get: function() { return this._getter.call(this.el); },

  add: function(className) {
    var illegal = isAttached(this.el) && this.strictdom.not('write');
    if (illegal) throw error(1, 'class names');
    this._get().add(className);
  },

  contains: function(className) {
    return this._get().contains(className);
  },

  remove: function(className) {
    var illegal = isAttached(this.el) && this.strictdom.not('write');
    if (illegal) throw error(1, 'class names');
    this._get().remove(className);
  },

  toggle: function() {
    var illegal = isAttached(this.el) && this.strictdom.not('write');
    if (illegal) throw error(1, 'class names');
    var classList = this._get();
    return classList.toggle.apply(classList, arguments);
  }
};

/**
 * Utils
 */

function error(type) {
  return new Error({
    1: 'Can only set ' + arguments[1] + ' during \'write\' phase',
    2: 'Can only get ' + arguments[1] + ' during \'read\' phase',
    3: 'Can only call `.' + arguments[1] + '()` during \'write\' phase',
    4: 'Invalid phase: ' + arguments[1]
  }[type]);
}

function getDescriptor(object, prop) {
  return Object.getOwnPropertyDescriptor(object, prop);
}

function extend(parent, props) {
  return Object.assign(Object.create(parent.prototype), props);
}

function isAttached(el) {
  return el === window || document.contains(el);
}

/**
 * Exports
 */

// Only ever allow one `StrictDom` per document
var exports = window['strictdom'] = (window['strictdom'] || new StrictDom(window)); // jshint ignore:line

// CJS & AMD support
if ((typeof define)[0] == 'f') define(function() { return exports; });
else if ((typeof module)[0] == 'o') module.exports = exports;

})();
