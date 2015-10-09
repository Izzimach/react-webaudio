var test_basic_files = [
  'build/react-webaudio.js'
];

module.exports = function(config) {
  config.set({
    browsers: ['Firefox'],
    frameworks:['jasmine'],
    files: test_basic_files,
    singleRun:true
  });
};
