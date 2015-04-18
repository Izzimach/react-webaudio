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
  if (obj === null || !obj.nodeName || obj.nodeName.toLowerCase() !== "audio") {
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
// Slider element to display/set some filter property; also displays a name and the current filter value.
//

var FilterKnob = React.createClass({
  displayName: 'FilterKnob',
  propTypes: {
    parametername: React.PropTypes.string.isRequired,
    min: React.PropTypes.oneOfType([React.PropTypes.number,React.PropTypes.string]).isRequired,
    max: React.PropTypes.number.isRequired,
    step: React.PropTypes.oneOfType([React.PropTypes.number,React.PropTypes.string]),
    value: React.PropTypes.number.isRequired,
    onChange: React.PropTypes.func.isRequired
  },
  render: function() {
    var sliderprops = _({type:'range'}).extend(this.props).omit('parametername').value();
    return React.createElement("div",
			       {},
			       this.props.parametername,
			       React.createElement("input",sliderprops),
			       this.props.value.toString()
			      );
  }
});

//
// Component that displays the HTML GUI elements to control mixing
//
var MixerKnob = function(props) {
  return React.createElement(FilterKnob, props);
};

var AudioWidgets = React.createClass({
  displayName: 'AudioWidgets',
  propTypes: {
  },
  getInitialState: function() {
    return  {
    };
  },
  render: function() {
    return React.DOM.div(
      {},
      MixerKnob(
	{
	  parametername:'Filter Frequency (Hz)',
	  min:0, max:10000, step:100,
	  value: this.props.filterFrequency,
	  onChange: function(event){ newmixerstate('filterFrequency',Number(event.target.value));}
	}),
      MixerKnob(
	{
	  parametername:'Audio Gain (1=max)',
	  min:0.0, max:1.0, step:0.1,
	  value: this.props.gain,
	  onChange: function(event){ newmixerstate('gain',Number(event.target.value));}
	}),
      MixerKnob(
	{
	  parametername:'Echo Amplitude',
	  min:0.0, max:1.0, step:0.1,
	  value: this.props.reverbAmplitude,
	  onChange: function(event){
	    newmixerstate('reverbAmplitude',Number(event.target.value));
	  }
	}),
      MixerKnob(
	{
	  parametername:'Audio Delay',
	  min:0.0, max:1.0, step:0.1,
	  value: this.props.delayTime,
	  onChange: function(event){ newmixerstate('delayTime',Number(event.target.value)); }
	}),
      MixerKnob(
	{
	  parametername:'Distortion Amount (0=no distortion)',
	  min:0.0, max:3.0, step:0.1,
	  value: this.props.distortionStrength,
	  onChange: function(event) { newmixerstate('distortionStrength',Number(event.target.value)); }
	})
    );
  }
});

//
// Component that instantiates a bunch of audio nodes to play and process
// the sounds provided
//

var FilterChain = React.createClass({
  displayName: 'FilterChain',
  propTypes: {
  },
  render: function() {
    return React.createElement(ReactWebAudio.AudioContext,
      {},
      // ok, this chaining is less than ideal...
      React.createElement(ReactWebAudio.DynamicsCompressorNode,
	{threshold:-50, knee:40, ratio:12, reduction:-20, attack:0.1, release:0.1},
	React.createElement(ReactWebAudio.BiquadFilterNode,
	  {frequency: this.props.filterFrequency, type: this.props.filterType},
          React.createElement(ReactWebAudio.GainNode,
	    {gain: this.props.gain},
	    React.createElement(ReactWebAudio.ConvolverNode,
	      {bufferAsArray: this.props.reverbImpulseResponse},
		React.createElement(ReactWebAudio.DelayNode,
	          {delayTime: this.props.delayTime},
	          React.createElement(ReactWebAudio.WaveShaperNode,
	            {curve: this.props.distortionCurve},
	            React.createElement(ReactWebAudio.MediaElementAudioSourceNode,
		     {audioSourceElement: this.props.audioElement}
				       )
				     )
				   )
			       )
			     )
			   )
			 )
    );
  }
});

//
// Combines the DOM interface and the Web Audio graph
//

var FilterExample = React.createClass({
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
    return React.createElement(
      "div",
      {},
      // displays DOM widgets
      React.createElement(AudioWidgets, this.props),
      // controls audio graph
      React.createElement(FilterChain, this.props)
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
  var curvenumpoints = 5000;
  var zeropointindex = curvenumpoints * 0.5;
  var curvebuffer = new Float32Array(curvenumpoints);
  var curveindex=0, inputvalue = 0;
  for (curveindex=0; curveindex < curvenumpoints; curveindex++) {
    inputvalue = (curveindex - zeropointindex) / (curvenumpoints * 0.5);
    curvebuffer[curveindex] = Math.tanh(inputvalue * (distortionamount*10+2));
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
  delayTime:0.1,
  reverbAmplitude: 0.1,
  reverbImpulseResponse: null
};

function renderApp() {
  var renderelement = document.getElementById("webaudio-div");
  React.render(React.createElement(FilterExample, g_appstate), renderelement);
}

// update the named app state with the specified value

function newmixerstate(name, value) {
  var oldValue = g_appstate[name];
  g_appstate[name] = value;

  // do we need to update derived values?
  if (name === "distortionStrength" &&
      Math.abs(value - oldValue) > 0.01) {
    updatedistortioncurve();
  }
  else if (name == "reverbAmplitude" &&
	   Math.abs(value - oldValue) > 0.01) {
    updatereverbbuffer();
  }

  renderApp();
}

function updatedistortioncurve() {
  g_appstate.distortionCurve = buildDistortionCurve(g_appstate.distortionStrength);
}

function updatereverbbuffer() {
  g_appstate.reverbImpulseResponse = buildSimpleReverb(44100, g_appstate.reverbAmplitude);
}

/* jshint unused: false */
function mixerstart() {


  // I suppose we could just build this audio source via React...
  g_appstate.audioElement = document.getElementById("audiosource");
  updatedistortioncurve();
  updatereverbbuffer();

  renderApp();
}
