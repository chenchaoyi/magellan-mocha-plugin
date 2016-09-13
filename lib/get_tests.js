var _ = require('lodash');
var fs = require('fs');
var path = require("path");
var clc = require("cli-color");
var spawnSync = require('spawn-sync');
var Locator = require("./locator");
var mochaSettings = require("./settings");
var reporter = path.resolve(__dirname, 'test_capture.js');

module.exports = function(settings) {
  var OUTPUT_PATH = path.resolve(settings.tempDir, 'get_mocha_tests.json');
  var cmd = './node_modules/.bin/mocha';
  var args = ['--reporter', reporter];

  if (mochaSettings.mochaOpts) {
    args.push('--opts', mochaSettings.mochaOpts);
  }

  args = args.concat(mochaSettings.mochaTestFolders);
  var env = _.extend({}, process.env, {MOCHA_CAPTURE_PATH: OUTPUT_PATH});
  var capture = spawnSync(cmd, args, {env: env});

  if (capture.status !== 0 || capture.stderr.toString()) {
    console.error('Could not capture mocha tests. To debug, run the following command:\nMOCHA_CAPTURE_PATH=%s %s %s', OUTPUT_PATH, cmd, args.join(' '));
    process.exit(1);
  }

  var tests = fs.readFileSync(OUTPUT_PATH, 'utf-8');
  fs.unlinkSync(OUTPUT_PATH);

  tests = JSON.parse(tests).map(function(t) {
    return new Locator(t.fullTitle, t.file, t.pending, t.title);
  });

  // Display Mocha skip test information since Magellan won't handle it
  var skippedTestNumber = 0;
  tests.forEach(function(test) {
    if (test.pending) {
      skippedTestNumber = skippedTestNumber + 1;
    }
  })
  console.log(clc.greenBright("\n============= Suite Start =============\n"));
  console.log(clc.yellow("The following " + skippedTestNumber + " test(s) will be skipped:\n"));
  tests.forEach(function(test) {
    if (test.pending) {
      console.log('    ' + test.title);
    }
  })

  return tests;
};
