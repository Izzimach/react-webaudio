//
// Basic React Web Audio which is similar to the example code at
// https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamAudioSourceNode
// Which takes a video input stream and processes/filters the audio portion.
//
// Big chunks of this code are ripped from the MediaStreamAudioSourceNode example found at
// https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamAudioSourceNode
//

/* jshint strict: false */
/* global React : false */
/* global console : false */
/* global alert : false */
/* global ReactWebAudio : false */

//
// Slider element to display/set some prop
//

// TODO: same is in mixers.js - factor out?

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
    return React.createElement(
      "div",
      {},
      this.props.parametername,
      React.createElement("input", sliderprops),
      this.props.value.toString()
    );
  }
});



//
// Component that displays the HTML GUI elements to control mixing
// Right now we just manage the filter frequency
//

var VideoFilterWidgets = React.createClass({
  displayName: 'VideoFilterWidgets',
  render: function() {
    // if no video stream is selected, invite the user to pick one
    if (this.props.videoStream === null) {
      return React.createElement(
	"button",
	{
          onClick: function() { openvideostream(connectstream); }
	},
	"Click to open a video stream from your webcam");
    } else {
      return React.createElement(
	"div",
        {},
        React.createElement(FilterKnob,
          {
            parametername:'Audio lowpass filter frequency (Hz)',
            min:0, max:10000, step:100,
            value: this.props.filterFrequency,
            onChange: function(event){ newappstate('filterFrequency',Number(event.target.value));}
          })
      );
    }
  }
});

//
// Component to filter the incoming audio stream
//

var VideoFilterChain = React.createClass({
  displayName: 'VideoFilterChain',
  propTypes: {
  },
  render: function() {
    // don't build the audio graph until we have a video stream
    if (this.props.videoStream === null) {
      return null;
    } else {
      return React.createElement(ReactWebAudio.AudioContext,
	       {},
	       React.createElement(ReactWebAudio.BiquadFilterNode,
		 { frequency: this.props.filterFrequency, type: this.props.filterType },
		 React.createElement(ReactWebAudio.MediaStreamAudioSourceNode,
		   {audioSourceStream: this.props.videoStream}))
      );
    }
  }
});

//
// filter/process audio
//

var VideoFilterExample = React.createClass({
  displayName: 'VideoFilterExample',
  propTypes: {
    filterFrequency: React.PropTypes.number.isRequired,
  },
  render: function() {
    return React.createElement(
      "div",
      {},
      // displays DOM widgets
      React.createElement(VideoFilterWidgets, this.props),
      // controls audio graph
      React.createElement(VideoFilterChain, this.props)
    );
  }
});

//
// Success callback - set the video stream and let React build the audio graph
//

function connectstream(stream) {
  var video = document.querySelector('video');

  video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
  video.onloadedmetadata = function() {
    video.play();
    video.muted = 'true';
  };

  // update app state and let React build the audio graph
  newappstate('videoStream', stream);
}

// fork getUserMedia for multiple browser versions, for those
// that need prefixes

navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia);


//
// invoke getUserMedia to pick a video stream
//

function openvideostream(successcallback) {

  // getUserMedia block - grab stream
  // put it into a MediaStreamAudioSourceNode
  // also output the visuals into a video element

  if (navigator.getUserMedia) {
    console.log('getUserMedia supported.');
    navigator.getUserMedia (
      // constraints: audio and video for this app
      {
        audio: true,
        video: true
      },
      successcallback,
      // Error callback
      function(err) {
        alert('The following gUM error occured: ' + err.name);
        console.log(err);
      }
    );
  } else {
    alert('getUserMedia not supported on your browser!');
  }
}

//
// the app state holds the stream and filter parameter(s)
//
var g_appstate = {videoStream: null, filterFrequency:1000 };
var g_reactinstance = null;

// update the named app state with the specified value

function newappstate(name, value) {
  g_appstate[name] = value;
  g_reactinstance.setProps(g_appstate);
}


/* jshint unused: false */
function videostart() {

  var renderelement = document.getElementById("webaudio-div");

  g_reactinstance = React.render(React.createElement(VideoFilterExample, g_appstate), renderelement);
}
