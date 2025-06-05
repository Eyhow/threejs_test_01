// Basic Three.js setup
let scene, camera, renderer;
let moveForward = false;
let moveBackward = false;
let rotateLeft = false;
let rotateRight = false;
let groundMat;
let bobbingTime = 0;
let vertigoTime = 0;

const vertigoSpeed = 1.5;    // How fast the zoom oscillates
const vertigoAmount = 1.2;   // How much FOV changes (degrees)
const baseFov = 75;          // Normal FOV

const bobbingSpeed = 15; // how fast the bobbing cycles (higher = faster)
const bobbingAmount = 0.12; // how much vertical movement (in units)
const baseCameraHeight = 2; // your camera height above ground

const blinkCanvas = document.getElementById('blinkCanvas');
const blinkCtx = blinkCanvas.getContext('2d');

const houseColliders = [];

const speed = 0.1;
const rotationSpeed = 0.05;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x740c0c, 0.06);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, baseCameraHeight, 5);
  camera.rotation.order = 'YXZ';

  renderer = new THREE.WebGLRenderer({antialias: true});

  // Set lower render resolution (half window size)
  renderer.setSize(window.innerWidth / 2, window.innerHeight / 2, false);

  // Upscale canvas with CSS to fill the window
  renderer.domElement.style.width = window.innerWidth + 'px';
  renderer.domElement.style.height = window.innerHeight + 'px';

  renderer.setClearColor(new THREE.Color(0x740c0c)); // sky color
  document.getElementById('container').appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const loader = new THREE.TextureLoader();

  // Grass ground
  loader.load('assets/textures/grassTexture.png', function(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(600, 600);
    texture.encoding = THREE.sRGBEncoding;

      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;    

    const groundGeo = new THREE.PlaneGeometry(1000, 1000);
    groundMat = new THREE.MeshLambertMaterial({ map: texture });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Path on top of grass
    loader.load('assets/textures/pathTexture.png', function(pathTexture) {
      pathTexture.wrapS = THREE.RepeatWrapping;
      pathTexture.wrapT = THREE.RepeatWrapping;
      pathTexture.repeat.set(5, 16);  // Your requested tiling

      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;    

      const pathGeo = new THREE.PlaneGeometry(6, 30);
      const pathMat = new THREE.MeshLambertMaterial({ map: pathTexture, transparent: true });
      const path = new THREE.Mesh(pathGeo, pathMat);
      path.rotation.x = -Math.PI / 2;
      path.position.set(0, 0.01, 0);
      scene.add(path);
    });
  });

  // Houses
  loader.load('assets/textures/stoneTexture.png', function(stoneTexture) {
    stoneTexture.encoding = THREE.sRGBEncoding;
    stoneTexture.wrapS = THREE.RepeatWrapping;
    stoneTexture.wrapT = THREE.RepeatWrapping;
    stoneTexture.repeat.set(4, 4);

    stoneTexture.minFilter = THREE.NearestFilter;
    stoneTexture.magFilter = THREE.NearestFilter;
    stoneTexture.generateMipmaps = false;

    const wallHeight = 8;
    const wallGeometry = new THREE.BoxGeometry(3, wallHeight, 9);
    const wallMaterial = new THREE.MeshLambertMaterial({ map: stoneTexture });

    function createHouse(x, z) {
      const walls = new THREE.Mesh(wallGeometry, wallMaterial);
      walls.position.set(x, wallHeight / 2, z);
      scene.add(walls);

      // Create bounding box for collision
      const box = new THREE.Box3().setFromObject(walls);
      houseColliders.push(box);

      return { walls, box };
    }

    const housePositions = [
      [-10, -10],
      [-10, 0],
      [-10, 10],
      [10, -10],
      [10, 0],
      [10, 10]
    ];

    housePositions.forEach(pos => createHouse(pos[0], pos[1]));
  });

  window.addEventListener('resize', onWindowResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
}

function onWindowResize() {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();

  // Update renderer render size (half resolution)
  renderer.setSize(window.innerWidth / 2, window.innerHeight / 2, false);

  // Update CSS canvas size to full window
  renderer.domElement.style.width = window.innerWidth + 'px';
  renderer.domElement.style.height = window.innerHeight + 'px';
}

function onKeyDown(event) {
  switch(event.code) {
    case 'ArrowUp': case 'KeyW': moveForward = true; break;
    case 'ArrowDown': case 'KeyS': moveBackward = true; break;
    case 'ArrowLeft': case 'KeyA': rotateLeft = true; break;
    case 'ArrowRight': case 'KeyD': rotateRight = true; break;
  }
}

function onKeyUp(event) {
  switch(event.code) {
    case 'ArrowUp': case 'KeyW': moveForward = false; break;
    case 'ArrowDown': case 'KeyS': moveBackward = false; break;
    case 'ArrowLeft': case 'KeyA': rotateLeft = false; break;
    case 'ArrowRight': case 'KeyD': rotateRight = false; break;
  }
}

function checkCollision(position) {
  const collisionRadius = 0.5;
  const playerSphere = new THREE.Sphere(position, collisionRadius);

  for (const box of houseColliders) {
    if (box.intersectsSphere(playerSphere)) {
      return true;
    }
  }
  return false;
}

function animate() {
  requestAnimationFrame(animate);

  if (rotateLeft) camera.rotation.y += rotationSpeed;
  if (rotateRight) camera.rotation.y -= rotationSpeed;

  let direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  direction.y = 0;
  direction.normalize();

  const oldPos = camera.position.clone();

  let isWalking = false;

  if (moveForward) {
    camera.position.add(direction.clone().multiplyScalar(speed));
    if (checkCollision(camera.position)) camera.position.copy(oldPos);
    else isWalking = true;
  }
  if (moveBackward) {
    camera.position.add(direction.clone().multiplyScalar(-speed));
    if (checkCollision(camera.position)) camera.position.copy(oldPos);
    else isWalking = true;
  }

  // Vertigo effect only when NOT walking
  if (!isWalking) {
    vertigoTime += vertigoSpeed * 0.016; // assume ~60fps frame time
    camera.fov = baseFov + Math.sin(vertigoTime) * vertigoAmount;
    camera.updateProjectionMatrix();
  } else {
    // Reset FOV when walking
    if (camera.fov !== baseFov) {
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
    }
  }

  // Your existing bobbing code or camera Y position code can remain here

  if (camera.position.y < 1.5) camera.position.y = 1.5;

  if (groundMat && groundMat.map) {
    groundMat.map.offset.x = camera.position.x / 50;
    groundMat.map.offset.y = camera.position.z / 50;
  }

  renderer.render(scene, camera);
}


function resizeBlinkCanvas() {
  blinkCanvas.width = window.innerWidth;
  blinkCanvas.height = window.innerHeight;
  blinkCanvas.style.width = window.innerWidth + 'px';
  blinkCanvas.style.height = window.innerHeight + 'px';
}
resizeBlinkCanvas();
window.addEventListener('resize', resizeBlinkCanvas);

function drawBlinkingPixels() {
  blinkCtx.clearRect(0, 0, blinkCanvas.width, blinkCanvas.height);

  const pixelCount = 10; // how many blinking pixels per frame
  for (let i = 0; i < pixelCount; i++) {
    if (Math.random() > 0.7) { // 30% chance to draw pixel
      const x = Math.random() * blinkCanvas.width;
      const y = Math.random() * blinkCanvas.height;
      blinkCtx.fillStyle = 'white'; // or random colors like '#fff', '#f00', etc
      blinkCtx.fillRect(x, y, 2, 2); // 1px by 1px
    }
  }
  requestAnimationFrame(drawBlinkingPixels);
}
drawBlinkingPixels();