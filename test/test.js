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

      testMutate(function() { el1.appendChild(el2); });
      assert.isTrue(el1.contains(el2));

      var el3 = document.createElement('span');

      strictdom.phase('mutate', function() {
        el1.remove();
      });

      testMutateDetached(function() { el1.appendChild(el3); });
      assert.isTrue(el1.contains(el3));
    });

    suite('removeChild', function() {
      var el2;

      setup(function() {
        el2 = document.createElement('span');
        strictdom.phase('mutate', function() {
          el1.appendChild(el2);
        });
      });

      test('attached', function() {
        testMutate(function() {
          el1.removeChild(el2);
        });

        assert.isFalse(el1.contains(el2));
      });

      test('detached', function() {
        strictdom.phase('mutate', function() {
          el1.remove();
        });

        testMutateDetached(function() {
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
      var result = testMeasure(function() { return el.clientLeft; });
      assert.equal(result, 0);
    });

    test('.scrollTop', function() {
      var result = testMeasure(function() { return el.scrollTop; });
      testMutate(function() { el.scrollTop = 10; });
      assert.equal(result, 0);
    });

    test('.scrollLeft', function() {
      var result = testMeasure(function() { return el.scrollLeft; });
      testMutate(function() { el.scrollLeft = 10; });
      assert.equal(result, 0);
    });

    test('.innerHTML', function() {
      var result = testMutate(function() {
        return el.innerHTML = '<h1>foo</h1>';
      });

      assert.equal(result, '<h1>foo</h1>');
      result = el.innerHTML;
      assert.equal(result, '<h1>foo</h1>');
    });

    test('.outerHTML', function() {
      var el2;

      strictdom.phase('mutate', function() {
        el2 = document.createElement('div');
        el.appendChild(el2);
      });

      var result = testMutate(function() {
        return el2.outerHTML = '<h1>foo</h1>';
      });

      assert.equal(result, '<h1>foo</h1>');
      result = el.outerHTML;
      assert.equal(result, '<div><h1>foo</h1></div>');
    });

    test('.remove()', function() {
      strictdom.phase('mutate', function() {
        dom.appendChild(el);
        assert.isTrue(dom.contains(el));
      });

      testMutate(function() { el.remove(); });
      assert.isFalse(dom.contains(el));
    });
  });

  suite('HTMLElement', function() {
    var el;

    setup(function() {
      el = createElement('<div style="width:100px;height:50px">');
    });

    test('.offsetWidth', function() {
      var result = testMeasure(function() { return el.offsetWidth; });
      assert.equal(result, 100);
    });

    test('.offsetHeight', function() {
      var result = testMeasure(function() { return el.offsetHeight; });
      assert.equal(result, 50);
    });

    test('.offsetLeft', function() {
      strictdom.phase('mutate', function() {
        el.style.marginLeft = '50px';
      });

      var result = testMeasure(function() { return el.offsetLeft; });
      assert.equal(result, 50);
    });

    test('.offsetTop', function() {
      strictdom.phase('mutate');
      el.style.marginTop = '10px';
      strictdom.phase(null);

      var result = testMeasure(function() { return el.offsetTop; });
      assert.equal(result, 10);
    });

    suite('.style', function() {
      test('.height', function() {
        testMutate(function() { el.style.height = '100px'; });
        assert.equal(el.style.height, '100px');
      });

      test('.getPropertyValue()', function() {
        testMutate(function() { el.style.height = '100px'; });
        assert.equal(el.style.getPropertyValue('height'), '100px');
      });

      test('.removeProperty()', function() {
        testMutate(function() { el.style.height = '100px'; });
        assert.equal(el.style.getPropertyValue('height'), '100px');

        testMutate(function() { el.style.removeProperty('height'); });
        assert.equal(el.style.getPropertyValue('height'), '');
      });

      test('.setProperty()', function() {
        testMutate(function() { el.style.setProperty('height', '100px'); });
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
      var result = testMeasure(function() { return el.getBoundingClientRect(); });
      assert.equal(result.width, 100);
    });

    test('.getClientRects()', function() {
      var result = testMeasure(function() { return el.getClientRects(); });
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
      testMutate(function() { return textNode.data = 'bar'; });
      assert.equal(el.textContent, 'bar');
    });

    test('.remove()', function() {
      testMutate(function() { return textNode.remove(); });
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
      var result = testMeasure(function() { return el.width; });
      assert.equal(result, width);
      testMutate(function() { el.width = 100; });
      result = testMeasure(function() { return el.width; });
      assert.equal(result, 100);
    });

    test('.height', function() {
      var result = testMeasure(function() { return el.height; });
      assert.equal(result, height);
      testMutate(function() { el.height = 50; });
      result = testMeasure(function() { return el.height; });
      assert.equal(result, 50);
    });

    test('.x', function() {
      strictdom.phase('mutate', function() {
        el.style.marginLeft = '50px';
      });

      var result = testMeasure(function() { return el.x; });
      assert.equal(result, 50);
    });

    test('.y', function() {
      strictdom.phase('mutate', function() {
        el.style.marginLeft = '50px';
      });

      var result = testMeasure(function() { return el.x; });
      assert.equal(result, 50);
    });
  });

  suite('classList', function() {
    var el;

    setup(function() {
      el = createElement('<div class="foo">');
    });

    test('.add()', function() {
      testMutate(function() { return el.classList.add('bar'); });
      assert.equal(el.className, 'foo bar');
    });

    test('.remove()', function() {
      testMutate(function() { return el.classList.remove('foo'); });
      assert.equal(el.className, '');
    });

    test('.toggle()', function() {
      testMutate(function() { return el.classList.toggle('bar'); });
      assert.equal(el.className, 'foo bar');

      testMutate(function() { return el.classList.toggle('foo'); });
      assert.equal(el.className, 'bar');

      testMutate(function() { return el.classList.toggle('foo', false); });
      assert.equal(el.className, 'bar');

      testMutate(function() { return el.classList.toggle('foo', true); });
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
      var result = testMeasure(function() { return getComputedStyle(el); });
      assert.equal(result.height, '100px');
    });

    test('.scrollBy()', function() {
      testMutate(function() { return scrollBy(1, 1); });
    });

    test('.scrollTo()', function() {
      testMutate(function() { return scrollTo(1, 1); });
    });

    test('.scroll()', function() {
      testMutate(function() { return scroll(1, 1); });
    });

    // Haven't found a way of testing this
    // yet as Karma runs tests inside an iframe
    test('.innerWidth (iframe)', function() {
      var result = testMeasure(function() { return window.innerWidth; });
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
          assert.include(e.data.result.error, 'measure');

          iframe.contentWindow.postMessage({
            script: 'strictdom.phase(\'measure\'); window.innerWidth;'
          }, '*');

          addEventListener('message', function fn(e) {
            if (!e.data.result) return;
            removeEventListener('message', fn);
            assert.equal(e.data.result, width);
            done();
          });
        });
      };

      strictdom.phase('mutate', function() {
        dom.appendChild(iframe);
      });
    });
  });

  suite('.phase()', function() {
    test('it only accepts known phases', function() {
      strictdom.phase('mutate');
      strictdom.phase('measure');
      strictdom.phase(null);

      assert.throws(function() {
        strictdom.phase('boogies');
      });
    });

    test('returns the current phase when no arguments given', function() {
      strictdom.phase('mutate');
      assert.equal(strictdom.phase(), 'mutate');
    });

    test('when given a sync phase-task it reverts to the previous phase after', function() {
      strictdom.phase('measure');
      assert.equal(strictdom.phase(), 'measure');

      strictdom.phase('mutate', function() {
        assert.equal(strictdom.phase(), 'mutate');
        // do mutations ...
      });

      assert.equal(strictdom.phase(), 'measure');
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

  function testMutate(fn) {
    var result;

    strictdom.phase(null);
    assert.throws(fn);
    strictdom.phase('measure');
    assert.throws(fn);
    strictdom.phase('mutate');
    assert.doesNotThrow(function() { result = fn(); });
    strictdom.phase(null);

    return result;
  }

  function testMutateDetached(fn) {
    var result;

    strictdom.phase('measure');
    result = fn();
    strictdom.phase(null);

    return result;
  }

  function testMeasure(fn) {
    var result;

    strictdom.phase(null);
    assert.throws(fn);
    strictdom.phase('mutate');
    assert.throws(fn);
    strictdom.phase('measure');
    assert.doesNotThrow(function() { result = fn(); });

    return result;
  }

  function createElement(html) {
    return strictdom.phase('mutate', function() {
      var parent = document.createElement('div');
      parent.innerHTML = html;
      var el = parent.firstElementChild;
      dom.appendChild(el);
      return el;
    });
  }
});
