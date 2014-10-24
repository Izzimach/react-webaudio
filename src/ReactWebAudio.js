
/*
 * Copyright (c) 2014 Gary Haussmann
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

var React = require('react/react.js');

var DOMPropertyOperations = require('react/lib/DOMPropertyOperations');
var ReactComponent = require('react/lib/ReactComponent');
var ReactMultiChild = require('react/lib/ReactMultiChild');
var ReactDescriptor = require('react/lib/ReactDescriptor');
var ReactDOMComponent = require('react/lib/ReactDOMComponent');
var ReactBrowserComponentMixin = require('react/lib/ReactBrowserComponentMixin');
var ReactComponentMixin = ReactComponent.Mixin;

var mixInto = require('react/lib/mixInto');
var merge = require('react/lib/merge');
var shouldUpdateReactComponent = require('react/lib/shouldUpdateReactComponent');
var instantiateReactComponent = require ('react/lib/instantiateReactComponent');

//
// Generates a React component by combining several mixin components
//

function defineWebAudioComponent(name) {

  var ReactWebAudioComponent = function() {};
  ReactWebAudioComponent.prototype.type = ReactWebAudioComponent;
  for (var i = 1; i < arguments.length; i++) {
    mixInto(ReactWebAudioComponent, arguments[i]);
  }

  var Constructor = function(props, owner) {
    this.construct(props,owner);
  };
  Constructor.prototype = new ReactWebAudioComponent();
  Constructor.prototype.constructor = Constructor;
  Constructor.displayName = name;

  var factory = ReactDescriptor.createFactory(Constructor);
  return factory;
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

var OutputAudioNodeMixin = merge(ReactComponentMixin, {

  mountComponent: function(rootID, transaction, mountDepth) {
    /* jshint unused: vars */
    ReactComponentMixin.mountComponent.apply(this, arguments);

    this._audioContext = findAudioContext(rootID);
    return this.buildAudioNode();
  },

  receiveComponent: function(nextDescriptor, transaction) {
    var oldProps = this.props;
    var props = nextDescriptor.props;

    ReactComponent.Mixin.receiveComponent.call(this, nextDescriptor, transaction);

    // might need to rebuild/restart the node
    if (this.shouldRebuildNode && this.shouldRebuildNode(oldProps, props)) {
      this.rebuildAudioNode();
    } else {
      this.applyAudioNodeProps(oldProps, props);
      this.applySpecificAudioNodeProps(oldProps, props);
    }

    this.props = props;
  },

  unmountComponent: function() {
    ReactComponentMixin.unmountComponent.call(this);
  },

  applyAudioNodeProps: function(oldProps, props) {
    /* jshint unused: vars */
  },

  connectAudio: function (connecttarget) {
    if (typeof this._audioConnections === "undefined") {
      this._audioConnections = [];
    }
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
    this.applyAudioNodeProps({}, this.props);
    this.applySpecificAudioNodeProps({}, this.props);
    return this._audioNode;
  },

  mountComponentIntoNode: function() {
    throw new Error(
      'You cannot render a Web Audio component standalone. ' +
      'You need to wrap it in a WebAudioContext component.'
    );
  },

});

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
// AudioNodes allow for inputs as well as outputs
//

var AudioNodeMixin = merge(merge(OutputAudioNodeMixin, ReactMultiChild.Mixin), {

  mountComponent: function(rootID, transaction, mountDepth) {
    /* jshint unused: vars */
    var audioNode = OutputAudioNodeMixin.mountComponent.apply(this, arguments);

    this.mountAndAddChildren(this.props.children, transaction);
    return audioNode;
  },

  receiveComponent: function(nextComponent, transaction) {
    OutputAudioNodeMixin.receiveComponent.apply(this, arguments);
    this.updateChildren(this.props.children, transaction);
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
  },

  //
  // MultiChild methods
  //

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
  },

  removeChild: function(child) {
    child.disconnectAudio(this);

    child._mountImage = null;
  },

  /**
   * Override to bypass batch updating because it is not necessary.
   *
   * @param {?object} nextChildren.
   * @param {ReactReconcileTransaction} transaction
   * @internal
   * @override {ReactMultiChild.Mixin.updateChildren}
   */
  updateChildren: function(nextChildren, transaction) {
    this._updateChildren(nextChildren, transaction);
  },

  // called by any container component after it gets mounted

  mountAndAddChildren: function(children, transaction) {
    var mountedImages = this.mountChildren(
      children,
      transaction
    );
    // Each mount image corresponds to one of the flattened children
    var i = 0;
    for (var key in this._renderedChildren) {
      if (this._renderedChildren.hasOwnProperty(key)) {
        var child = this._renderedChildren[key];
        child._mountImage = mountedImages[i];
        child.connectAudio(this);
        i++;
      }
    }
  }
});

//
// The 'AudioContext' component creates the Web Audio AudioContext which
// handles the audio graph and all the mixing/outputting/etc.

var WebAudioContext = defineWebAudioComponent(
  'WebAudioContext',
  ReactBrowserComponentMixin,
  ReactDOMComponent.Mixin,
  AudioNodeMixin, {

    mountComponent: function(rootID, transaction, mountDepth) {
      /* jshint unused: vars */
      AudioNodeMixin.mountComponent.apply(this, arguments);
      transaction.getReactMountReady().enqueue(this.componentDidMount, this);

      // Temporary placeholder
      var idMarkup = DOMPropertyOperations.createMarkupForID(rootID);
      return '<div ' + idMarkup + '></div>';
    },

    createAudioNode: function() {
      this._audioContext = new AudioContext();
      addAudioContext(this._rootNodeID, this._audioContext);
      return this._audioContext.destination;
    },

    unmountComponent: function() {
      removeAudioContext(this._rootNodeID, this._audioContext);
      AudioNodeMixin.unmountComponent.apply(this,arguments);
    },

    applySpecificAudioNodeProps: function(oldProps, props) {
      /* jshint unused: vars */
    },

    componentDidMount: function() {
      this.props = this._descriptor.props;

      // invoke an audiocontextcallback if it exists
      if (this.props.audiocontextcallback) {
        this.props.audiocontextcallback.call(null, this._audioContext);
      }
    },

    // the audiocontext provides a div, so it can mount into a node

    mountComponentIntoNode : ReactComponent.Mixin.mountComponentIntoNode
  }
);


var OscillatorNode = defineWebAudioComponent(
  'OscillatorNode',
  ReactComponentMixin,
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
  ReactComponentMixin,
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
  ReactComponentMixin,
  OutputAudioNodeMixin,
  PlayableNodeMixin, {
    createAudioNode: function(audiocontext) {
      /* jshint unused: vars */
      this.setPlayState("ready");
      return audiocontext.createMediaElementSource(this.props.audiosourceelement);
    },

    applySpecificAudioNodeProps: function (oldProps, props) {
      /* jshint unused: vars */
    }
  }
);

var MediaStreamAudioSourceNode = defineWebAudioComponent(
  'MediaStreamAudioSourceNode',
  ReactComponentMixin,
  OutputAudioNodeMixin,
  PlayableNodeMixin, {
    createAudioNode: function(audiocontext) {
      /* jshint unused: vars */
      this.setPlayState("ready");
      return audiocontext.createMediaStreamSource(this.props.audiosourcestream);
    },

    applySpecificAudioNodeProps: function (oldProps, props) {
      /* jshint unused: vars */
    }
  }
);

var GainNode = defineWebAudioComponent(
  'GainNode',
  ReactComponentMixin,
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


//
// Composite components don't have an _audioNode member. So we have to do some work to find
// the proper AudioNode sometimes.
//

function findAudioNodeAncestor(componentinstance) {
  // walk up via _owner until we find something with an AudioNode (_audioNode member)
  var componentwalker = componentinstance._descriptor._owner;
  while (typeof componentwalker !== 'undefined') {
    // no owner? then fail
    if (typeof componentwalker._renderedComponent._audioNode !== 'undefined') {
      return componentwalker._renderedComponent._audioNode;
    }
    componentwalker = componentwalker._descriptor._owner;
  }

  // we walked all the way up and found no _audioNode member
  return undefined;
}

function findAudioNodeChild(componentinstance) {
  // walk downwards via _renderedComponent to find something with an AudioNode
  var componentwalker = componentinstance;
  while (typeof componentwalker !== 'undefined') {
    // no owner? then fail
    if (typeof componentwalker._audioNode !== 'undefined') {
      return componentwalker._audioNode;
    }
    componentwalker = componentwalker._renderedComponent;
  }

  // we walked all the way up and found no AudioNode
  return undefined;

}

//
// time to monkey-patch React!
//
// a subtle bug happens when ReactCompositeComponent updates something in-place by
// modifying HTML markup; since Web Audio objects don't exist as markup the whole thing bombs.
// we try to fix this by monkey-patching ReactCompositeComponent
//

function createWebAudioClass(spec) {

  var patchedspec = merge(spec, {
    updateComponent : function(transaction, prevParentDescriptor) {
      ReactComponent.Mixin.updateComponent.call(
        this,
        transaction,
        prevParentDescriptor
      );

      var prevComponentInstance = this._renderedComponent;
      var prevDescriptor = prevComponentInstance._descriptor;
      var nextDescriptor = this._renderValidatedComponent();

      if (shouldUpdateReactComponent(prevDescriptor, nextDescriptor)) {
        prevComponentInstance.receiveComponent(nextDescriptor, transaction);
      } else {
        // We can't just update the current component.
        // So we nuke the current instantiated component and put a new component in
        // the same place based on the new props.
        var rootID = this._rootNodeID;

        var prevAudioNode = findAudioNodeChild(this._renderedComponent);
        var audioNodeAncestor = findAudioNodeAncestor(this);

        // disconnect the current audio node from its target (the Ancestor)
        prevComponentInstance.unmountComponent();
        prevAudioNode.disconnect(0); // only one output allowed at the moment
        this._audioNode = null;

        // create the new object and stuff it into the place vacated by the old object
        this._renderedComponent = instantiateReactComponent(nextDescriptor);
        var nextDisplayObject = this._renderedComponent.mountComponent(
          rootID,
          transaction,
          this._mountDepth + 1
        );
        this._audioNode = nextDisplayObject;
        nextDisplayObject.connect(audioNodeAncestor);
      }
    }
  });

  /* jshint validthis: true */
  var newclass = React.createClass.call(this, patchedspec);
  return newclass;

}

// module data

module.exports =  {
  AudioContext: WebAudioContext,
  OscillatorNode: OscillatorNode,
  AudioBufferSourceNode: AudioBufferSourceNode,
  MediaElementAudioSourceNode: MediaElementAudioSourceNode,
  MediaStreamAudioSourceNode: MediaStreamAudioSourceNode,
  GainNode: GainNode,
  createClass: createWebAudioClass,
};
