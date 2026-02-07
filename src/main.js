import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import fontJSON from "three/examples/fonts/helvetiker_regular.typeface.json";
import gsap from "gsap";
import snowVertexShader from "./shaders/snow/vertex.glsl";
import snowFragmentShader from "./shaders/snow/fragment.glsl";
import textVertexShader from "./shaders/text/vertex.glsl";
import textFragmentShader from "./shaders/text/fragment.glsl";

class Experience {
	constructor() {
		const id = (id) => document.getElementById(id);
		const all = (sel) => document.querySelectorAll(sel);

		this.elements = {
			canvas: id("webgl"),
			loaderWrap: id("loader-wrap"),
			loaderPs: all(".loader-p"),
			loaderPercent: id("loader-percent"),
			loaderBar: id("loader-bar"),
			controls: id("controls"),
			soundBtn: id("sound-btn"),
			soundBars: all(".sound-bar"),
			screenBtn: id("screen-btn"),
			screens: all(".screen"),
			cursorWrap: id("cursor-wrap"),
			cursorText: id("cursor-text"),
		};

		this.sounds = {
			ambient: new Audio("/sounds/ambient.mp3"),
			add: {
				bird: new Audio("/sounds/add/bird.mp3"),
				pig: new Audio("/sounds/add/pig.mp3"),
				box: new Audio("/sounds/add/box.mp3"),
			},
		};
		this.sounds.ambient.loop = true;
		this.sounds.ambient.volume = 0.5;
		this.isSoundEnabled = false;

		this.sizes = { width: window.innerWidth, height: window.innerHeight };
		this.transition = 500;

		this.isCursorTextEnabled = false;
		this.mouseMoved = false;

		this.scene = new THREE.Scene();
		this.scene.fog = new THREE.Fog(0x9aa8bf, 50, 450);

		this.camera = new THREE.PerspectiveCamera(
			45,
			this.sizes.width / this.sizes.height,
			1,
			450,
		);
		this.cameraTarget = new THREE.Vector3(2, 4, -6);
		this.camera.position.set(36, 3, 40);
		this.camera.lookAt(this.cameraTarget);
		this.scene.add(this.camera);

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.elements.canvas,
			alpha: false,
			antialias: true,
			powerPreference: "high-performance",
		});
		this.renderer.shadowMap.enabled = true;
		this.renderer.setClearColor(0x9aa8bf);
		this.setRenderer();

		this.world = new CANNON.World({
			gravity: new CANNON.Vec3(0, -9.82, 0),
		});

		this.clock = new THREE.Clock();
		this.loadingManager = new THREE.LoadingManager(
			() => (this.isLoaded = true),
		);
		this.gltfLoader = new GLTFLoader(this.loadingManager);
		this.fontLoader = new FontLoader();
		this.isLoaded = false;

		this.snowCount = 2000;
		this.snowArea = 300;
		this.snowHeight = 100;
		this.snow = null;

		this.text = null;
		this.font = this.fontLoader.parse(fontJSON);

		this.isPlaying = false;

		this.helper = {
			birds: [],
			pigs: [],
			boxes: [],
			level01: null,
		};
	}

	setRenderer() {
		this.renderer.setSize(this.sizes.width, this.sizes.height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	}

	init() {
		this.setupLights();
		this.setupSnow();
		this.setupText("Angry Birds");
		this.loadModels();
		this.setupEvents();
		this.start();
		this.loop();
	}

	setupLights() {
		this.scene.add(new THREE.AmbientLight(0xcfd8e3, 0.35));

		const sun = new THREE.DirectionalLight(0xffe3b5, 0.7);
		sun.position.set(80, 60, -40);
		sun.castShadow = true;
		sun.shadow.mapSize.set(1024, 1024);
		sun.shadow.camera.near = 20;
		sun.shadow.camera.far = 260;
		sun.shadow.camera.right = 180;
		sun.shadow.camera.left = -120;
		sun.shadow.camera.top = 120;
		sun.shadow.camera.bottom = -50;
		sun.shadow.bias = -0.005;
		sun.shadow.normalBias = 0.05;
		sun.shadow.radius = 2;
		this.scene.add(sun);
	}

	setupSnow() {
		const geometry = new THREE.BufferGeometry();
		const positions = new Float32Array(this.snowCount * 3);
		const speeds = new Float32Array(this.snowCount);
		const winds = new Float32Array(this.snowCount);
		const sizes = new Float32Array(this.snowCount);

		for (let i = 0; i < this.snowCount; i++) {
			positions[i * 3 + 0] = (Math.random() - 0.5) * this.snowArea - 50;
			positions[i * 3 + 1] = Math.random() * this.snowHeight;
			positions[i * 3 + 2] = (Math.random() - 0.5) * this.snowArea;
			speeds[i] = 1 + Math.random();
			winds[i] = Math.random() * Math.PI * 2;
			sizes[i] = 1 + Math.random() * 0.5;
		}

		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
		geometry.setAttribute("aWind", new THREE.BufferAttribute(winds, 1));
		geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

		const material = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0 },
				uHeight: { value: this.snowHeight },
			},
			vertexShader: snowVertexShader,
			fragmentShader: snowFragmentShader,
			depthWrite: false,
			transparent: true,
		});

		this.snow = new THREE.Points(geometry, material);
		this.snow.frustumCulled = false;
		this.scene.add(this.snow);
	}

	setupText(content) {
		const geometry = new TextGeometry(content, {
			font: this.font,
			size: 40,
			depth: 0,
			curveSegments: 1,
		});
		geometry.computeBoundingBox();
		geometry.translate(
			-(geometry.boundingBox.max.x - geometry.boundingBox.min.x) * 0.5,
			0,
			0,
		);

		const material = new THREE.ShaderMaterial({
			uniforms: {
				uMinY: { value: geometry.boundingBox.min.y },
				uMaxY: { value: geometry.boundingBox.max.y },
			},
			vertexShader: textVertexShader,
			fragmentShader: textFragmentShader,
			transparent: true,
		});

		this.text = new THREE.Mesh(geometry, material);
		this.text.position.set(-360, 60, 0);
		this.text.rotation.y = Math.PI * 0.5;
		this.scene.add(this.text);
	}

	changeText(content) {
		this.scene.remove(this.text);
		this.text.geometry.dispose();
		this.text.material.dispose();
		this.setupText(content);
	}

	loadModels() {
		this.gltfLoader.load("/models/angrybirds.glb", (gltf) => {
			const root = gltf.scene.children[0];
			root.traverse((obj) => {
				if (obj.name === "Level01") {
					this.helper.level01 = obj;
					obj.children.forEach((child) => {
						if (child.name.includes("Bird")) this.helper.birds.push(child);
						else if (child.name.includes("Pig")) this.helper.pigs.push(child);
						else if (child.name.includes("Box")) this.helper.boxes.push(child);
					});
					obj.remove(...obj.children);
					return;
				}
				if (!obj.isMesh) return;

				const mats = Array.isArray(obj.material)
					? obj.material
					: [obj.material];
				mats.forEach((m) => {
					m.flatShading = true;
					m.needsUpdate = true;
				});

				if (obj.name === "Ground") {
					obj.receiveShadow = true;
					const groundShape = new CANNON.Plane();
					const groundBody = new CANNON.Body({ shape: groundShape });
					groundBody.quaternion.setFromEuler(-Math.PI * 0.5, 0, 0);
					this.world.addBody(groundBody);
				} else {
					obj.castShadow = true;
					obj.receiveShadow = true;
				}
			});

			this.scene.add(root);
		});
	}

	async start() {
		await this.runLoader();
		this.runIntro();
	}

	async runLoader() {
		this.showLoader(true);
		await this.wait(1000);
		this.handleLoader(0, 32);
		await this.wait(1250);
		this.handleLoader(32, 67);
		while (!this.isLoaded) await this.wait(100);
		await this.wait(1000);
		this.handleLoader(67, 100);
		await this.wait(1250);
		this.showLoader(false);
		await this.wait(this.transition);
		this.elements.loaderWrap.classList.add("end");
		await this.wait(this.transition);
		this.elements.loaderWrap.classList.add("remove");
	}

	showLoader(visible) {
		this.elements.loaderPs.forEach((p) =>
			p.classList.toggle("active", visible),
		);
		this.elements.loaderBar.classList.toggle("active", visible);
	}

	handleLoader(from, to) {
		this.elements.loaderBar.style.setProperty("--s", (to / 100).toFixed(2));
		const start = performance.now();
		const update = (now) => {
			const progress = Math.min((now - start) / this.transition, 1);
			this.elements.loaderPercent.textContent = Math.round(
				from + (to - from) * progress,
			);
			if (progress < 1) requestAnimationFrame(update);
		};
		requestAnimationFrame(update);
	}

	wait(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async runIntro() {
		await this.animateCamera(50, 4, 0, 0, 10, 0);
		await this.showText();
		if (this.mouseMoved) this.elements.cursorText.classList.add("active");
		this.isCursorTextEnabled = true;
		document.addEventListener(
			"click",
			() => {
				this.isCursorTextEnabled = false;
				this.elements.cursorText.classList.remove("active");
				if (!this.isSoundEnabled) this.toggleSound();
				this.setupLevel01();
			},
			{ once: true },
		);
	}

	animateCamera(x1, y1, z1, x2, y2, z2) {
		return new Promise((resolve) => {
			gsap.to(this.camera.position, {
				x: x1,
				y: y1,
				z: z1,
				duration: 3,
				ease: "power1.inOut",
			});
			gsap.to(this.cameraTarget, {
				x: x2,
				y: y2,
				z: z2,
				duration: 3,
				ease: "power1.inOut",
				onUpdate: () => this.camera.lookAt(this.cameraTarget),
				onComplete: resolve,
			});
		});
	}

	showText() {
		return new Promise((resolve) => {
			gsap.to(this.text.position, {
				y: 150,
				duration: 1,
				ease: "power1.inOut",
				onComplete: resolve,
			});
		});
	}

	async setupLevel01() {
		await new Promise((resolve) => {
			gsap.to(this.text.position, {
				y: 60,
				duration: 1,
				ease: "power1.inOut",
				onComplete: resolve,
			});
		});
		this.changeText("Level 01");
		await this.showText();
		await this.spawnObjects(this.helper.birds, "bird");
		await this.animateCamera(10, 20, -30, -30, 0, 10);
		await this.spawnObjects(this.helper.boxes, "box");
		await this.spawnObjects(this.helper.pigs, "pig");
		await this.animateCamera(50, 12, 0, 0, 4, 0);
		this.initGameLoop();
	}

	async spawnObjects(objs, type) {
		for (const obj of objs) {
			obj.position.y += 2;
			obj.scale.set(0.2, 0.2, 0.2);
			this.helper.level01.add(obj);

			gsap.to(obj.position, {
				y: obj.position.y - 2,
				duration: 0.75,
				ease: "bounce.out",
			});
			gsap.to(obj.scale, {
				x: 1,
				y: 1,
				z: 1,
				duration: 0.75,
				ease: "back.out(1.5)",
			});

			this.playSound(this.sounds.add[type]);
			await this.wait(100 + Math.random() * 100);
		}
	}

	playSound(sound) {
		if (!this.isSoundEnabled) return;
		sound.currentTime = 0;
		sound.play();
	}

	initGameLoop() {}

	setupEvents() {
		window.addEventListener("resize", () => {
			this.sizes.width = window.innerWidth;
			this.sizes.height = window.innerHeight;
			this.camera.aspect = this.sizes.width / this.sizes.height;
			this.camera.updateProjectionMatrix();
			this.setRenderer();
		});

		document.addEventListener("mousemove", (e) => {
			this.mouseMoved = true;
			this.elements.cursorWrap.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
			if (this.isCursorTextEnabled)
				this.elements.cursorText.classList.add("active");
		});

		document.addEventListener("visibilitychange", () => {
			if (document.hidden) {
				this.sounds.ambient.pause();
			} else if (this.isSoundEnabled) {
				this.sounds.ambient.play();
			}
		});

		this.elements.screenBtn.addEventListener("click", () => {
			const fs = document.fullscreenElement || document.webkitFullscreenElement;
			if (fs) {
				document.exitFullscreen?.() || document.webkitExitFullscreen?.();
			} else {
				const el = document.documentElement;
				el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
			}
			this.elements.screens.forEach((el) => el.classList.toggle("active"));
		});

		this.elements.soundBtn.addEventListener(
			"click",
			this.toggleSound.bind(this),
		);
	}

	toggleSound() {
		this.isSoundEnabled = !this.isSoundEnabled;
		this.isSoundEnabled
			? this.sounds.ambient.play()
			: this.sounds.ambient.pause();
		this.elements.soundBars.forEach((bar) =>
			bar.classList.toggle("active", this.isSoundEnabled),
		);
	}

	loop() {
		requestAnimationFrame(this.loop.bind(this));

		if (this.snow)
			this.snow.material.uniforms.uTime.value = this.clock.getElapsedTime();

		if (this.isPlaying) {
			this.world.step(1 / 60, this.clock.getDelta(), 3);

			[...this.helper.birds, ...this.helper.pigs, ...this.helper.boxes].forEach(
				(obj) => {
					const body = obj.userData.physicsBody;
					if (body) {
						obj.position.copy(body.position);
						obj.quaternion.copy(body.quaternion);
					}
				},
			);
		}

		this.renderer.render(this.scene, this.camera);
	}
}

const experience = new Experience();
experience.init();
