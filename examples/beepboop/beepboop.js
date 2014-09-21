//
// Basic React Web Audio example which beeps every so often

/* jshint strict: false */
/* global React : false */
/* global ReactWebAudio : false */

//
// The top level component
// props:
// - beepfreq: frequency to use for beeping
//

var ExampleBeeper = React.createClass({
  displayName: 'ExampleBeeper',
  propTypes: {
    beepfreq: React.PropTypes.number // optional
  },
  render: function() {
    return React.DOM.div(
      {},
      React.DOM.div({}, "Current frequency: " + this.props.beepfreq),
      ReactWebAudio.AudioContext(
        {},
        ReactWebAudio.OscillatorNode({frequency:this.props.beepfreq, playing:true}))
      );
  }
});

/* jshint unused:false */
function beepboopstart() {
  var renderelement = document.getElementById("webaudio-div");

  React.renderComponent(ExampleBeeper({beepfreq:900}), renderelement);
}

