//
// Basic React Web Audio example which loads audio via an <audio> tag and
// lets you apply various filters to it
//

/* jshint strict: false */
/* global React : false */
/* global ReactWebAudio : false */


//
// Some prop filters
//

function isAudioElement (props, propName, componentName) {
  /* jshint unused: vars */
  var obj = props[propName];
  if (!obj.nodeName || obj.nodeName !== "audio") {
     return new Error("Need an audio HTML element for " + propName + " property in component " + componentName);
  }
}

function isFilterType (props, propName, componentName) {
  /* jshint unused: vars */
  var obj = props[propName];
  if (typeof obj !== "string" || obj !== "lowpass" || obj !== "highpass") {
    return new Error(propName + " property must be a string set to 'lowpass' or 'highpass' in component " + componentName);
  }
}

function isNumberInRange(minvalue, maxvalue) {
  return function (props, propName, componentName) {
    /* jshint unused: vars */
    var obj = props[propName];
    if (typeof obj !== "number" || obj < minvalue || obj > maxvalue) {
      return new Error(propName + " must be a number between " + minvalue.toString() + " and " + maxvalue.toString());
    }
  };
}

//
// Slider element to display/set some prop
//

var FilterKnob = React.createClass({
  displayName: 'FilterKnob',
  render: function() {
    return null;
  }
});

//
// Component that displays the HTML GUI elements to control mixing
//

var AudioWidgets = React.createClass({
  displayName: 'AudioWidgets',
  render: function() {
    return React.DOM.div();
  }
});

//
// Component that instantiates a bunch of audio nodes to play the sounds provided
//

var FilterChain = ReactWebAudio.createClass({
  displayName: 'FilterChain',
  propTypes: {
  },
  render: function() {
    return ReactWebAudio.AudioContext(
      {},
      ReactWebAudio.GainNode({gain:0.5},
        ReactWebAudio.MediaElementAudioSourceNode({audiosourceelement: this.props.audioElement}))
    );
  }
});

//
// filter/process audio
//

var FilterExample = ReactWebAudio.createClass({
  displayName: 'FilterExample',
  propTypes: {
    audioElement: isAudioElement,
    gain: React.PropTypes.number.isRequired,
    filterType: isFilterType,
    filterFrequency: React.PropTypes.number.isRequired,
    distortionStrength: isNumberInRange(0,10)
  },
  render: function() {
    return React.DOM.div(
      {},
      // displays DOM widgets
      AudioWidgets(this.props),
      // controls audio graph
      FilterChain(this.props)
    );
  }
});

//
// the app state holds various filtering parameters
//
var g_appstate = {audioElement: null, gain:1, filterType:"lowpass", filterFrequency:1000, distortionStrength:3};
var g_reactinstance = null;

// update the named app state with the specified value

function newmixerstate(name, value) {
  g_appstate[name] = value;
  g_reactinstance.setProps(g_appstate);
}

/* jshint unused: false */
function mixerstart() {

  var renderelement = document.getElementById("webaudio-div");

  // I suppose we could just build this audio source via React...
  g_appstate.audioElement = document.getElementById("audiosource");

  g_reactinstance = React.renderComponent(FilterExample(g_appstate), renderelement);
}
