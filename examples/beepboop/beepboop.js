//
// Basic React Web Audio example which beeps every so often

/* jshint strict: false */
/* global React : false */
/* global ReactWebAudio : false */

//
// The top level component
// props:
// - beepfreq: frequency to use for beeping
// - higherFreq: call this func to increase beep frequency
// - lowerFreq: call this func to decrease beep frequency
// - startBeep: call this func to start beep sound
// - stopBeeo: call this func to stop beep sound
//

var ExampleBeeper = ReactWebAudio.createClass({
  displayName: 'ExampleBeeper',
  propTypes: {
    beepfreq: React.PropTypes.number.isRequired,
    higherFreq: React.PropTypes.func.isRequired,
    lowerFreq:  React.PropTypes.func.isRequired,
    startBeep:  React.PropTypes.func.isRequired,
    stopBeep:   React.PropTypes.func.isRequired
  },
  render: function() {
    return React.DOM.div(
      {},
      React.DOM.div({key:"info"}, "Current frequency: " + this.props.beepfreq),
      React.DOM.button({key:"b1", onClick:this.props.higherFreq},"higher"),
      React.DOM.button({key:"b2", onClick:this.props.lowerFreq}, "lower"),
      React.DOM.button({key:"b3", onClick:this.props.startBeep}, "Start"),
      React.DOM.button({key:"b4", onClick:this.props.stopBeep}, "Stop"),
      ReactWebAudio.AudioContext(
        {},
        ReactWebAudio.OscillatorNode({frequency:this.props.beepfreq, playing:this.props.playbeep}))
      );
  }
});

//
// the app state holds the current beep frequency and whether it's playing. Buttons in the component
// will modify the frequency and start/stop the beep noise.
//

/* jshint unused:false */
function beepboopstart() {
  var appstate = {beepfreq:900, playbeep: true};
  var renderelement = document.getElementById("webaudio-div");
  var renderinstance = null;

  function rendernewappstate() {
    if (renderinstance) {
      renderinstance.setProps(appstate);
    }
  }

  appstate.lowerFreq = function() {
    if (appstate.beepfreq > 100) {
      appstate.beepfreq -= 100;
      rendernewappstate();
    }
  };

  appstate.higherFreq = function() {
    if (appstate.beepfreq < 10000) {
      appstate.beepfreq += 100;
      rendernewappstate();
    }
  };

  appstate.stopBeep = function() {
    appstate.playbeep = false;
    rendernewappstate();
  };

  appstate.startBeep = function() {
    appstate.playbeep = true;
    rendernewappstate();
  };

  renderinstance = React.renderComponent(ExampleBeeper(appstate), renderelement);
}
