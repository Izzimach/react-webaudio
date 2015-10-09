
/*
 * Copyright (c) 2015 Gary Haussmann
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//
// Lots of code here is based on react-art: https://github.com/facebook/react-art
//

"use strict";

var React = require('react');
var ReactDOM = require('react-dom');

var ReactUpdates = require('react/lib/ReactUpdates');
var ReactMultiChild = require('react/lib/ReactMultiChild');

var assign = require('react/lib/Object.assign');
var emptyObject = require('fbjs/lib/emptyObject');

// monkey patch to workaround React's assumption that we're working only with DOM elements
var monkeypatch = require('./ReactWebAudioMonkeyPatch');
monkeypatch();

//
// Generates a React component by combining several mixin components
//

function defineWebAudioComponent(name) {

  var ReactWebAudioComponent = function() {
    /* jshint unused: vars */
    this.node = null;
    this._mountImage = null;
    this._audioNode = null;
    this._audioContext = null;
    this._audioConnections = null;
    this._renderedChildren = null;
  };
  ReactWebAudioComponent.displayName = name;
  for (var i = 1; i < arguments.length; i++) {
    assign(ReactWebAudioComponent.prototype, arguments[i]);
  }

  return ReactWebAudioComponent;
}

//
// track audiocontexts and their IDs for lookup later
//

var AudioContexts = {};

function findAudioContext(nodeID) {
  // find the audio context with a matching id prefix
  for (var audiocontextID in AudioContexts) {
    // cut down the nodeID to match lengths with the audiocontext IDs
    var subnodeID = nodeID.substr(0,audiocontextID.length);

    // do they match? if so, this is the ancestor audiocontext
    if (subnodeID === audiocontextID) {
      return AudioContexts[audiocontextID];
    }
  }

  // no matches found
  return undefined;
}

function addAudioContext(rootnodeID, context) {
  AudioContexts[rootnodeID] = context;
}

function removeAudioContext(rootnodeID, context) {
  /* jshint unused: vars */
  delete AudioContexts[rootnodeID];
}

//
// A Web Audio Node gets inputs from all of its children (assuming no sidechaining)
// and emits audio up to its parent (note: parent not owner).
//

// OutputAudioNodes have only outputs, and thus (in react-webaudio) they have no children.
// AudioNodes have (usually) both inputs and outputs

//
// If you're making an AudioNode component,
// mixin these methods and implement your own version of
// createAudioNode and applySpecificAudioNodeProps
//

var OutputAudioNodeMixin = {

  construct: function(element) {
    this._currentElement = element;
    this._audioNode = null;
    this._audioContext = null;
    this._audioConnections = [];
    this._parentNode = null;
    this._playState = null;
  },

  getPublicInstance: function() {
    return this._audioNode;
  },

  mountComponent: function(rootID, transaction, context) {
    /* jshint unused: vars */
    var props = this._currentElement.props;
    this._audioContext = findAudioContext(rootID);
    var newnode = this.buildAudioNode();
    this.applyAudioNodeProps({}, props);
    return newnode;
  },

  receiveComponent: function(nextElement, transaction, context) {
    /* jshint unused: vars */
    var oldProps = this._currentElement.props;
    var props = nextElement.props;

    // might need to rebuild/restart the node
    if (this.shouldRebuildNode && this.shouldRebuildNode(oldProps, props)) {
      this.rebuildAudioNode();
    } else {
      this.applyAudioNodeProps(oldProps, props);
      this.applySpecificAudioNodeProps(oldProps, props);
    }

    this._currentElement = nextElement;
  },

  unmountComponent: function() {
  },

  applyAudioNodeProps: function(oldProps, props) {
    /* jshint unused: vars */
  },

  connectAudio: function (connecttarget) {
    this._audioNode.connect(connecttarget._audioNode);
    this._audioConnections.push(connecttarget);
  },

  disconnectAudio: function (disconnecttarget) {
    var connectionindex = this._audioConnections.indexOf(disconnecttarget);
    if (connectionindex >= 0) {
      this._audioNode.disconnect(disconnecttarget._audioNode);
      this._audioConnections.splice(connectionindex,1);
    }
  },

  buildAudioNode: function() {
    this._audioNode = this.createAudioNode(this._audioContext);
    this.applyAudioNodeProps({}, this._currentElement.props);
    this.applySpecificAudioNodeProps({}, this._currentElement.props);
    return this._audioNode;
  },

  mountComponentIntoNode: function() {
    throw new Error(
      'You cannot render a Web Audio component standalone. ' +
      'You need to wrap it in a WebAudioContext component.'
    );
  },

};

//
// Audionodes that support start/stop via the "playing" prop.
// Since playable nodes can only be started once, we have to rebuild/replace
// the node for each start/stop cycle.
//

var PlayableNodeMixin = {
  setPlayState: function(newstate) {
    this._playState = newstate;
  },

  shouldRebuildNode: function (oldProps, props) {
    // the 'triggerkey' prop can be use to restart a playable node
    return (props.triggerkey !== oldProps.triggerkey && this._playState !== "ready");
  },

  rebuildAudioNode: function () {
    // disconnect old audio nodes
    if (typeof this._audioNode !== "undefined") {
      this._audioConnections.forEach(function(disconnectto) {
        this._audioNode.disconnect(disconnectto._audioNode);
      }, this);
    }

    // build and connect the new node
    var newaudionode = this.buildAudioNode();
    this._audioNode = newaudionode;

    this._audioConnections.forEach(function (connectto) {
      newaudionode.connect(connectto._audioNode);
    });

    return newaudionode;
  },

  // used by nodes that support start/stop via the "playing" property
  applyPlayingProp: function(oldProps, props) {
    // by default nodes play on creation unless you tell them not to (playing=false)
    var isplaying = (typeof props.playing === "undefined") ? true : props.playing;

    if (isplaying) {
      switch (this._playState) {
      case "ready": // ready to play so start it
        this._audioNode.start();
        this.setPlayState("playing");
        break;
      case "playing": // already playing, so no-op
        break;
      case "played": // already played, so we need to make a new node here
        // this builds a new node and recursively calls applySpecificAudioNodeProps,
        // which will fall through to the "ready" case and start playing.
        // so we don't want to call start() here.
        this.rebuildAudioNode();
	this._audioNode.start();
	this.setPlayState("playing");
        return;
      default:
        // need to generate a warning that the play state was not properly set/initialized
        break;
      }
    } else {
      switch (this._playState) {
      case "ready": // ready means its not running
        break;
      case "playing": // stop it!
        this._audioNode.stop();
        this.setPlayState("played");
        break;
      case "played": // already stopped
        break;
      default:
        break;
      }
    }
  }
};

//
// Audionodes with inputs must manage children
//

var AudioNodeWithChildren = assign({}, ReactMultiChild.Mixin, {

  moveChild: function(child, toIndex) {
    /* jshint unused: vars */
    //var childAudioNode = child._mountImage; // should be an AudioNode

    // for audio order doesn't matter at the moment (will change if we
    // add sidechaining)
  },

  createChild: function(child, childAudioNode) {
    /* jshint unused: vars */
    // connect the child to our AuduoNode
    child.connectAudio(this);
    child._parentNode = this._audioNode;
  },

  removeChild: function(child) {
    child.disconnectAudio(this);

    child._mountImage = null;
    child._parentNode = null;
  },

  /**
   * Override to bypass batch updating because it is not necessary.
   *
   * @param {?object} nextChildren.
   * @param {ReactReconcileTransaction} transaction
   * @internal
   * @override {ReactMultiChild.Mixin.updateChildren}
   */
  updateChildren: function(nextChildren, transaction, context) {
    this._updateChildren(nextChildren, transaction, context);
  },

  updateChildrenAtRoot: function(nextChildren, transaction) {
    this.updateChildren(nextChildren, transaction, emptyObject);
  },

  // called by any container component after it gets mounted

  mountAndAddChildren: function(children, transaction, context) {
    var mountedImages = this.mountChildren(
      children,
      transaction,
      context
    );
    // Each mount image corresponds to one of the flattened children
    var i = 0;
    for (var key in this._renderedChildren) {
      if (this._renderedChildren.hasOwnProperty(key)) {
        var child = this._renderedChildren[key];
        child._mountImage = mountedImages[i];
        child.connectAudio(this);
	child._parentNode = this._audioNode;
        i++;
      }
    }
  },

  mountAndAddChildrenAtRoot: function(children, transaction) {
    this.mountAndAddChildren(children, transaction, emptyObject);
  }
});

//
// AudioNodes allow for inputs as well as outputs
//

var AudioNodeMixin = assign({}, OutputAudioNodeMixin, AudioNodeWithChildren, {

  mountComponent: function(rootID, transaction, context) {
    /* jshint unused: vars */
    var audioNode = OutputAudioNodeMixin.mountComponent.apply(this, arguments);

    this.mountAndAddChildren(this._currentElement.props.children, transaction, context);
    return audioNode;
  },

  receiveComponent: function(nextComponent, transaction, context) {
    OutputAudioNodeMixin.receiveComponent.apply(this, arguments);
    this.updateChildren(this._currentElement.props.children, transaction, context);
  },

  unmountComponent: function() {
    OutputAudioNodeMixin.unmountComponent.apply(this, arguments);
    this.unmountChildren();
  },

  applyAudioNodeProps: function(oldProps, props) {
    var audioNode = this._audioNode;

    if (typeof props.channelCount !== "undefined") {
      audioNode.channelCount = props.channelCount;
    }
    if (typeof props.channelCountMode !== "undefined") {
      audioNode.channelCountMode = props.channelCountMode;
    }
    if (typeof props.channelInterpretation !== "undefined") {
      audioNode.channelInterpretation = props.channelInterpretation;
    }
  }
});

//
// The 'AudioContext' component creates the Web Audio AudioContext which
// handles the audio graph and all the mixing/outputting/etc.

var WebAudioContext = React.createClass({
  displayName: 'WebAudioContext',
  mixins: [AudioNodeWithChildren],

  componentDidMount: function() {
    var props = this.props;
    
    this._audioContext = new AudioContext();
    this._audioNode = this._audioContext.destination;
    addAudioContext(this._rootNodeID, this._audioContext);
    
    var transaction = ReactUpdates.ReactReconcileTransaction.getPooled();
    transaction.perform(
      this.mountAndAddChildrenAtRoot,
      this,
      props.children,
      transaction
    );
    ReactUpdates.ReactReconcileTransaction.release(transaction);
    
    // invoke an audiocontextcallback if it exists
    if (this.props.audiocontextcallback) {
      this.props.audiocontextcallback.call(null, this._audioContext);
    }
  },

  componentDidUpdate: function(oldProps) {
    var props = this.props;
    var transaction = ReactUpdates.ReactReconcileTransaction.getPooled();
    transaction.perform(
      this.updateChildrenAtRoot,
      this,
      this.props.children,
      transaction
    );
    ReactUpdates.ReactReconcileTransaction.release(transaction);
  },

  componentWillUnmount: function() {
    this.unmountChildren();
    removeAudioContext(this._rootNodeID, this._audioContext);
  },

  render: function() {
    return React.createElement('div');
  }
});


var OscillatorNode = defineWebAudioComponent(
  'OscillatorNode',
  OutputAudioNodeMixin,
  PlayableNodeMixin, {
    createAudioNode : function(audiocontext) {
      this.setPlayState("ready");
      return audiocontext.createOscillator();
    },

    applySpecificAudioNodeProps: function (oldProps, props) {
      var oscillatorNode = this._audioNode;
      if (typeof props.type !== "undefined") {
        oscillatorNode.type = props.type;

        // custom type? then set the wave table
        if (props.type === "custom" &&
          typeof props.periodicWave !== "undefined" &&
          props.type !== oldProps.type &&
          props.periodicWave !== oldProps.periodicWave) {
            oscillatorNode.setPeriodicWave(props.periodicWave);
          }
      }
      if (typeof props.frequency !== "undefined") {
        oscillatorNode.frequency.value = props.frequency;
      }
      this.applyPlayingProp(oldProps, props);
    }
  }
);

var AudioBufferSourceNode = defineWebAudioComponent(
  'AudioBufferSourceNode',
  OutputAudioNodeMixin,
  PlayableNodeMixin, {
    createAudioNode: function(audiocontext) {
      this.setPlayState("ready");
      return audiocontext.createBufferSource();
    },

    applySpecificAudioNodeProps: function (oldProps, props) {
      var bufferSourceNode = this._audioNode;
      if (typeof props.buffer !== "undefined" &&
         props.buffer !== oldProps.buffer) {
        bufferSourceNode.buffer = props.buffer;
      }
      if (typeof props.loop !== "undefined" &&
         props.loop !== oldProps.loop) {
        bufferSourceNode.loop.value = props.loop;
      }
      if (typeof props.loopStart !== "undefined" &&
         props.loopStart !== oldProps.loopStart) {
        bufferSourceNode.loopStart.value = props.loopStart;
      }
      if (typeof props.loopEnd !== "undefined" &&
         props.loopEnd !== oldProps.loopEnd) {
        bufferSourceNode.loopEnd.value = props.loopEnd;
      }
      this.applyPlayingProp(oldProps, props);
    }
  }
);

var MediaElementAudioSourceNode = defineWebAudioComponent(
  'MediaElementAudioSourceNode',
  OutputAudioNodeMixin,
  PlayableNodeMixin, {
    createAudioNode: function(audiocontext) {
      /* jshint unused: vars */
      this.setPlayState("ready");
      return audiocontext.createMediaElementSource(this._currentElement.props.audioSourceElement);
    },

    applySpecificAudioNodeProps: function (oldProps, props) {
      /* jshint unused: vars */
    }
  }
);

var MediaStreamAudioSourceNode = defineWebAudioComponent(
  'MediaStreamAudioSourceNode',
  OutputAudioNodeMixin,
  PlayableNodeMixin, {
    createAudioNode: function(audiocontext) {
      /* jshint unused: vars */
      this.setPlayState("ready");
      return audiocontext.createMediaStreamSource(this._currentElement.props.audioSourceStream);
    },

    applySpecificAudioNodeProps: function (oldProps, props) {
      /* jshint unused: vars */
    }
  }
);

var GainNode = defineWebAudioComponent(
  'GainNode',
  AudioNodeMixin, {
    createAudioNode: function(audiocontext) {
      return audiocontext.createGain();
    },

    applySpecificAudioNodeProps: function (oldProps, props) {
      if (typeof props.gain !== "undefined") {
        this._audioNode.gain.value = props.gain;
      }
    }
  }
);

var filtertypes = ["lowpass","highpass","bandpass","lowshelf","highshelf","peaking","notch","allpass"];

var BiquadFilterNode = defineWebAudioComponent(
  'BiquadFilterNode',
  AudioNodeMixin, {
    createAudioNode: function (audiocontext) {
      return audiocontext.createBiquadFilter();
    },

    applySpecificAudioNodeProps: function (oldProps, props) {
      if (typeof props.frequency !== "undefined") {
        this._audioNode.frequency.value = props.frequency;
      }
      if (typeof props.detune !== "undefined") {
        this._audioNode.detune.value = props.detune;
      }
      if (typeof props.Q !== "undefined") {
        this._audioNode.Q.value = props.Q;
      }
      if (typeof props.gain !== "undefined") {
        this._audioNode.gain.value = props.gain;
      }
      if (typeof props.type !== "undefined") {
        if (_.contains(filtertypes, props.type)) {
          this._audioNode.type = props.type;
        } else {
          // error!
          throw new Error(
            "The filtertype in BiquadFilterNode was " + props.type +
            " but needs to be one of " + filtertypes.join(',')
          );
        }
      }
    }
  }
);

var ConvolverNode = defineWebAudioComponent(
  'ConvolverNode',
  AudioNodeMixin, {
    createAudioNode: function(audiocontext) {
      return audiocontext.createConvolver();
    },

    applySpecificAudioNodeProps: function (oldProps, props) {
      if (typeof props.buffer !== "undefined") {
        this._audioNode.buffer = props.buffer;
      }

      if (typeof props.normalize !== "undefined") {
        this._audioNode.normalize = props.normalize;
      }
      // allow user to specify an array to use as impulse data

      if (typeof props.bufferAsArray !== "undefined") {
        // only update if the buffer data has changed
        if (typeof oldProps.bufferAsArray === "undefined" ||
          oldProps.bufferAsArray !== props.bufferAsArray) {
            //this._audioNode.normalize = true;

            // buffer configuration values
            var bufferlength = props.bufferAsArray.length;
            var bufferchannels = 2;//this._audioNode.numberOfInputs;
            var buffersamplerate = this._audioNode.context.sampleRate;
            if (typeof props.bufferAsArraySampleRate !== "undefined") {
              buffersamplerate = props.bufferAsArraySampleRate;
            }

            var freshbuffer = this._audioNode.context.createBuffer(bufferchannels, bufferlength, buffersamplerate);
            var channelindex=0;
            for (channelindex=0; channelindex < bufferchannels; channelindex++) {
              freshbuffer.getChannelData(channelindex).set(props.bufferAsArray);
            }
            this._audioNode.buffer = freshbuffer;
          }
      }
    }
  }
);

var DelayNode = defineWebAudioComponent(
  'DelayNode',
  AudioNodeMixin, {
    createAudioNode: function(audiocontext) {
      return audiocontext.createDelay();
    },

    applySpecificAudioNodeProps: function (oldProps, props) {
      if (typeof props.delayTime !== "undefined") {
        this._audioNode.delayTime.value = props.delayTime;
      }
    }
  }
);

var DynamicsCompressorNode = defineWebAudioComponent(
  'DynamicsCompressorNode',
  AudioNodeMixin, {
    createAudioNode: function (audiocontext) {
      return audiocontext.createDynamicsCompressor();
    },

    applySpecificAudioNodeProps: function (oldProps, props) {
      if (typeof props.threshold !== "undefined") {
          this._audioNode.threshold.value = props.threshold;
      }
      if (typeof props.knee !== "undefined") {
          this._audioNode.knee.value = props.knee;
      }
      if (typeof props.ratio !== "undefined") {
          this._audioNode.ratio.value = props.ratio;
      }
      if (typeof props.reduction !== "undefined") {
          this._audioNode.reduction.value = props.reduction;
      }
      if (typeof props.attack !== "undefined") {
          this._audioNode.attack.value = props.attack;
      }
      if (typeof props.release !== "undefined") {
          this._audioNode.release.value = props.release;
      }
    }
  }
);

var WaveShaperNode = defineWebAudioComponent(
  'WaveShaperNode',
  AudioNodeMixin, {
    createAudioNode: function (audiocontext) {
      return audiocontext.createWaveShaper();
    },

    applySpecificAudioNodeProps: function (oldProps, props) {
      if (typeof props.curve !== "undefined") {
          this._audioNode.curve = props.curve;
      }
      if (typeof props.oversample !== "undefined") {
          this._audioNode.oversample = props.oversample;
      }
    }
  }
);

// module data

module.exports =  {
  AudioContext: WebAudioContext,
  OscillatorNode: OscillatorNode,
  AudioBufferSourceNode: AudioBufferSourceNode,
  MediaElementAudioSourceNode: MediaElementAudioSourceNode,
  MediaStreamAudioSourceNode: MediaStreamAudioSourceNode,
  BiquadFilterNode: BiquadFilterNode,
  GainNode: GainNode,
  ConvolverNode: ConvolverNode,
  DelayNode: DelayNode,
  DynamicsCompressorNode: DynamicsCompressorNode,
  WaveShaperNode: WaveShaperNode,

  render: ReactDOM.render,
  unmountComponentAtNode: ReactDOM.unmountComponentAtNode
};
