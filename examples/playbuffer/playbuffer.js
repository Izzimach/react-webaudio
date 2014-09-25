//
// Basic React Web Audio example which loads in a bunch of files and plays them

/* jshint strict: false */
/* global React : false */
/* global ReactWebAudio : false */
/* global AudioBuffer : false */

function onError(e) {
  window.console.log(e);
}

//
// load the given audio file and call some callback when done
//

function loadaudio(audiocontext, filename, loadcompletedcallback) {
  var request = new XMLHttpRequest();
  request.open('GET', filename, true);
  request.responseType = 'arraybuffer';

  // Decode asynchronously
  request.onload = function() {
    audiocontext.decodeAudioData(request.response, function(buffer) {
      loadcompletedcallback(filename, buffer);
    }, onError);
  };
  request.send();
}

//
// Prop shapes used by both SoundInfoDisplay and AudioGraph components
//

var SoundDataShape = React.PropTypes.shape({
  filename: React.PropTypes.string,
  audiobuffer: React.PropTypes.instanceOf(AudioBuffer)
});

var SoundDataList = React.PropTypes.arrayOf(SoundDataShape);

//
// Component that displays info about the sounds specified in props.sounds
//

var SoundInfoDisplay = React.createClass({
  displayName: 'SoundInfoDisplay',
  propTypes: {
    sounds: SoundDataList.isRequired
  },
  render: function() {
    var infoElements = this.props.sounds.map(function(sounddata) {
      return React.DOM.div({key:sounddata.filename}, "Sound " + sounddata.filename + " playing");
    });
    return React.DOM.div(null, infoElements);
  }
});

//
// Component that instantiates a bunch of audio nodes to play the sounds provided
//

var AudioGraph = ReactWebAudio.createClass({
  displayName: 'AudioGraph',
  propTypes: {
    audiocontext: React.PropTypes.instanceOf(AudioContext).isRequired,
    sounds: SoundDataList.isRequired
  },
  render: function() {
    var audioElements = this.props.sounds.map(function(sounddata) {
      return ReactWebAudio.AudioBufferSourceNode({key:sounddata.filename, buffer:sounddata.audiobuffer});
    });
    return ReactWebAudio.AudioContext({audiocontext:this.props.audiocontext}, audioElements);
  }
});

//
// Dynamically load audio files (listed in an array)
// As each file is loaded it gets some start/stop buttons and begins playing
//
var LoadAndPlayBuffers = ReactWebAudio.createClass({
  displayName: 'LoadAndPlayBuffers',
  propTypes: {
    filemanifest: React.PropTypes.arrayOf(React.PropTypes.string).isRequired
  },
  getInitialState: function() {
    return {
      loadedsounds: [],
      audiocontext: new AudioContext()
    };
  },
  addSound: function(name, buffer) {
    var sounddata = {filename:name, audiobuffer:buffer};
    this.state.loadedsounds.push(sounddata);
    var newloadedsounds = this.state.loadedsounds;
    this.setState({loadedsounds: newloadedsounds});
  },
  componentDidMount: function() {
    // send off requests to load each of the audio files
    this.props.filemanifest.forEach(function (filename) {
      loadaudio(this.state.audiocontext, filename, this.addSound); // yuck
    }, this);
  },
  render: function() {
    var loadedsounds = this.state.loadedsounds;
    return React.DOM.div(
      {},
      SoundInfoDisplay({sounds:loadedsounds}),
      AudioGraph({audiocontext:this.state.audiocontext, sounds:loadedsounds})
    );
  }
});

//
// the app state holds the current beep frequency and whether it's playing. Buttons in the component
// will modify the frequency and start/stop the beep noise.
//

/* jshint unused:false */
function playbufferstart() {
  var manifest = [
    "../assets/16847__bjornredtail__vacuum-startup.wav",
    "../assets/14401__acclivity__chimebar-c-low-proc.wav",
    "../assets/Poofy Reel.mp3"
  ];

  var appstate = {filemanifest:manifest};

  var renderelement = document.getElementById("webaudio-div");

  var renderinstance = null;

  renderinstance = React.renderComponent(LoadAndPlayBuffers(appstate), renderelement);
}

