react-webaudio
==============

Create and update an [html5 webaudio](http://www.w3.org/TR/webaudio/) "audio graph" using [React](https://github.com/facebook/react).

Each component in the React component tree represents an AudioNode. Audio is
propagated up the tree branches until it reaches the render root, where the
sound data is fed into an AudioDestinationNode and then played to audio output.



