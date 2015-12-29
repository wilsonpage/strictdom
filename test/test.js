/*global assert, suite, setup, test, teardown, strictdom*/
/*jshint maxlen:false*/

suite('strictdom', function() {
  var winWidth = window.innerWidth;
  var dom;

  setup(function() {
    dom = document.createElement('div');
    document.body.style.margin = 0;
    document.body.appendChild(dom);
    strictdom.enable();
    strictdom.phase(null);
  });

  teardown(function() {
    strictdom.disable();
    dom.remove();
  });

  suite('Node', function() {
    var el1;

    setup(function() {
      el1 = createElement('<div>');
    });

    test('appendChild', function() {
      var el2 = document.createElement('span');

      testWrite(function() { el1.appendChild(el2); });
      assert.isTrue(el1.contains(el2));

      var el3 = document.createElement('span');

      strictdom.phase('write', function() {
        el1.remove();
      });

      testWriteDetached(function() { el1.appendChild(el3); });
      assert.isTrue(el1.contains(el3));
    });

    suite('removeChild', function() {
      var el2;

      setup(function() {
        el2 = document.createElement('span');
        strictdom.phase('write', function() {
          el1.appendChild(el2);
        });
      });

      test('attached', function() {
        testWrite(function() {
          el1.removeChild(el2);
        });

        assert.isFalse(el1.contains(el2));
      });

      test('detached', function() {
        strictdom.phase('write', function() {
          el1.remove();
        });

        testWriteDetached(function() {
          el1.removeChild(el2);
        });

        assert.isFalse(el1.contains(el2));
      });
    });
  });

  suite('Element', function() {
    var el;

    setup(function() {
      el = createElement('<div>');
    });

    test('.clientLeft', function() {
      var result = testRead(function() { return el.clientLeft; });
      assert.equal(result, 0);
    });

    test('.scrollTop', function() {
      var result = testRead(function() { return el.scrollTop; });
      testWrite(function() { el.scrollTop = 10; });
      assert.equal(result, 0);
    });

    test('.scrollLeft', function() {
      var result = testRead(function() { return el.scrollLeft; });
      testWrite(function() { el.scrollLeft = 10; });
      assert.equal(result, 0);
    });

    test('.innerHTML', function() {
      var result = testWrite(function() {
        return el.innerHTML = '<h1>foo</h1>';
      });

      assert.equal(result, '<h1>foo</h1>');
      result = el.innerHTML;
      assert.equal(result, '<h1>foo</h1>');
    });

    test('.outerHTML', function() {
      var el2;

      strictdom.phase('write', function() {
        el2 = document.createElement('div');
        el.appendChild(el2);
      });

      var result = testWrite(function() {
        return el2.outerHTML = '<h1>foo</h1>';
      });

      assert.equal(result, '<h1>foo</h1>');
      result = el.outerHTML;
      assert.equal(result, '<div><h1>foo</h1></div>');
    });

    test('.remove()', function() {
      strictdom.phase('write', function() {
        dom.appendChild(el);
        assert.isTrue(dom.contains(el));
      });

      testWrite(function() { el.remove(); });
      assert.isFalse(dom.contains(el));
    });
  });

  suite('HTMLElement', function() {
    var el;

    setup(function() {
      el = createElement('<div style="width:100px;height:50px">');
    });

    test('.offsetWidth', function() {
      var result = testRead(function() { return el.offsetWidth; });
      assert.equal(result, 100);
    });

    test('.offsetHeight', function() {
      var result = testRead(function() { return el.offsetHeight; });
      assert.equal(result, 50);
    });

    test('.offsetLeft', function() {
      strictdom.phase('write', function() {
        el.style.marginLeft = '50px';
      });

      var result = testRead(function() { return el.offsetLeft; });
      assert.equal(result, 50);
    });

    test('.offsetTop', function() {
      strictdom.phase('write');
      el.style.marginTop = '10px';
      strictdom.phase(null);

      var result = testRead(function() { return el.offsetTop; });
      assert.equal(result, 10);
    });

    suite('.style', function() {
      test('.height', function() {
        testWrite(function() { el.style.height = '100px'; });
        assert.equal(el.style.height, '100px');
      });

      test('.getPropertyValue()', function() {
        testWrite(function() { el.style.height = '100px'; });
        assert.equal(el.style.getPropertyValue('height'), '100px');
      });

      test('.removeProperty()', function() {
        testWrite(function() { el.style.height = '100px'; });
        assert.equal(el.style.getPropertyValue('height'), '100px');

        testWrite(function() { el.style.removeProperty('height'); });
        assert.equal(el.style.getPropertyValue('height'), '');
      });

      test('.setProperty()', function() {
        testWrite(function() { el.style.setProperty('height', '100px'); });
        assert.equal(el.style.height, '100px');
      });
    });
  });

  suite('Range', function() {
    var el;

    setup(function() {
      el = createElement('<div style="width:100px;height:100px"></div>');
    });

    test('.getBoundingClientRect()', function() {
      var result = testRead(function() { return el.getBoundingClientRect(); });
      assert.equal(result.width, 100);
    });

    test('.getClientRects()', function() {
      var result = testRead(function() { return el.getClientRects(); });
      assert.equal(result[0].width, 100);
    });
  });

  suite('CharacterData', function() {
    var textNode;
    var el;

    setup(function() {
      el = createElement('<div>foo</div>');
      textNode = el.firstChild;
    });

    test('.data', function() {
      testWrite(function() { return textNode.data = 'bar'; });
      assert.equal(el.textContent, 'bar');
    });

    test('.remove()', function() {
      testWrite(function() { return textNode.remove(); });
      assert.equal(el.textContent, '');
    });
  });

  suite('HTMLImageElement', function() {
    var width = 512;
    var height = 532;
    var el;

    setup(function(done) {
      el = createElement('<img src="/base/test/lib/firefox.png"/>');
      el.onload = function() { done(); };
    });

    test('.width', function() {
      var result = testRead(function() { return el.width; });
      assert.equal(result, width);
      testWrite(function() { el.width = 100; });
      result = testRead(function() { return el.width; });
      assert.equal(result, 100);
    });

    test('.height', function() {
      var result = testRead(function() { return el.height; });
      assert.equal(result, height);
      testWrite(function() { el.height = 50; });
      result = testRead(function() { return el.height; });
      assert.equal(result, 50);
    });

    test('.x', function() {
      strictdom.phase('write', function() {
        el.style.marginLeft = '50px';
      });

      var result = testRead(function() { return el.x; });
      assert.equal(result, 50);
    });

    test('.y', function() {
      strictdom.phase('write', function() {
        el.style.marginLeft = '50px';
      });

      var result = testRead(function() { return el.x; });
      assert.equal(result, 50);
    });
  });

  suite('classList', function() {
    var el;

    setup(function() {
      el = createElement('<div class="foo">');
    });

    test('.add()', function() {
      testWrite(function() { return el.classList.add('bar'); });
      assert.equal(el.className, 'foo bar');
    });

    test('.remove()', function() {
      testWrite(function() { return el.classList.remove('foo'); });
      assert.equal(el.className, '');
    });

    test('.toggle()', function() {
      testWrite(function() { return el.classList.toggle('bar'); });
      assert.equal(el.className, 'foo bar');

      testWrite(function() { return el.classList.toggle('foo'); });
      assert.equal(el.className, 'bar');

      testWrite(function() { return el.classList.toggle('foo', false); });
      assert.equal(el.className, 'bar');

      testWrite(function() { return el.classList.toggle('foo', true); });
      assert.equal(el.className, 'bar foo');
    });

    test('.contains()', function() {
      assert.isTrue(el.classList.contains('foo'));
    });
  });

  suite('window', function() {
    var el;

    setup(function() {
      el = createElement('<div style="height:100px">');
    });

    test('.getComputedStyle()', function() {
      var result = testRead(function() { return getComputedStyle(el); });
      assert.equal(result.height, '100px');
    });

    test('.scrollBy()', function() {
      testWrite(function() { return scrollBy(1, 1); });
    });

    test('.scrollTo()', function() {
      testWrite(function() { return scrollTo(1, 1); });
    });

    test('.scroll()', function() {
      testWrite(function() { return scroll(1, 1); });
    });

    // Haven't found a way of testing this
    // yet as Karma runs tests inside an iframe
    test('.innerWidth (iframe)', function() {
      var result = testRead(function() { return window.innerWidth; });
      assert.equal(result, winWidth);
    });

    test.skip('.innerWidth (iframe)', function(done) {
      var iframe = document.createElement('iframe');
      var width = 100;

      iframe.src = '/base/test/lib/iframe.html';
      iframe.style.width = width + 'px';

      iframe.onload = function() {
        iframe.contentWindow.postMessage({ script: 'window.innerWidth;' }, '*');
        addEventListener('message', function fn(e) {
          if (!e.data.result) return;
          removeEventListener('message', fn);

          // Expect it to throw
          assert.include(e.data.result.error, 'read');

          iframe.contentWindow.postMessage({
            script: 'strictdom.phase(\'read\'); window.innerWidth;'
          }, '*');

          addEventListener('message', function fn(e) {
            if (!e.data.result) return;
            removeEventListener('message', fn);
            assert.equal(e.data.result, width);
            done();
          });
        });
      };

      strictdom.phase('write', function() {
        dom.appendChild(iframe);
      });
    });
  });

  suite('.phase()', function() {
    test('it only accepts known phases', function() {
      strictdom.phase('write');
      strictdom.phase('read');
      strictdom.phase(null);

      assert.throws(function() {
        strictdom.phase('boogies');
      });
    });

    test('returns the current phase when no arguments given', function() {
      strictdom.phase('write');
      assert.equal(strictdom.phase(), 'write');
    });

    test('when given a sync phase-task it reverts to the previous phase after', function() {
      strictdom.phase('read');
      assert.equal(strictdom.phase(), 'read');

      strictdom.phase('write', function() {
        assert.equal(strictdom.phase(), 'write');
        // do mutations ...
      });

      assert.equal(strictdom.phase(), 'read');
    });
  });

  suite('.disable()', function() {
    test('it stops observing', function() {
      assert.throws(function() {
        window.innerWidth;
      });

      strictdom.disable();

      assert.doesNotThrow(function() {
        window.innerWidth;
      });
    });
  });

  function testWrite(fn) {
    var result;

    strictdom.phase(null);
    assert.throws(fn);
    strictdom.phase('read');
    assert.throws(fn);
    strictdom.phase('write');
    assert.doesNotThrow(function() { result = fn(); });
    strictdom.phase(null);

    return result;
  }

  function testWriteDetached(fn) {
    var result;

    strictdom.phase('read');
    result = fn();
    strictdom.phase(null);

    return result;
  }

  function testRead(fn) {
    var result;

    strictdom.phase(null);
    assert.throws(fn);
    strictdom.phase('write');
    assert.throws(fn);
    strictdom.phase('read');
    assert.doesNotThrow(function() { result = fn(); });

    return result;
  }

  function createElement(html) {
    return strictdom.phase('write', function() {
      var parent = document.createElement('div');
      parent.innerHTML = html;
      var el = parent.firstElementChild;
      dom.appendChild(el);
      return el;
    });
  }
});
