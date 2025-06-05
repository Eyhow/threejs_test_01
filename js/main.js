// Basic Three.js setup
let npcCooldown = false;
const npcMaxDistance = 35; // beyond this, he's "lost in fog"
let scene, camera, renderer;

const flowerGroup = new THREE.Group();

let moveForward = false;
let nextTeleportTime = 0;
let teleportCooldown = 8000 + Math.random() * 8000; // 8–16s delay
let hasTeleported = false;
let moveBackward = false;
let rotateLeft = false;
let rotateRight = false;
let groundMat;
let houseColliders = [];

let lastFlowerUpdatePos = new THREE.Vector3();

let gameStarted = false;

const flowerPaths = [
'assets/textures/flowers/flower1.png',
'assets/textures/flowers/flower2.png',
'assets/textures/flowers/flower3.png'
];

const speed = 0.1;
const rotationSpeed = 0.05;

const vertigoSpeed = 1.5;    // How fast the zoom oscillates
const vertigoAmount = 1.2;   // How much FOV changes (degrees)
const baseFov = 75;          // Normal FOV

const bobbingSpeed = 15;     // how fast the bobbing cycles
const bobbingAmount = 0.12;  // how much vertical movement
const baseCameraHeight = 2;  // camera base height

let bobbingTime = 0;
let vertigoTime = 0;

const blinkCanvas = document.getElementById('blinkCanvas');
const blinkCtx = blinkCanvas.getContext('2d');

const screenLinesCanvas = document.getElementById('screenLinesCanvas');
const screenLinesCtx = screenLinesCanvas.getContext('2d');

init();
animate();

function onKeyDown(event) {
  if (!gameStarted) return; // ignore keys until game started
  switch(event.code) {
    case 'ArrowUp': case 'KeyW': moveForward = true; break;
    case 'ArrowDown': case 'KeyS': moveBackward = true; break;
    case 'ArrowLeft': case 'KeyA': rotateLeft = true; break;
    case 'ArrowRight': case 'KeyD': rotateRight = true; break;
  }
}

function onKeyUp(event) {
  if (!gameStarted) return; // ignore keys until game started
  switch(event.code) {
    case 'ArrowUp': case 'KeyW': moveForward = false; break;
    case 'ArrowDown': case 'KeyS': moveBackward = false; break;
    case 'ArrowLeft': case 'KeyA': rotateLeft = false; break;
    case 'ArrowRight': case 'KeyD': rotateRight = false; break;
  }
}

function init() {

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x740c0c, 0.06);

  camera = new THREE.PerspectiveCamera(baseFov, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, baseCameraHeight, 5);
  camera.rotation.order = 'YXZ';

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  
  // Enable shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;

  // Lower render resolution for pixel effect
  renderer.setSize(window.innerWidth / 1.5, window.innerHeight / 1.5, false);

  // CSS upscale
  renderer.domElement.style.width = window.innerWidth + 'px';
  renderer.domElement.style.height = window.innerHeight + 'px';

  renderer.setClearColor(new THREE.Color(0x740c0c)); // sky color
  document.getElementById('container').appendChild(renderer.domElement);

  // Ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  // Directional light (like sun/moon)
  const dirLight = new THREE.DirectionalLight(0xffaa88, 1);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -20;
  dirLight.shadow.camera.right = 20;
  dirLight.shadow.camera.top = 20;
  dirLight.shadow.camera.bottom = -20;
  scene.add(dirLight);

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
    groundMat = new THREE.MeshLambertMaterial({ map: texture, flatShading: true });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    loader.load('assets/textures/pathTexture.png', function(pathTexture) {
      pathTexture.wrapS = THREE.RepeatWrapping;
      pathTexture.wrapT = THREE.RepeatWrapping;
      pathTexture.repeat.set(5, 600);

      pathTexture.minFilter = THREE.NearestFilter;
      pathTexture.magFilter = THREE.NearestFilter;
      pathTexture.generateMipmaps = false;

      const pathGeo = new THREE.PlaneGeometry(6, 1000);
      const pathMat = new THREE.MeshLambertMaterial({ map: pathTexture, transparent: true, flatShading: true });
      const path = new THREE.Mesh(pathGeo, pathMat);
      path.rotation.x = -Math.PI / 2;
      path.position.set(0, 0.01, 0);
      path.receiveShadow = true;
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
    const wallMaterial = new THREE.MeshLambertMaterial({ map: stoneTexture, flatShading: true });

    function createHouse(x, z) {
      const walls = new THREE.Mesh(wallGeometry, wallMaterial);
      walls.position.set(x, wallHeight / 2, z);
      walls.castShadow = true;
      walls.receiveShadow = true;
      scene.add(walls);

      // Collision bounding box
      const box = new THREE.Box3().setFromObject(walls);
      houseColliders.push(box);
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

  document.getElementById('startButton').addEventListener('click', () => {
        gameStarted = true;
        document.getElementById('welcomeMenu').style.display = 'none';
    });

  window.addEventListener('resize', onWindowResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  resizeBlinkCanvas();
  drawBlinkingPixels();
  drawScreenLines();

  setTimeout(() => {
  resizeScreenLinesCanvas();
  }, 100);

  // === CAMERA-FACING SPRITE ===

    // Load both textures with crisp settings
    const npcTextureNormal = loader.load('assets/textures/uhoh.png', tex => {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.anisotropy = 0;
    });

    const npcTextureFlipped = loader.load('assets/textures/uhohFlipped.png', tex => {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.anisotropy = 0;
    });

    const aspect = 100 / 256; // width / height of your image
    const height = 2.5;
    const width = height * aspect;

    const useFlipped = Math.random() < 0.05; // 5% chance to be upside down

    const npcMat = new THREE.SpriteMaterial({
    map: useFlipped ? npcTextureFlipped : npcTextureNormal,
    transparent: true
    });

    const npcSprite = new THREE.Sprite(npcMat);
    npcSprite.scale.set(width, useFlipped ? -height : height, 1); // flip if upside down
    npcSprite.position.y = height / 2;
    npcSprite.position.z = -5;

    scene.add(npcSprite);
    npcSprite.renderOrder = 1;


    scene.add(flowerGroup);
    spawnFlowersAroundPlayer();
    lastFlowerUpdatePos.copy(camera.position);



    // Store globally so you can update it in animate()
    window.npcSprite = npcSprite;
}

function onWindowResize() {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth / 1.5, window.innerHeight / 1.5, false);

  renderer.domElement.style.width = window.innerWidth + 'px';
  renderer.domElement.style.height = window.innerHeight + 'px';

  resizeBlinkCanvas();
  resizeScreenLinesCanvas();
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

function createFlowerSprite(texturePath, x, y, z, scale = 1) {
  const tex = new THREE.TextureLoader().load(texturePath, () => {
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  });

    const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    color: 0x999999 // or 0x999999 for darker flowers
    });


  const geo = new THREE.PlaneGeometry(1 * scale, 1.5 * scale);
  const plane1 = new THREE.Mesh(geo, mat);
  const plane2 = new THREE.Mesh(geo, mat);
  plane2.rotation.y = Math.PI / 2;

  const group = new THREE.Group();
  group.add(plane1);
  group.add(plane2);
  group.position.set(x, y, z);

  return group;
}

    function spawnFlowersAroundPlayer() {
    const playerX = camera.position.x;
    const playerZ = camera.position.z;

    const flowerRadius = 50;
    const maxFlowers = 150;

    // === Step 1: Remove far-away flowers ===
    const keepFlowers = [];
    flowerGroup.children.forEach(flower => {
        const dx = flower.position.x - playerX;
        const dz = flower.position.z - playerZ;
        const distSq = dx * dx + dz * dz;
        if (distSq < flowerRadius * flowerRadius) {
        keepFlowers.push(flower); // Keep this one
        }
    });

    flowerGroup.clear(); // Clear the group
    keepFlowers.forEach(f => flowerGroup.add(f)); // Re-add nearby flowers

    // === Step 2: Spawn new ones to reach target count ===
    const needed = maxFlowers - flowerGroup.children.length;
    const minDistance = 10; // Avoid spawning too close

    for (let i = 0; i < needed; i++) {
        let x, z, distance;

        // Try until we find a point far enough
        do {
        const angle = Math.random() * Math.PI * 2;
        distance = minDistance + Math.random() * (flowerRadius - minDistance);
        x = playerX + Math.cos(angle) * distance;
        z = playerZ + Math.sin(angle) * distance;
        } while (x > -4 && x < 4 && z > -500 && z < 500); // Skip path

        const texture = flowerPaths[Math.floor(Math.random() * flowerPaths.length)];
        const flower = createFlowerSprite(texture, x, 0.02, z, 0.3 + Math.random() * 0.1);
        flowerGroup.add(flower);
    }
    }


function maybeUpdateFlowers() {
  if (!gameStarted) return;
  const dist = camera.position.distanceTo(lastFlowerUpdatePos);
  if (dist > 8) {
    spawnFlowersAroundPlayer();
    lastFlowerUpdatePos.copy(camera.position);
  }
}


function animate() {
  requestAnimationFrame(animate);

  if (!gameStarted) {
    renderer.render(scene, camera);
    return;
  }

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

  // Vertigo effect only when NOT walking and game started
  if (gameStarted && !isWalking) {
    vertigoTime += vertigoSpeed * 0.016; // assume ~60fps
    camera.fov = baseFov + Math.sin(vertigoTime) * vertigoAmount;
    camera.updateProjectionMatrix();
  } else {
    if (camera.fov !== baseFov) {
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
    }
  }

  // View bobbing when walking
  if (isWalking) {
    bobbingTime += bobbingSpeed * 0.016;
    camera.position.y = baseCameraHeight + Math.sin(bobbingTime) * bobbingAmount;
  } else {
    bobbingTime = 0;
    camera.position.y = baseCameraHeight;
  }

  if (camera.position.y < 1.5) camera.position.y = 1.5;

  if (groundMat && groundMat.map) {
    groundMat.map.offset.x = camera.position.x / 50;
    groundMat.map.offset.y = camera.position.z / 50;
  }
    // Always face camera
    if (npcSprite) {
        npcSprite.lookAt(camera.position);
    }

    // === NPC Fog Teleport Logic ===
    if (npcSprite && gameStarted && !npcCooldown) {
    const distance = camera.position.distanceTo(npcSprite.position);

    if (distance > npcMaxDistance) {
        // Get direction the player is looking
        const viewDir = new THREE.Vector3();
        camera.getWorldDirection(viewDir);
        viewDir.y = 0;
        viewDir.normalize();

        // Place NPC behind the player
        const behind = camera.position.clone().sub(viewDir.multiplyScalar(3));
        behind.y = 1.5;
        npcSprite.position.copy(behind);

        // Fade in
        npcSprite.material.opacity = 0;
        let fade = 0;
        function fadeIn() {
        fade += 0.05;
        if (fade <= 1) {
            npcSprite.material.opacity = fade;
            requestAnimationFrame(fadeIn);
        }
        }
        fadeIn();

        // Cooldown so he doesn’t teleport every frame
        npcCooldown = true;
        setTimeout(() => { npcCooldown = false; }, 6000); // adjust as needed
    }
    }

    // === NPC Avoid Player Logic ===
    if (npcSprite && gameStarted) {
    const distToPlayer = camera.position.distanceTo(npcSprite.position);
    
    if (distToPlayer < 3) {  // When too close
        const away = npcSprite.position.clone().sub(camera.position).normalize();
        away.y = 0; // Keep it horizontal
        npcSprite.position.add(away.multiplyScalar(0.097)); // Adjust speed here
    }
    }

    if (npcSprite && gameStarted) {
    const distToPlayer = camera.position.distanceTo(npcSprite.position);

    // Glitch layer opacity control
    const glitch = document.getElementById('grainOverlay');
    const maxDist = 3;
    const minDist = 0.8;
    const clamped = Math.max(0, Math.min(1, (maxDist - distToPlayer) / (maxDist - minDist)));
    glitch.style.opacity = (clamped * 0.6).toFixed(3); // up to 40% opacity max
    }

    maybeUpdateFlowers();

    renderer.render(scene, camera);
}

function resizeBlinkCanvas() {
  blinkCanvas.width = window.innerWidth;
  blinkCanvas.height = window.innerHeight;
  blinkCanvas.style.width = window.innerWidth + 'px';
  blinkCanvas.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', resizeBlinkCanvas);

function drawBlinkingPixels() {
  blinkCtx.clearRect(0, 0, blinkCanvas.width, blinkCanvas.height);

  const pixelCount = 10;
  for (let i = 0; i < pixelCount; i++) {
    if (Math.random() > 0.7) {
      const x = Math.random() * blinkCanvas.width;
      const y = Math.random() * blinkCanvas.height;
      blinkCtx.fillStyle = 'white';
      blinkCtx.fillRect(x, y, 2, 2);
    }
  }
  requestAnimationFrame(drawBlinkingPixels);
}

function resizeScreenLinesCanvas() {
  screenLinesCanvas.width = window.innerWidth;
  screenLinesCanvas.height = window.innerHeight;
  screenLinesCanvas.style.width = window.innerWidth + 'px';
  screenLinesCanvas.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', resizeScreenLinesCanvas);

function drawScreenLines() {
  screenLinesCtx.clearRect(0, 0, screenLinesCanvas.width, screenLinesCanvas.height);
  
  screenLinesCtx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // semi-transparent black lines
  const lineHeight = 2; // thickness of each line in px
  const gapHeight = 4;  // gap between lines

  for(let y = 0; y < screenLinesCanvas.height; y += (lineHeight + gapHeight)) {
    screenLinesCtx.fillRect(0, y, screenLinesCanvas.width, lineHeight);
  }
  
  requestAnimationFrame(drawScreenLines);
}

// === Visual Glitch Slice ===
const glitch = document.createElement('div');
glitch.id = 'glitchLayer';
glitch.style.background = 'rgba(255,255,255,0.03)';
document.body.appendChild(glitch);
