import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Tween, Easing, update as TWEEN_UPDATE } from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js';

const GRAVITY = -9.8;
const FLOOR_Y = 0.3;
const CAN_RADIUS = 0.3;
const ROOM_HALF_WIDTH = 10;
const CAN_MASS = 1;
const CAN_BOUNCE = 0.3;
const FRICTION = 0.9;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0);

const player = new THREE.Group();
player.add(camera);
scene.add(player);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const ambientLight = new THREE.AmbientLight(0x404040, 10);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 3);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

const wallMat = new THREE.MeshStandardMaterial({ color: 0xFFAFAF });
const floorGeo = new THREE.BoxGeometry(20, 1, 20);
const floorMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.position.set(0, -0.5, 0);
scene.add(floor);

const wallGeo = new THREE.BoxGeometry(20, 10, 1);
const backWall = new THREE.Mesh(wallGeo, wallMat);
backWall.position.set(0, 5, -ROOM_HALF_WIDTH);
scene.add(backWall);

const frontWall = new THREE.Mesh(wallGeo, wallMat);
frontWall.position.set(0, 5, ROOM_HALF_WIDTH);
scene.add(frontWall);

const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 20), wallMat);
leftWall.position.set(-ROOM_HALF_WIDTH, 5, 0);
scene.add(leftWall);

const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 20), wallMat);
rightWall.position.set(ROOM_HALF_WIDTH, 5, 0);
scene.add(rightWall);

const walls = [backWall, frontWall, leftWall, rightWall, floor];

const cans = [];
const canGeo = new THREE.CylinderGeometry(CAN_RADIUS, CAN_RADIUS, 0.6, 16);
const canMat = new THREE.MeshStandardMaterial({ color: 0x00ffff });
const canCount = 5;

for (let i = 0; i < canCount; i++) {
    const can = new THREE.Mesh(canGeo, canMat);
    can.position.set(0, FLOOR_Y + i * 0.6, -5);
    can.userData = { vel: new THREE.Vector3(), mass: CAN_MASS };
    scene.add(can);
    cans.push(can);
}

const bazooka = new THREE.Group();

const tubeGeo = new THREE.CylinderGeometry(0.2, 0.2, 2, 16, 1, true);
const tubeMat = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide });
const tube = new THREE.Mesh(tubeGeo, tubeMat);
tube.rotation.z = Math.PI / 2;
bazooka.add(tube);

const handleGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
const handleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
const handle = new THREE.Mesh(handleGeo, handleMat);
handle.position.set(-0.5, -0.5, 0);
bazooka.add(handle);

const playerLight = new THREE.SpotLight(0xffffff, 5, 10, Math.PI / 6, 0.5);
playerLight.position.set(0, 0, 0);
const playerLightTarget = new THREE.Object3D();
playerLightTarget.position.set(0, 0, -1);
playerLight.target = playerLightTarget;
bazooka.add(playerLight);
bazooka.add(playerLightTarget);

camera.add(bazooka);
bazooka.position.set(0.5, 0.0, -0.5);
bazooka.rotation.set(1.4, -1.4, 1.4);

const projectiles = [];
const raycaster = new THREE.Raycaster();
const PROJECTILE_SPEED = 30;
const PROJECTILE_IMPULSE = 30;

const insideProjectileGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 12);
const insideProjectileMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
const insideProjectile = new THREE.Mesh(insideProjectileGeo, insideProjectileMat);
insideProjectile.rotation.x = Math.PI / 2;
insideProjectile.rotation.z = Math.PI / 2;
insideProjectile.position.set(1, 0, 0);
insideProjectile.visible = false;
bazooka.add(insideProjectile);

let canShoot = true;

function reloadBazooka() {
    insideProjectile.visible = true;
    const startPos = { z: bazooka.position.z };
    const reloadDistance = 0.3;

    new Tween({ z: 0 })
        .to({ z: -reloadDistance }, 200)
        .onUpdate(obj => { bazooka.position.z = startPos.z + obj.z; })
        .chain(
            new Tween({ z: -reloadDistance })
                .to({ z: 0 }, 400)
                .onUpdate(obj => { bazooka.position.z = startPos.z + obj.z; })
                .onComplete(() => {
                    insideProjectile.visible = false;
                    canShoot = true;
                })
        )
        .start();
}

function shoot() {
    if (!canShoot) return;

    const projGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 12);
    const projMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const projectile = new THREE.Mesh(projGeo, projMat);
    const tempQuaternion = new THREE.Quaternion();
    camera.getWorldQuaternion(tempQuaternion);
    projectile.quaternion.copy(tempQuaternion);
    projectile.rotateX(Math.PI / 2);

    const worldPos = new THREE.Vector3();
    bazooka.getWorldPosition(worldPos);
    projectile.position.copy(worldPos);
    scene.add(projectile);

    const shootDirection = new THREE.Vector3();
    camera.getWorldDirection(shootDirection);

    projectile.userData.vel = shootDirection.clone().multiplyScalar(PROJECTILE_SPEED);
    projectile.userData.dir = shootDirection.clone();

    projectiles.push({ mesh: projectile, vel: projectile.userData.vel });
    canShoot = false;
    reloadBazooka();
}

window.addEventListener('mousedown', (e) => {
    if (e.button === 0 && document.pointerLockElement === document.body) shoot();
});

function spawnExplosion(pos) {
    const geo = new THREE.SphereGeometry(0.1, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.copy(pos);
    sphere.material.transparent = true;
    scene.add(sphere);

    new Tween({ scale: 0.1, alpha: 1 })
        .to({ scale: 5, alpha: 0 }, 500)
        .onUpdate(obj => {
            sphere.scale.set(obj.scale, obj.scale, obj.scale);
            sphere.material.opacity = obj.alpha;
        })
        .onComplete(() => scene.remove(sphere))
        .start();
}

const controls = { velocity: new THREE.Vector3(), movementSpeed: 8.0, turnSpeed: 0.0015 };
const keys = {};

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
document.body.addEventListener('click', () => document.body.requestPointerLock());

document.addEventListener('mousemove', e => {
    if (document.pointerLockElement !== document.body) return;
    player.rotation.y -= e.movementX * controls.turnSpeed;
    let newPitch = camera.rotation.x - e.movementY * controls.turnSpeed;
    camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, newPitch));
});

let prevTime = performance.now();

function updatePlayer(delta) {
    if (document.pointerLockElement !== document.body) return;

    const moveSpeed = controls.movementSpeed * delta;
    controls.velocity.x -= controls.velocity.x * 10.0 * delta;
    controls.velocity.z -= controls.velocity.z * 10.0 * delta;

    let moveX = 0, moveZ = 0;
    if (keys['KeyW']) moveZ -= moveSpeed;
    if (keys['KeyS']) moveZ += moveSpeed;
    if (keys['KeyA']) moveX -= moveSpeed;
    if (keys['KeyD']) moveX += moveSpeed;

    controls.velocity.x += moveX;
    controls.velocity.z += moveZ;

    player.translateX(controls.velocity.x);
    player.translateZ(controls.velocity.z);

    player.position.x = Math.max(-(ROOM_HALF_WIDTH - 0.5), Math.min(ROOM_HALF_WIDTH - 0.5, player.position.x));
    player.position.z = Math.max(-(ROOM_HALF_WIDTH - 0.5), Math.min(ROOM_HALF_WIDTH - 0.5, player.position.z));
    player.position.y = 1.6;
}

function checkCanFloorCollision(can, delta) {
    if (can.position.y < FLOOR_Y) {
        can.position.y = FLOOR_Y;
        if (can.userData.vel.y < 0) {
            can.userData.vel.y = -can.userData.vel.y * CAN_BOUNCE;
            can.userData.vel.x *= (1 - FRICTION * delta);
            can.userData.vel.z *= (1 - FRICTION * delta);
        } else {
            can.userData.vel.y = 0;
        }
    }
}

function checkCanWallCollision(can) {
    const pos = can.position;
    const vel = can.userData.vel;

    const wallX = ROOM_HALF_WIDTH - CAN_RADIUS;
    const wallZ = ROOM_HALF_WIDTH - CAN_RADIUS;

    if (pos.x >= wallX) { pos.x = wallX; if (vel.x > 0) vel.x = -vel.x * CAN_BOUNCE; }
    else if (pos.x <= -wallX) { pos.x = -wallX; if (vel.x < 0) vel.x = -vel.x * CAN_BOUNCE; }

    if (pos.z >= wallZ) { pos.z = wallZ; if (vel.z > 0) vel.z = -vel.z * CAN_BOUNCE; }
    else if (pos.z <= -wallZ) { pos.z = -wallZ; if (vel.z < 0) vel.z = -vel.z * CAN_BOUNCE; }
}

function checkCanCanCollision(canA, canB) {
    const posA = canA.position;
    const posB = canB.position;
    const velA = canA.userData.vel;
    const velB = canB.userData.vel;

    const collisionDistance = 2 * CAN_RADIUS;
    const centerDistance = posA.distanceTo(posB);

    if (centerDistance < collisionDistance) {
        const penetrationDepth = collisionDistance - centerDistance;
        const normal = posA.clone().sub(posB).normalize();

        const separationVector = normal.clone().multiplyScalar(penetrationDepth / 2);
        posA.add(separationVector);
        posB.sub(separationVector);

        const relativeVelocity = velA.clone().sub(velB);
        const velocityAlongNormal = relativeVelocity.dot(normal);

        if (velocityAlongNormal < 0) {
            const impulseMagnitude = -(1 + CAN_BOUNCE) * velocityAlongNormal;
            const impulse = normal.clone().multiplyScalar(impulseMagnitude);

            velA.add(impulse.clone().multiplyScalar(1 / canA.userData.mass));
            velB.sub(impulse.clone().multiplyScalar(1 / canB.userData.mass));
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    updatePlayer(delta);
    TWEEN_UPDATE();

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const { mesh, vel } = p;

        raycaster.set(mesh.position, vel.clone().normalize());
        raycaster.far = vel.length() * delta;

        const intersectsWalls = raycaster.intersectObjects(walls);
        if (intersectsWalls.length > 0) {
            spawnExplosion(intersectsWalls[0].point);
            scene.remove(mesh);
            projectiles.splice(i, 1);
            continue;
        }

        raycaster.far = vel.length() * delta + CAN_RADIUS;
        const intersectsCans = raycaster.intersectObjects(cans);
        if (intersectsCans.length > 0) {
            const hit = intersectsCans[0];
            const canHit = hit.object;
            const pushDir = vel.clone().normalize();
            canHit.userData.vel.add(pushDir.multiplyScalar(PROJECTILE_IMPULSE / canHit.userData.mass));
            spawnExplosion(hit.point);

            scene.remove(mesh);
            projectiles.splice(i, 1);
            continue;
        }

        mesh.position.add(vel.clone().multiplyScalar(delta));
    }

    for (let can of cans) {
        if (can.position.y > FLOOR_Y || can.userData.vel.y !== 0) can.userData.vel.y += GRAVITY * delta;
        can.position.add(can.userData.vel.clone().multiplyScalar(delta));
    }

    for (let i = 0; i < cans.length; i++) {
        const canA = cans[i];
        checkCanFloorCollision(canA, delta);
        checkCanWallCollision(canA);

        for (let j = i + 1; j < cans.length; j++) checkCanCanCollision(canA, cans[j]);
    }

    renderer.render(scene, camera);
    prevTime = time;
}

animate();
