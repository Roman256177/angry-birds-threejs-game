import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import fontJSON from "three/examples/fonts/helvetiker_regular.typeface.json";
import gsap from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import snowVertexShader from "./shaders/snow/vertex.glsl";
import snowFragmentShader from "./shaders/snow/fragment.glsl";
import textVertexShader from "./shaders/text/vertex.glsl";
import textFragmentShader from "./shaders/text/fragment.glsl";

class Game {
	constructor() {
		const id = (id) => document.getElementById(id);
		const all = (sel) => document.querySelectorAll(sel);

		this.elements = {
			canvas: id("webgl"),
			loader: id("loader"),
			loaderBar: id("loader-bar"),
			loadingSpans: all("#loading span"),
			loadedSpans: all("#loaded span"),
			pressEnter: id("press-enter"),
			soundBtn: id("sound-btn"),
			soundBars: all(".sound-bar"),
			fsBtn: id("fs-btn"),
			fsIcons: all(".fs-icon"),
			zoomBars: all(".zoom-bar"),
		};

		this.sounds = {
			ambient: new Audio("/sounds/ambient.mp3"),
			add: {
				bird: new Audio("/sounds/add/bird.mp3"),
				pig: new Audio("/sounds/add/pig.mp3"),
				box: new Audio("/sounds/add/box.mp3"),
			},
			ui: {
				click: new Audio("/sounds/ui/click.wav"),
			},
		};

		this.sounds.ambient.loop = true;
		this.sounds.ambient.volume = 0.35;

		this.isSound = false;
		this.isCameraMove = false;
		this.isLoaded = false;

		this.cursor = { x: 0, y: 0 };
		this.sizes = { width: window.innerWidth, height: window.innerHeight };
		this.prevTime = 0;

		this.scene = new THREE.Scene();
		this.scene.fog = new THREE.Fog(0x7bb8e8, 10, 400);

		this.camera = new THREE.PerspectiveCamera(
			45,
			this.sizes.width / this.sizes.height,
			1,
			500,
		);
		this.cameraTargetBase = null;
		this.cameraTarget = new THREE.Vector3(2, 4, -6);
		this.camera.position.set(36, 3, 40);
		this.camera.lookAt(this.cameraTarget);
		this.scene.add(this.camera);
		//
		this.zoom = 1;
		this.zoomTarget = 1;
		this.lastActive = -1;

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.elements.canvas,
			alpha: false,
			antialias: true,
			powerPreference: "high-performance",
			outputColorSpace: THREE.SRGBColorSpace,
		});
		this.renderer.shadowMap.enabled = true;
		this.renderer.setClearColor(0x7bb8e8);
		this.setRenderer();

		this.world = new CANNON.World({
			gravity: new CANNON.Vec3(0, -9.82, 0),
		});

		this.loadingManager = new THREE.LoadingManager(
			() => (this.isLoaded = true),
		);
		this.gltfLoader = new GLTFLoader(this.loadingManager);
		this.fontLoader = new FontLoader();

		this.snow = null;
		this.title = null;
		this.subtitle = null;

		//
		this.isPlaying = false;

		this.helper = {
			birds: [],
			pigs: [],
			boxes: [],
			level01: null,
		};

		//this.controls = new OrbitControls(this.camera, this.elements.canvas);

		/*setInterval(() => {
			console.log("Renderer info:");
			console.log("Draw calls:", this.renderer.info.render.calls);
			console.log("Triangles:", this.renderer.info.render.triangles);
			console.log("Geometries:", this.renderer.info.memory.geometries);
			console.log("Textures:", this.renderer.info.memory.textures);
		}, 5000);*/
	}

	setRenderer() {
		this.renderer.setSize(this.sizes.width, this.sizes.height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	}

	init() {
		this.setupLights();
		this.setupSnow();
		this.setupTitle();
		this.setupEvents();
		this.loadModels();
		this.loop();
		this.start();
	}

	setupLights() {
		this.scene.add(new THREE.AmbientLight(0x7bb8e8, 0.45));

		const sun = new THREE.DirectionalLight(0xfff5c2, 0.9);
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
		//
		const cameraHelper = new THREE.CameraHelper(sun.shadow.camera);
		this.scene.add(cameraHelper);
	}
	//
	setupSnow() {
		const snowCount = 2000;
		const snowArea = 300;
		const snowHeight = 100;

		const geometry = new THREE.BufferGeometry();
		const positions = new Float32Array(snowCount * 3);
		const speeds = new Float32Array(snowCount);
		const winds = new Float32Array(snowCount);
		const sizes = new Float32Array(snowCount);

		for (let i = 0; i < snowCount; i++) {
			positions[i * 3 + 0] = (Math.random() - 0.5) * snowArea - 50;
			positions[i * 3 + 1] = Math.random() * snowHeight;
			positions[i * 3 + 2] = (Math.random() - 0.5) * snowArea;
			speeds[i] = 1.5 + Math.random();
			winds[i] = Math.random() * Math.PI * 2;
			sizes[i] = 1 + Math.random() * 0.5;
		}

		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
		geometry.setAttribute("aWind", new THREE.BufferAttribute(winds, 1));
		geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
		//
		const material = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0 },
				uHeight: { value: snowHeight },
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

	setupTitle() {
		const group = new THREE.Group();
		group.position.set(-400, 160, 0);
		group.rotation.y = Math.PI * 0.5;
		this.scene.add(group);
		const font = this.fontLoader.parse(fontJSON);

		const subtitleGeometry = new TextGeometry("* Christmas Edition *", {
			font: font,
			size: 8,
			depth: 0,
			curveSegments: 1,
		});
		const subtitleMaterial = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			fog: false,
			transparent: true,
			opacity: 0,
		});
		this.subtitle = new THREE.Mesh(subtitleGeometry, subtitleMaterial);
		this.subtitle.position.set(-115, 45, 0);
		group.add(this.subtitle);

		const titleGeometry = new TextGeometry("Angry Birds", {
			font: font,
			size: 44,
			depth: 0,
			curveSegments: 1,
		});
		titleGeometry.computeBoundingBox();
		titleGeometry.translate(
			-(titleGeometry.boundingBox.max.x - titleGeometry.boundingBox.min.x) *
				0.5,
			0,
			0,
		);
		const titleMaterial = new THREE.ShaderMaterial({
			precision: "lowp",
			uniforms: { uFade: { value: 0 } },
			vertexShader: textVertexShader,
			fragmentShader: textFragmentShader,
			transparent: true,
		});
		this.title = new THREE.Mesh(titleGeometry, titleMaterial);
		group.add(this.title);
	}
	//
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
		this.showSpans(this.elements.loadingSpans, true);
		this.toggleClass(this.elements.loaderBar, "active", true);
		await this.wait(1000);
		this.setLoaderProgress(0.33);
		await this.wait(1500);
		this.setLoaderProgress(0.66);
		await this.wait(1500);
		while (!this.isLoaded) await this.wait(25);
		this.setLoaderProgress(1);
		this.showSpans(this.elements.loadingSpans, false);
		await this.wait(500);
		this.showSpans(this.elements.loadedSpans, true);
		await this.wait(1000);
		this.toggleClass(this.elements.pressEnter, "active", true);
		await this.waitForEnter();
		this.toggleClass(this.elements.pressEnter, "active", false);
		this.toggleClass(this.elements.loaderBar, "active", false);
		this.showSpans(this.elements.loadedSpans, false, undefined, true);
		await this.wait(500);
		this.elements.loader.classList.add("remove");
		this.elements.canvas.classList.add("active");
		await this.wait(500);
		await this.animateCamera(60, 6, 0, 0, 12, 0);
		this.showTitle();
		this.showSpans(this.elements.zoomBars, true, 50);
		this.enableCameraMove(true);
	}

	wait(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async showSpans(spans, bool, delay = 25, reverse = false) {
		const n = spans.length;
		for (let i = 0; i < n; i++) {
			const index = !bool && reverse ? n - 1 - i : i;
			spans[index].classList.toggle("show", bool);
			await this.wait(delay);
		}
	}

	toggleClass(element, name, bool) {
		element.classList.toggle(name, bool);
	}

	setLoaderProgress(value) {
		this.elements.loaderBar.style.setProperty("--s", value);
	}

	waitForEnter() {
		return new Promise((resolve) => {
			const onKey = (e) => {
				if (e.code !== "Enter" || e.repeat) return;
				document.removeEventListener("keydown", onKey);
				this.toggleSound();
				resolve();
			};
			document.addEventListener("keydown", onKey);
		});
	}

	animateCamera(camX, camY, camZ, tarX, tarY, tarZ) {
		return new Promise((resolve) => {
			const tl = gsap.timeline({ onComplete: resolve });
			tl.to(
				this.camera.position,
				{ x: camX, y: camY, z: camZ, duration: 3, ease: "power1.inOut" },
				0,
			);
			tl.to(
				this.cameraTarget,
				{
					x: tarX,
					y: tarY,
					z: tarZ,
					duration: 3,
					ease: "power1.inOut",
					onUpdate: () => this.camera.lookAt(this.cameraTarget),
				},
				0,
			);
		});
	}

	showTitle() {
		const tl = gsap.timeline();
		tl.to(
			this.title.material.uniforms.uFade,
			{
				value: 1,
				duration: 1,
				ease: "power1.inOut",
			},
			0,
		);
		tl.to(
			this.subtitle.material,
			{
				opacity: 1,
				duration: 1,
				ease: "power1.inOut",
			},
			0,
		);
		tl.to(
			this.subtitle.position,
			{
				y: 40,
				duration: 1,
				ease: "power1.inOut",
			},
			0,
		);
	}

	enableCameraMove(bool) {
		this.isCameraMove = bool;
		if (bool) this.cameraTargetBase = this.cameraTarget.clone();
	}

	//
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
		if (!this.isSound) return;
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
			if (!this.isCameraMove) return;
			this.cursor.x = e.clientX / this.sizes.width - 0.5;
			this.cursor.y = e.clientY / this.sizes.height - 0.5;
		});

		document.addEventListener("visibilitychange", () => {
			if (document.hidden) {
				this.sounds.ambient.pause();
			} else if (this.isSound) {
				this.sounds.ambient.play();
			}
		});

		this.elements.fsBtn.addEventListener("click", () => {
			if (document.fullscreenElement || document.webkitFullscreenElement) {
				document.exitFullscreen?.() || document.webkitExitFullscreen?.();
			} else {
				document.documentElement.requestFullscreen?.() ||
					document.documentElement.webkitRequestFullscreen?.();
			}
			this.elements.fsIcons.forEach((el) => el.classList.toggle("active"));
		});

		this.elements.soundBtn.addEventListener(
			"click",
			this.toggleSound.bind(this),
		);

		window.addEventListener("wheel", (e) => {
			if (!this.isCameraMove) return;
			this.zoomTarget += e.deltaY * -0.001;
			this.zoomTarget = Math.min(Math.max(this.zoomTarget, 1), 4);
		});

		[this.elements.fsBtn, this.elements.soundBtn].forEach((btn) => {
			btn.addEventListener("click", () => this.playSound(this.sounds.ui.click));
		});
	}

	toggleSound() {
		this.isSound = !this.isSound;
		this.isSound ? this.sounds.ambient.play() : this.sounds.ambient.pause();
		this.elements.soundBars.forEach((bar) =>
			bar.classList.toggle("active", this.isSound),
		);
	}

	loop(time) {
		requestAnimationFrame(this.loop.bind(this));
		const delta = Math.min((time - this.prevTime) / 1000, 0.1);
		this.prevTime = time;

		if (this.snow) this.snow.material.uniforms.uTime.value = time / 1000;

		if (this.isCameraMove) {
			const lerpSpeed = 5 * delta;

			this.zoom += (this.zoomTarget - this.zoom) * lerpSpeed;
			this.camera.zoom = this.zoom;
			this.camera.updateProjectionMatrix();

			const zoomFactor = 1 + ((this.zoom - 1) / 3) * 3;
			const targetZ = this.cameraTargetBase.z - this.cursor.x * zoomFactor * 10;
			const targetY = this.cameraTargetBase.y - this.cursor.y * zoomFactor * 5;
			this.cameraTarget.z += (targetZ - this.cameraTarget.z) * lerpSpeed;
			this.cameraTarget.y += (targetY - this.cameraTarget.y) * lerpSpeed;
			this.camera.lookAt(this.cameraTarget);

			const active = Math.round(
				((this.zoom - 1) / 3) * this.elements.zoomBars.length,
			);
			if (active !== this.lastActive) {
				this.elements.zoomBars.forEach((z, i) =>
					z.classList.toggle("active", i < active),
				);
				this.lastActive = active;
			}
		}
		//
		if (this.isPlaying) {
			this.world.step(1 / 60, delta, 3);
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

		//this.controls.update();
	}
}

const game = new Game();
game.init();
