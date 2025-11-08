import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js?module';
import { fetchPlanes } from './planes.js';

let scene, camera, renderer;
let isDragging = false;
let prevMouse = { x: 0, y: 0 };
let spherical = { radius: 3, theta: Math.PI / 2, phi: Math.PI / 2 };
let earth;

init();
animate();

function init() {
	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);

	updateCameraPosition();

	renderer = new THREE.WebGLRenderer({
		antialias: true,
		canvas: document.getElementById('canvas')
	});
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(window.devicePixelRatio);

	const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
	directionalLight.position.set(5, 3, 5);
	scene.add(directionalLight);

	const loader = new THREE.TextureLoader();
	loader.load(
		'./utils/earth_texture_day.jpg',
		(texture) => {
			const geometry = new THREE.SphereGeometry(2, 64, 64);
			const material = new THREE.MeshPhongMaterial({ map: texture });
			earth = new THREE.Mesh(geometry, material);
			scene.add(earth);
		},
		undefined,
		(err) => console.error('Błąd wczytywania tekstury', err)
	);

	window.addEventListener('resize', onWindowResize);
	document.addEventListener('mousedown', onMouseDown);
	document.addEventListener('mouseup', onMouseUp);
	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('wheel', onMouseWheel);

	fetchPlanes(scene);
    setInterval(() => fetchPlanes(scene), 25000*10);

}

function updateCameraPosition() {
	const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
	const y = spherical.radius * Math.cos(spherical.phi);
	const z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);

	camera.position.set(x, y, z);
	camera.lookAt(0, 0, 0);
}

function onMouseDown(event) {
	isDragging = true;
	prevMouse.x = event.clientX;
	prevMouse.y = event.clientY;
}

function onMouseUp() {
	isDragging = false;
}

function onMouseMove(event) {
	if (!isDragging) return;

	const deltaX = event.clientX - prevMouse.x;
	const deltaY = event.clientY - prevMouse.y;

	const sensitivityX = 0.005;
	const sensitivityY = 0.005;

	spherical.theta -= deltaX * sensitivityX;
	spherical.phi -= deltaY * sensitivityY;
	spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi));

	updateCameraPosition();

	prevMouse.x = event.clientX;
	prevMouse.y = event.clientY;
}

function onMouseWheel(event) {
	spherical.radius += event.deltaY * 0.001;
	spherical.radius = Math.max(1.5, Math.min(10, spherical.radius));
	updateCameraPosition();
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
	requestAnimationFrame(animate);
	if (earth) earth.rotation.y += 0.000005;
	renderer.render(scene, camera);
}


