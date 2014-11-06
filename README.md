react-webaudio
==============

Create and update an [html5 webaudio](http://www.w3.org/TR/webaudio/) "audio graph" using [React](https://github.com/facebook/react).

Each component in the React component tree represents an AudioNode. Audio is
propagated up the tree branches until it reaches the render root, where the
sound data is fed into an AudioDestinationNode and then played to audio output.

## Installation

You will need node, npm, and bower. You should probably install gulp globally as well.

```
npm install -g gulp
npm install -g bower
npm install
bower install
```

Simply running

```
gulp
```

Will package up the react-webaudio components along with React and put the result in build/react-webaudio.js. If you include this into your webpage via
a script tag:

```
<script src="react-webaudio.js"></script>
```

Then ```React``` will appear in the global namespace and the new React Web Audio components are available as ```ReactWebAudio```.

## Examples

Examples are set up in the examples/ directory. You can run

```
gulp livereload
```

## Caveats

Not all nodes are supported yet. Some are hard to test, while others don't fit into the React data flow process very well.  Still others are still being defined or redefined in the Web Audio spec. In particular:

- Feeding outputs into k-rate parameters isn't supported. Probably it will involve some custom nodes or properties, TBA
- The channel nodes (ChannelSplitterNode and ChannelMergerNode) are not supported.
- periodicwave isn't an audio node; if you need one for your OscillatorNode  you can create it manually and pass it in as a 'periodicWave' property. Make sure you set the oscillator type to 'custom'
- AnalyzerNode and MediaStreamAudioDestinationNode aren't supported.
- AudioListener and PannerNode aren't supported.
- Neither ScriptProcessorNode or its successor AudioWorkerNode are supported
