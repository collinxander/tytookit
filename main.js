// TY TO.OK IT — 3D Art Gallery scene
// Loads the model + textures from /public/artgallery and drives the
// loading UI (#progress-container / #progress-bar) already present in index.html.
//
// The camera starts locked at a fixed position and slowly spins a full
// 360° in place, forever — no user movement controls.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const GALLERY_PATH = "public/artgallery/untitled.gltf";

const progressContainer = document.getElementById("progress-container");
const progressText = document.getElementById("progress");
const progressBar = document.getElementById("progress-bar");
const enterWrap = document.querySelector(".enter-wrap");
const enterBtn = document.getElementById("enter-btn");

// ---------------------------------------------------------------------------
// Fixed camera spot — the scene starts here and never moves.
// ---------------------------------------------------------------------------
const START_POSITION = new THREE.Vector3(13.96, 4.75, 0.43);
const SPIN_DURATION = 45; // seconds for one slow, full 360° rotation
let spinYaw = 0; // radians, advances slowly every frame

// ---------------------------------------------------------------------------
// Intro animation — camera FOV easing and dolly
// ---------------------------------------------------------------------------
const INTRO_DURATION = 1.4; // seconds — matches CSS fade-in
const INTRO_START_FOV = 40; // starting field of view
const INTRO_END_FOV = 70; // ending field of view
const INTRO_DOLLY_BACK = 8; // how far camera moves forward during intro
let introElapsed = null; // null = intro not started, number = elapsed seconds

// ---------------------------------------------------------------------------
// Renderer / Scene / Camera
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.id = "gallery-canvas";
renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";
renderer.domElement.style.zIndex = "0";
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.FogExp2(0x05060a, 0.02);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  500
);
camera.position.copy(START_POSITION);

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x1a1208, 0.6);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xfff2df, 1.4);
keyLight.position.set(4, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 40;
keyLight.shadow.camera.left = -12;
keyLight.shadow.camera.right = 12;
keyLight.shadow.camera.top = 12;
keyLight.shadow.camera.bottom = -12;
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x00aaff, 6, 20, 2);
rimLight.position.set(-3, 3, -4);
scene.add(rimLight);

// ---------------------------------------------------------------------------
// Loading manager — drives #progress-bar / #progress text
// ---------------------------------------------------------------------------
const manager = new THREE.LoadingManager();

manager.onStart = () => {
  progressContainer?.classList.remove("ready", "hidden");
  if (progressText) progressText.textContent = "Loading Gallery…";
  if (progressBar) progressBar.style.width = "0%";
};

manager.onProgress = (_url, itemsLoaded, itemsTotal) => {
  const pct = itemsTotal ? Math.round((itemsLoaded / itemsTotal) * 100) : 0;
  if (progressBar) progressBar.style.width = `${pct}%`;
  if (progressText) progressText.textContent = `Loading Gallery… ${pct}%`;
};

manager.onError = (url) => {
  console.error("Error loading:", url);
  if (progressText) progressText.textContent = "Something went wrong loading the gallery.";
};

manager.onLoad = () => {
  if (progressBar) progressBar.style.width = "100%";
  if (progressText) progressText.textContent = "Gallery Ready";
  progressContainer?.classList.add("ready");
  if (typeof window.showEnterButton === "function") {
    window.showEnterButton();
  } else if (enterWrap) {
    enterWrap.style.opacity = "1";
    enterWrap.style.pointerEvents = "auto";
  }
};

// ---------------------------------------------------------------------------
// Load the gallery model
// ---------------------------------------------------------------------------
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/");

const gltfLoader = new GLTFLoader(manager);
gltfLoader.setDRACOLoader(dracoLoader);

let galleryRoot = null;

gltfLoader.load(
  GALLERY_PATH,
  (gltf) => {
    galleryRoot = gltf.scene;
    galleryRoot.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.needsUpdate = true;
        }
      }
    });
    scene.add(galleryRoot);

    camera.near = 0.05;
    camera.far = 500;
    camera.updateProjectionMatrix();
  },
  undefined,
  (error) => {
    console.error("Failed to load gallery scene:", error);
    if (progressText) progressText.textContent = "Failed to load gallery model.";
  }
);

// ---------------------------------------------------------------------------
// Enter interaction — reveal the gallery (camera stays locked & spinning)
// ---------------------------------------------------------------------------
const FADE_DURATION = 1.15; // seconds — matches the CSS iris clip-path transition

function enterGallery(originEl) {
  introElapsed = 0; // Start the intro animation

  // Position the iris burst at the button (or click point) so the
  // transition visually erupts from where the user actually clicked.
  const rect = originEl?.getBoundingClientRect?.();
  if (rect) {
    const ox = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
    const oy = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
    document.documentElement.style.setProperty("--ox", `${ox}%`);
    document.documentElement.style.setProperty("--oy", `${oy}%`);
  }

  enterBtn?.classList.add("igniting");
  // Let the button's shockwave/collapse play for a beat before the
  // full-screen iris takes over, so the two animations read as one motion.
  requestAnimationFrame(() => {
    document.body.classList.add("opening");
  });

  window.dispatchEvent(new CustomEvent("gallery:entered"));
  setTimeout(() => {
    progressContainer?.classList.add("hidden");
    document.getElementById("open-transition")?.remove();
    // Navigate to gallery.html after the iris has fully consumed the screen
    window.location.href = "gallery.html";
  }, FADE_DURATION * 1000 + 60);
}

if (enterBtn) {
  enterBtn.addEventListener("click", (event) => {
    event.preventDefault();
    enterGallery(enterBtn);
  });
}

document.getElementById("enter-gallery-button")?.addEventListener("click", (event) => {
  event.preventDefault();
  enterGallery(event.currentTarget);
});

// ---------------------------------------------------------------------------
// Resize + render loop
// ---------------------------------------------------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (galleryRoot) {
    rimLight.intensity = 5 + Math.sin(clock.elapsedTime * 1.5) * 1.5;
  }

  // Camera position never changes — only slowly rotate in place, forever.
  camera.position.copy(START_POSITION);
  spinYaw += (Math.PI * 2 * delta) / SPIN_DURATION;
  camera.quaternion.setFromEuler(new THREE.Euler(0, spinYaw, 0, "YXZ"));

  // Opening animation: ease the FOV in and dolly the camera forward along
  // its current facing direction, synced with the CSS iris-open transition.
  if (introElapsed !== null) {
    introElapsed += delta;
    const p = Math.min(introElapsed / INTRO_DURATION, 1);
    const eased = 1 - Math.pow(1 - p, 3); // cubic ease-out

    camera.fov = INTRO_START_FOV + (INTRO_END_FOV - INTRO_START_FOV) * eased;
    camera.updateProjectionMatrix();

    const remainingDolly = INTRO_DOLLY_BACK * (1 - eased);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(forward, -remainingDolly);

    if (p >= 1) introElapsed = null;
  }

  renderer.render(scene, camera);
}

animate();
