react-webaudio
==============

Create and update an [html5 webaudio](http://www.w3.org/TR/webaudio/) "audio graph" using [React](https://github.com/facebook/react).

Each component in the React component tree represents an AudioNode. Audio is
propagated up the tree branches until it reaches the render root, where the
sound data is fed into an AudioDestinationNode and then played to audio output.

## Installation and Building

React-WebAudio uses React 0.14.

Use As a Package
----------------

To use it as an npm package just install it

```
npm install react-webaudio
```

You will need to do something like
```
var ReactWebAudio = require('react-webaudio')
```

and then you can create and render audio graphs.

Build as standalone
-------------------

Checkout from git and run

```
npm run build
```

This will package up the react-webaudio components along with React and put the result in build/react-webaudio.js. If you include this into your webpage via
a script tag:

```
<script src="react-webaudio.js"></script>
```

Then ```React``` will appear in the global namespace and the new React Web Audio components are available as ```ReactWebAudio```.

## Examples

Build a simple tone source which feeds into its parent AudioContext. Once audio gets
to the AudioContext node it is rendered to the speakers.

```
React.createElement(ReactWebAudio.AudioContext,
  {},
  React.createElement(ReactWebAudio.OscillatorNode,
	{frequency:this.props.beepfreq, playing:this.props.playbeep}))
);
```

Each node feeds audio into the parent node, so a stupidly long filter chain looks like this:

```
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
```

In this case you might want to take advantage of something like [lodash's flowRight](https://lodash.com/docs#flowRight) to compose functions.

For a more complete picture examine the examples/ directory. To try out the examples you can run

```
npm run dev
```


and browse to localhost:8080/

## Caveats

Not all nodes are supported yet. Some are hard to test, while others don't fit into the React data flow process very well.  Still others are still being defined or redefined in the Web Audio spec. In particular:

- Feeding outputs into k-rate parameters isn't supported. Probably it will involve some custom nodes or properties, TBA
- The channel nodes (ChannelSplitterNode and ChannelMergerNode) are not supported.
- periodicwave isn't an audio node; if you need one for your OscillatorNode  you can create it manually and pass it in as a 'periodicWave' property. Make sure you set the oscillator type to 'custom'
- AnalyzerNode and MediaStreamAudioDestinationNode aren't supported.
- AudioListener and PannerNode aren't supported.
- Neither ScriptProcessorNode or its successor AudioWorkerNode are supported
