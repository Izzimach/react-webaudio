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

function propIsAudioElement (props, propName, componentName) {
  /* jshint unused: vars */
  var obj = props[propName];
  if (!obj.nodeName || obj.nodeName.toLowerCase() !== "audio") {
     return new Error("Need an audio HTML element for " + propName + " property in component " + componentName);
  }
}

function propIsStringInList (allowedstringslist) {
  return function (props, propName, componentName) {
    /* jshint unused: vars */
    var obj = props[propName];
    if (typeof obj !== "string" || !_.contains(allowedstringslist, obj)) {
      return new Error(propName + " property must be a string set to one of: " + allowedstringslist.join(',') + " in component " + componentName);
    }
  };
}

function propIsNumberInRange(minvalue, maxvalue) {
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
    return React.DOM.div();
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
// Component that instantiates a bunch of audio nodes to play and process
// the sounds provided
//

var FilterChain = ReactWebAudio.createClass({
  displayName: 'FilterChain',
  propTypes: {
  },
  render: function() {
    return ReactWebAudio.AudioContext(
      {},
      // ok, this chaining is less than ideal...
      ReactWebAudio.GainNode({gain: this.props.gain},
        ReactWebAudio.ConvolverNode({bufferAsArray: this.props.reverbImpulseResponse},
          ReactWebAudio.BiquadFilterNode({frequency: this.props.filterFrequency, type: this.props.filterType},
            ReactWebAudio.MediaElementAudioSourceNode({audiosourceelement: this.props.audioElement}))))
    );
  }
});

//
// Combines the DOM interface and the Web Audio graph
//

var FilterExample = ReactWebAudio.createClass({
  displayName: 'FilterExample',
  propTypes: {
    audioElement: propIsAudioElement,
    gain: React.PropTypes.number.isRequired,
    filterType: propIsStringInList(['lowpass','highpass']),
    filterFrequency: React.PropTypes.number.isRequired,
    reverbImpulseResponse: React.PropTypes.object.isRequired, // Float32Array
    distortionStrength: propIsNumberInRange(0,10)
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
// Builds a simple impulse response buffer that produces a basic echo
//

function buildSimpleReverb(samplelength, echoamplitude) {
  var freshbuffer = new Float32Array(samplelength+1);
  var echospacing = 2500;
  var echocount = samplelength / echospacing;
  var echoindex = 0;

  for (echoindex=0; echoindex < echocount; echoindex++) {
    freshbuffer[echoindex * echospacing] = Math.pow(echoamplitude, echoindex);
  }

  return freshbuffer;
}

//
// the app state holds various filtering parameters
//

var g_appstate = {
  audioElement: null,
  gain:1,
  filterType:"lowpass",
  filterFrequency:7000,
  distortionStrength:3,
  reverbImpulseResponse: buildSimpleReverb(40000, 0.0)
};

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
