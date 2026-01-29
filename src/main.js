import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import GUI from "lil-gui";
import snowVertexShader from "./shaders/snow/vertex.glsl";
import snowFragmentShader from "./shaders/snow/fragment.glsl";

const id = (id) => document.getElementById(id);
const all = (sel) => document.querySelectorAll(sel);

const elements = {
	game: id("game"),
	canvas: id("webgl"),
	loaderWrap: id("loader-wrap"),
	loaderPs: all(".loader-p"),
	loaderPercent: id("loader-percent"),
	loaderBar: id("loader-bar"),
	soundBtn: id("sound-btn"),
	soundBars: all(".sound-bar"),
	screenBtn: id("screen-btn"),
	screens: all(".screen"),
};

const sounds = {
	ambientMusic: new Audio("/sounds/ambient.mp3"),
};
sounds.ambientMusic.loop = true;
let soundEnabled = true;

const sizes = { width: window.innerWidth, height: window.innerHeight };
const wait = (ms) => new Promise((res) => setTimeout(res, ms));
const transition = 500;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xa3c6e0, 50, 450);

const camera = new THREE.PerspectiveCamera(
	45,
	sizes.width / sizes.height,
	1,
	400,
);
const lookTarget = new THREE.Vector3(6, 3, -4);
camera.position.set(38, 3, 36);
camera.lookAt(lookTarget);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
	canvas: elements.canvas,
	alpha: false,
	antialias: true,
	powerPreference: "high-performance",
});

const setRenderer = () => {
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
};
setRenderer();

renderer.shadowMap.enabled = true;
renderer.setClearColor(0xa3c6e0);

const ambient = new THREE.AmbientLight(0xbfd6e6, 0.35);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffe5c5, 0.7);
sun.position.set(80, 70, -30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 300;
sun.shadow.camera.right = 170;
sun.shadow.camera.left = -110;
sun.shadow.camera.top = 120;
sun.shadow.camera.bottom = -40;
sun.shadow.bias = -0.001;
sun.shadow.normalBias = 0.05;
sun.shadow.radius = 2;
scene.add(sun);

scene.add(new THREE.DirectionalLightHelper(sun, 10));
scene.add(new THREE.CameraHelper(sun.shadow.camera));

//const controls = new OrbitControls(camera, renderer.domElement);
//controls.enableDamping = true;
//controls.enabled = false;

const snowCount = 1500;
const snowArea = 250;
const snowHeight = 80;
const snowGeometry = new THREE.BufferGeometry();
const snowPositions = new Float32Array(snowCount * 3);
const snowSpeeds = new Float32Array(snowCount);
const snowOffsets = new Float32Array(snowCount);
const snowSizes = new Float32Array(snowCount);

for (let i = 0; i < snowCount; i++) {
	snowPositions[i * 3] = (Math.random() - 0.5) * snowArea - 60;
	snowPositions[i * 3 + 1] = Math.random() * snowHeight;
	snowPositions[i * 3 + 2] = (Math.random() - 0.5) * snowArea;
	snowSpeeds[i] = 0.8 + Math.random();
	snowOffsets[i] = Math.random() * Math.PI * 2;
	snowSizes[i] = 1 + Math.random();
}

snowGeometry.setAttribute(
	"position",
	new THREE.BufferAttribute(snowPositions, 3),
);
snowGeometry.setAttribute("aSpeed", new THREE.BufferAttribute(snowSpeeds, 1));
snowGeometry.setAttribute("aOffset", new THREE.BufferAttribute(snowOffsets, 1));
snowGeometry.setAttribute("aSize", new THREE.BufferAttribute(snowSizes, 1));

const snowMaterial = new THREE.ShaderMaterial({
	uniforms: {
		uTime: { value: 0 },
		uHeight: { value: snowHeight },
	},
	vertexShader: snowVertexShader,
	fragmentShader: snowFragmentShader,
	transparent: true,
	depthWrite: false,
});

const snow = new THREE.Points(snowGeometry, snowMaterial);
snow.frustumCulled = false;
scene.add(snow);

let loaded = false;

const loadingManager = new THREE.LoadingManager(() => {
	loaded = true;
});
const gltfLoader = new GLTFLoader(loadingManager);

gltfLoader.load("/models/angrybirds.glb", (gltf) => {
	const root = gltf.scene.children[0];
	root.traverse((obj) => {
		if (!obj.isMesh) return;
		if (Array.isArray(obj.material)) {
			obj.material.forEach((mat) => {
				mat.flatShading = true;
				mat.needsUpdate = true;
			});
		} else {
			obj.material.flatShading = true;
			obj.material.needsUpdate = true;
		}
		if (obj.name === "Ground") {
			obj.receiveShadow = true;
		} else {
			obj.castShadow = true;
			obj.receiveShadow = true;
		}
	});
	scene.add(root);
});

const displayLoader = (visible) => {
	elements.loaderPs.forEach((p) => p.classList.toggle("active", visible));
	elements.loaderBar.classList.toggle("active", visible);
};

const handleLoaderProgress = (start, end) => {
	elements.loaderBar.style.setProperty("--s", (end / 100).toFixed(3));
	const startTime = performance.now();
	const update = (now) => {
		const progress = Math.min((now - startTime) / transition, 1);
		elements.loaderPercent.textContent = Math.round(
			start + (end - start) * progress,
		);
		if (progress < 1) requestAnimationFrame(update);
	};
	requestAnimationFrame(update);
};

const runLoader = async () => {
	displayLoader(true);
	await wait(750);
	handleLoaderProgress(0, 32);
	await wait(1000);
	handleLoaderProgress(32, 67);
	while (!loaded) await wait(100);
	await wait(750);
	handleLoaderProgress(67, 100);
	await wait(1000);
	displayLoader(false);
	await wait(250);
	elements.loaderWrap.classList.add("end");
	await wait(transition);
	elements.loaderWrap.classList.add("remove");
};

const runIntro = async () => {
	gsap.to(camera.position, {
		x: 46,
		y: 3,
		z: 0,
		duration: 3,
		ease: "power2.inOut",
	});
	gsap.to(lookTarget, {
		x: 6,
		y: 10,
		z: 0,
		duration: 3,
		ease: "power2.inOut",
		onUpdate: () => {
			camera.lookAt(lookTarget);
		},
	});
};

const runExperience = async () => {
	await runLoader();
	await runIntro();
};
runExperience();

const clock = new THREE.Clock();
const loop = () => {
	if (snowMaterial) snowMaterial.uniforms.uTime.value = clock.getElapsedTime();
	//controls.update();
	renderer.render(scene, camera);
	requestAnimationFrame(loop);
};
loop();

window.addEventListener("resize", () => {
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();
	setRenderer();
});

elements.screenBtn.addEventListener("click", () => {
	const fullscreenElement =
		document.fullscreenElement || document.webkitFullscreenElement;
	if (fullscreenElement) {
		document.exitFullscreen?.() || document.webkitExitFullscreen?.();
	} else {
		elements.game.requestFullscreen?.() ||
			elements.game.webkitRequestFullscreen?.();
	}
	elements.screens.forEach((path) => path.classList.toggle("active"));
});

elements.soundBtn.addEventListener("click", () => {
	soundEnabled = !soundEnabled;
	soundEnabled ? sounds.ambientMusic.play() : sounds.ambientMusic.pause();
	elements.soundBars.forEach((bar) => {
		bar.classList.toggle("paused", !soundEnabled);
	});
});

/*const gui = new GUI();
gui.add(sun.position, "x", -180, 180, 0.1).name("X (°)");
gui.add(sun.position, "y", -180, 180, 0.1).name("X (°)");
gui.add(sun.position, "z", -180, 180, 0.1).name("X (°)");*/

/*
elements.btns.forEach((btn) => {
	btn.addEventListener("click", () => {
		if (sound) {
			clickSound.currentTime = 0;
			clickSound.play();
		}
	});
});


document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		currentMusic.pause();
	} else if (sound) {
		currentMusic.play();
	}
});
*/

setInterval(() => {
	const info = renderer.info.render;
	console.log(
		`Triangles: ${info.triangles}, Draw Calls: ${info.calls}, Lines: ${info.lines}, Points: ${info.points}`,
	);
}, 2000);
