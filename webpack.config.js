var path = require('path');

module.exports = {
  entry: path.join(__dirname, "src", "react-webaudio-exposeglobals.js"),

  output: {
    path: path.join(__dirname, "build"),
    publicPath: "/build/",
    filename: "react-webaudio.js",
    libraryTarget: "var",
    library:"ReactWebAudio"
  },
  
  module: {
    loaders: [
      {
	test: /\.js$/,
	loader: 'babel',
	include: path.join(__dirname, 'src'),
	query: {
	  // When generating a standalone library, this makes sure to
	  // use babel-runtime to wrap our code and
	  // avoid global polyfills.
	  optional: ['runtime']
	}
      }
    ]
  }
}
