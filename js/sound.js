// sound.js
let stepsSound, staticSound;

function initSounds(camera) {
  const listener = new THREE.AudioListener();
  camera.add(listener);

  const loader = new THREE.AudioLoader();

  stepsSound = new THREE.Audio(listener);
  loader.load('assets/sounds/steps.mp3', (buffer) => {
    stepsSound.setBuffer(buffer);
    stepsSound.setLoop(true);
    stepsSound.setVolume(0.4);
  });

  staticSound = new THREE.Audio(listener);
  loader.load('assets/sounds/staticSound.mp3', (buffer) => {
    staticSound.setBuffer(buffer);
    staticSound.setLoop(true);
    staticSound.setVolume(0);
    staticSound.play();
  });

  const windSound = new THREE.Audio(listener);
  loader.load('assets/sounds/wind.mp3', (buffer) => {
    windSound.setBuffer(buffer);
    windSound.setLoop(true);
    windSound.setVolume(0.2);
    windSound.play();
  });
}

// Make globally available
window.initSounds = initSounds;
window.stepsSound = stepsSound;
window.staticSound = staticSound;
