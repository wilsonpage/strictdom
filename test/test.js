/*global strictDom */

suite('strict-dom', function() {
  var dom;

  setup(function() {
    strictDom.mode('write');
    dom = document.createElement('div');
    document.body.appendChild(dom);
    strictDom.mode('idle');
  });

  teardown(function() {
    strictDom.mode('write');
    // dom.remove();
    strictDom.mode('idle');
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

      strictDom.mode('write');
      el1.remove();
      strictDom.mode('idle');

      testWriteDetached(function() { el1.appendChild(el3); });
      assert.isTrue(el1.contains(el3));
    });

    suite('removeChild', function() {
      var el2;

      setup(function() {
        el2 = document.createElement('span');
        strictDom.mode('write');
        el1.appendChild(el2);
        strictDom.mode('idle');
      });

      test('attached', function() {
        testWrite(function() {
          el1.removeChild(el2);
        });

        assert.isFalse(el1.contains(el2));
      });

      test('detached', function() {
        strictDom.mode('write');
        el1.remove();
        strictDom.mode('idle');

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
      var result = testWrite(function() { return el.innerHTML = '<h1>foo</h1>'; });
      assert.equal(result, '<h1>foo</h1>');
      result = el.innerHTML;
      assert.equal(result, '<h1>foo</h1>');
    });

    test('.outerHTML', function() {
      strictDom.mode('write');
      var el2 = document.createElement('div');
      el.appendChild(el2);
      strictDom.mode('idle');

      var result = testWrite(function() { return el2.outerHTML = '<h1>foo</h1>'; });
      assert.equal(result, '<h1>foo</h1>');
      result = el.outerHTML;
      assert.equal(result, '<div><h1>foo</h1></div>');
    });

    test('.remove()', function() {
      strictDom.mode('write');
      dom.appendChild(el);
      assert.isTrue(dom.contains(el));
      strictDom.mode('idle');

      testWrite(function() { el.remove(); });
      assert.isFalse(dom.contains(el));
    });
  });

  suite('HTMLElement', function() {
    var el;

    setup(function() {
      el = createElement('<div>');
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
       testRead(function() { window.innerWidth; });
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
            script: 'strictDom.mode(\'read\'); window.innerWidth;'
          }, '*');

          addEventListener('message', function fn(e) {
            if (!e.data.result) return;
            removeEventListener('message', fn);
            assert.equal(e.data.result, width);
            done();
          });
        });
      };

      strictDom.mode('write');
      dom.appendChild(iframe);
      strictDom.mode('idle');
    });
  });

  function testWrite(fn) {
    var result;

    strictDom.mode('idle');
    assert.throws(fn);
    strictDom.mode('read');
    assert.throws(fn);
    strictDom.mode('write');
    assert.doesNotThrow(function() { result = fn(); });
    strictDom.mode('idle');

    return result;
  }

  function testWriteDetached(fn) {
    var result;

    strictDom.mode('read');
    result = fn();
    strictDom.mode('idle');

    return result;
  }

  function testRead(fn) {
    var result;

    strictDom.mode('idle');
    assert.throws(fn);
    strictDom.mode('write');
    assert.throws(fn);
    strictDom.mode('read');
    assert.doesNotThrow(function() { result = fn(); });

    return result;
  }

  function createElement(html) {
    strictDom.mode('write');
    var parent = document.createElement('div');
    parent.innerHTML = html;
    var el = parent.firstElementChild;
    dom.appendChild(el);
    strictDom.mode('idle');
    return el;
  }
});
