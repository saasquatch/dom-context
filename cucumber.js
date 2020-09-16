
var common = [
    'test/**/*.feature',
    '--require-module ts-node/register',
    `--format ${process.env.CI ? 'progress' : 'progress-bar'}`,
    // `--format-options '{"snippetSyntax": "cucumberSnippet.js"}'`,
    // '--format rerun:@rerun.txt',
    // '--format usage:usage.txt',
  ].join(' ');
  
  module.exports = {
    default: common,
  };