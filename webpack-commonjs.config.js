var path = require('path');
var _ = require('lodash');

// copy most settings from the default config, and then modify
// the stuff that has changed

var defaultconfig = require('./webpack.config.js');

var commonjsconfig = _.cloneDeep(defaultconfig);
_.assign(commonjsconfig, {
  entry: path.join(__dirname, "src", "ReactWebAudio.js"),
  externals: [
    "react",
    /^react\/lib\/.+/  // any require that refers to internal react modules
  ]
});
_.assign(commonjsconfig.output, {
  path: path.join(__dirname, "es5"),
  libraryTarget: "commonjs2",
  library: "react-webaudio",
  filename: "react-webaudio-commonjs.js"
});

module.exports = commonjsconfig;
