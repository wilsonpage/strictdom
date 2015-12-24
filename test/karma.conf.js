'use strict';

module.exports = function(config) {
  config.set({
    basePath: '..',
    reporters: ['mocha'],
    browsers: [
      'Firefox',
      'chrome'
    ],

    client: {
      captureConsole: true,
      mocha: { ui: 'tdd' }
    },

    frameworks: [
      'mocha',
      'chai-sinon'
    ],

    customLaunchers: {
      chrome: {
        base: 'Chrome',
        flags: ['--no-sandbox']
      }
    },

    files: [
      'strict-dom.js',
      'test/test.js',
      { pattern: 'test/lib/iframe.html', included: false }
    ]
  });
};
