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
// Slider element to display/set some filter property
//

var FilterKnob = React.createClass({
  displayName: 'FilterKnob',
  propTypes: {
    minvalue: React.PropTypes.number.isRequired,
    maxvalue: React.PropTypes.number.isRequired,
    stepvalue: React.PropTypes.number,
    newvaluecallback: React.PropTypes.func, // should be required?
  },
  render: function() {
    return React.DOM.input({type:'range', min:this.props.minvalue, max:this.props.maxvalue});
  }
});

//
// Component that displays the HTML GUI elements to control mixing
//

var AudioWidgets = React.createClass({
  displayName: 'AudioWidgets',
  render: function() {
    return FilterKnob();
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
        ReactWebAudio.DynamicsCompressorNode({threshold:-50, knee:40, ratio:12, reduction:-20, attack:0.1, release:0.1},
          ReactWebAudio.WaveShaperNode({curve: this.props.distortionCurve},
            ReactWebAudio.ConvolverNode({bufferAsArray: this.props.reverbImpulseResponse},
              ReactWebAudio.DelayNode({delayTime: this.props.delayTime},
                ReactWebAudio.BiquadFilterNode({frequency: this.props.filterFrequency, type: this.props.filterType},
                  ReactWebAudio.MediaElementAudioSourceNode({audiosourceelement: this.props.audioElement})))))))
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
// Builds a simple distortion curve
//

function buildDistortionCurve(distortionamount) {
  var curvenumpoints = 1000;
  var zeropointindex = curvenumpoints/2;
  var curvebuffer = new Float32Array(curvenumpoints);
  var curveindex=0, inputvalue = 0;
  for (curveindex=0; curveindex < curvenumpoints; curveindex++) {
    inputvalue = (curveindex - zeropointindex) / (curvenumpoints * 0.5);
    curvebuffer[curveindex] = Math.pow(inputvalue,1.1);
  }

  return curvebuffer;
}
//
// the app state holds various filtering parameters
//

var g_appstate = {
  audioElement: null,
  gain:1,
  filterType:"lowpass",
  filterFrequency:7000,
  distortionStrength: 0,
  distortionCurve: null,
  delayTime:0.2,
  reverbAmplitude: 0.1,
  reverbImpulseResponse: null
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
  g_appstate.distortionCurve = buildDistortionCurve(g_appstate.distortionStrength);
  g_appstate.reverbImpulseResponse = buildSimpleReverb(44100, g_appstate.reverbAmplitude);

  g_reactinstance = React.renderComponent(FilterExample(g_appstate), renderelement);
}
