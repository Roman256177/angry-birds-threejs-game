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

		this.showCursorText = false;
		this.mouseMoved = false;

		this.scene = new THREE.Scene();
		this.scene.fog = new THREE.Fog(0x9aa8bf, 50, 450);

		this.camera = new THREE.PerspectiveCamera(
			45,
			this.sizes.width / this.sizes.height,
			1,
			450,
		);
		this.lookTarget = new THREE.Vector3(2, 4, -6);
		this.camera.position.set(36, 3, 40);
		this.camera.lookAt(this.lookTarget);
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

		this.physicsWorld = new CANNON.World({
			gravity: new CANNON.Vec3(0, -9.82, 0),
		});

		this.clock = new THREE.Clock();
		this.loadingManager = new THREE.LoadingManager(() => (this.loaded = true));
		this.gltfLoader = new GLTFLoader(this.loadingManager);
		this.fontLoader = new FontLoader();
		this.loaded = false;

		this.snowCount = 1500;
		this.snowArea = 300;
		this.snowHeight = 100;
		this.snow = null;

		this.text = null;

		this.game = {
			birds: [],
			pigs: [],
			boxes: [],
			level01: [],
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
		const offsets = new Float32Array(this.snowCount);
		const sizes = new Float32Array(this.snowCount);

		for (let i = 0; i < this.snowCount; i++) {
			positions[i * 3 + 0] = (Math.random() - 0.5) * this.snowArea - 50;
			positions[i * 3 + 1] = Math.random() * this.snowHeight;
			positions[i * 3 + 2] = (Math.random() - 0.5) * this.snowArea;
			speeds[i] = 1 + Math.random();
			offsets[i] = Math.random() * Math.PI * 2;
			sizes[i] = 1 + Math.random() * 0.5;
		}

		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
		geometry.setAttribute("aOffset", new THREE.BufferAttribute(offsets, 1));
		geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

		const material = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0 },
				uHeight: { value: this.snowHeight },
			},
			vertexShader: snowVertexShader,
			fragmentShader: snowFragmentShader,
			transparent: true,
			blending: THREE.AdditiveBlending,
		});

		this.snow = new THREE.Points(geometry, material);
		this.snow.frustumCulled = false;
		this.scene.add(this.snow);
	}

	setupText(content) {
		const font = this.fontLoader.parse(fontJSON);

		const geometry = new TextGeometry(content, {
			font,
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

	updateText(newText) {
		this.scene.remove(this.text);
		this.text.geometry.dispose();
		this.text.material.dispose();
		this.setupText(newText);
	}

	loadModels() {
		this.gltfLoader.load("/models/angrybirds.glb", (gltf) => {
			const root = gltf.scene.children[0];
			root.traverse((obj) => {
				if (obj.name === "Level01") {
					this.game.level01 = [...obj.children];
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
					const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
					groundBody.quaternion.setFromEuler(-Math.PI * 0.5, 0, 0);
					this.physicsWorld.addBody(groundBody);
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
		await this.runIntro();
	}

	async runLoader() {
		this.displayLoader(true);
		await this.wait(1000);
		this.handleLoaderProgress(0, 32);
		await this.wait(1250);
		this.handleLoaderProgress(32, 67);
		while (!this.loaded) await this.wait(100);
		await this.wait(1000);
		this.handleLoaderProgress(67, 100);
		await this.wait(1250);
		this.displayLoader(false);
		await this.wait(this.transition);
		this.elements.loaderWrap.classList.add("end");
		await this.wait(this.transition);
		this.elements.loaderWrap.classList.add("remove");
	}

	displayLoader(visible) {
		this.elements.loaderPs.forEach((p) =>
			p.classList.toggle("active", visible),
		);
		this.elements.loaderBar.classList.toggle("active", visible);
	}

	handleLoaderProgress(start, end) {
		this.elements.loaderBar.style.setProperty("--s", (end / 100).toFixed(2));
		const startTime = performance.now();
		const update = (now) => {
			const progress = Math.min((now - startTime) / this.transition, 1);
			this.elements.loaderPercent.textContent = Math.round(
				start + (end - start) * progress,
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
		this.showCursorText = true;
		document.addEventListener(
			"click",
			() => {
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
			gsap.to(this.lookTarget, {
				x: x2,
				y: y2,
				z: z2,
				duration: 3,
				ease: "power1.inOut",
				onUpdate: () => this.camera.lookAt(this.lookTarget),
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
		this.updateText("Level01");
		await this.showText();
		await this.animateCamera(10, 20, -40, -30, 0, 0);
		await this.addLevelObjects();
		await this.animateCamera(50, 10, 0, 0, 6, 0);
		this.initGameLoop();
	}

	async addLevelObjects() {
		for (const obj of this.game.level01) {
			this.scene.getObjectByName("Level01").add(obj);

			let type = null;
			if (obj.name.includes("Bird")) type = "bird";
			else if (obj.name.includes("Pig")) type = "pig";
			else if (obj.name.includes("Box")) type = "box";
			this.playSound(this.sounds.add[type]);

			const box = new THREE.Box3().setFromObject(obj);
			const size = box.getSize(new THREE.Vector3());
			const center = box.getCenter(new THREE.Vector3());
			const shape = new CANNON.Box(
				new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2),
			);
			const body = new CANNON.Body({
				mass: type === "pig" || type === "box" ? 1 : 0,
				position: new CANNON.Vec3(center.x, center.y, center.z),
				shape,
			});
			this.physicsWorld.addBody(body);

			obj.userData.physicsBody = body;
			if (type === "bird") this.game.birds.push(obj);
			else if (type === "pig") this.game.pigs.push(obj);
			else if (type === "box") this.game.boxes.push(obj);

			await this.wait(100);
		}
	}

	playSound(sound) {
		if (!this.isSoundEnabled) return;
		sound.currentTime = 0;
		sound.play();
	}

	initGameLoop() {}

	updateGameLoop(deltaTime) {
		/*if (this.isPlaying) {
			this.physicsWorld.step(1 / 60, deltaTime, 3);

			this.syncPhysicsToMeshes();
		}*/
	}

	syncPhysicsToMeshes() {
		/*[...this.game.birds, ...this.game.pigs, ...this.game.boxes].forEach(
			(obj) => {
				if (obj.userData.physicsBody) {
					const body = obj.userData.physicsBody;
					obj.position.copy(body.position);
					obj.quaternion.copy(body.quaternion);
				}
			},
		);*/
	}

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
			if (this.showCursorText) {
				this.elements.cursorText.classList.add("active");
				this.showCursorText = false;
			}
			this.elements.cursorWrap.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
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

		this.updateGameLoop(this.clock.getDelta());
		this.renderer.render(this.scene, this.camera);
	}
}

const experience = new Experience();
experience.init();
