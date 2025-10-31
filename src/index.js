import * as THREE from "three";


const G = 0.001;


// celestial body class
class CelestialBody {
  constructor(
    name,
    radius,
    distance,
    texture,
    standardMaterial = true,
    nightTexture = null,
    mass = 1,
    fixed = false,
    rotationSpeed = 0.01,
    parent = null
  ) {
    this.name = name;
    this.mass = mass;
    this.fixed = fixed;
    this.rotationSpeed = rotationSpeed;
    this.parent = parent;

    this.position = new THREE.Vector3(distance, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.acc = new THREE.Vector3(0, 0, 0);
    if (parent) {
      this.orbitRadius = this.position.distanceTo(parent.position); // zapisujemy promień
      this.orbitAngle = Math.random() * Math.PI * 2; // losowy początkowy kąt
      this.orbitSpeed = 0.01; // kątowa prędkość
    }

    this.position = new THREE.Vector3(distance, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.acc = new THREE.Vector3(0, 0, 0);

    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const loader = new THREE.TextureLoader();

    const material = standardMaterial
      ? new THREE.MeshStandardMaterial({ map: loader.load(texture) })
      : new THREE.MeshBasicMaterial({ map: loader.load(texture) });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);

    if (nightTexture) {
      const nightMap = loader.load(nightTexture);
      const nightMaterial = new THREE.MeshBasicMaterial({
        map: nightMap,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
      });
      const nightMesh = new THREE.Mesh(geometry.clone(), nightMaterial);
      this.mesh.add(nightMesh);
    }
  }
}

class Asteroid extends CelestialBody {
  constructor(
    name,
    minRadius,
    maxRadius,
    minDist,
    maxDist,
    parent,
    texture = "textures/asteroid_texture.jpg"
  ) {
    const radius = THREE.MathUtils.randFloat(minRadius, maxRadius);

    super(name, radius, 0, texture, true, null, 0.001, false, 0.01, parent);

    this.orbitRadius = THREE.MathUtils.randFloat(minDist, maxDist);
    this.orbitAngle = THREE.MathUtils.randFloat(0, Math.PI * 2);
    this.yOffset = THREE.MathUtils.randFloatSpread(5);
    this.orbitSpeed = THREE.MathUtils.randFloat(0.005, 0.02);

    this.position.set(
      parent.position.x + this.orbitRadius * Math.cos(this.orbitAngle),
      parent.position.y + this.yOffset,
      parent.position.z + this.orbitRadius * Math.sin(this.orbitAngle)
    );
    this.mesh.position.copy(this.position);

    // Random rotation
    this.mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Random sphere scaling for it to look differently
    this.mesh.scale.set(
      THREE.MathUtils.randFloat(0.3, 1.5),
      THREE.MathUtils.randFloat(0.3, 1.5),
      THREE.MathUtils.randFloat(0.3, 1.5)
    );

    // Additional spheres for different shape
    const numExtra = Math.floor(Math.random() * 3);
    for (let i = 0; i < numExtra; i++) {
      const extraRadius = radius * THREE.MathUtils.randFloat(0.5, 1.2);
      const extraSphere = new THREE.Mesh(
        new THREE.SphereGeometry(extraRadius, 16, 16),
        this.mesh.material
      );

      extraSphere.position.set(
        THREE.MathUtils.randFloat(-radius, radius),
        THREE.MathUtils.randFloat(-radius, radius),
        THREE.MathUtils.randFloat(-radius, radius)
      );

      extraSphere.scale.set(
        THREE.MathUtils.randFloat(0.3, 1.5),
        THREE.MathUtils.randFloat(0.3, 1.5),
        THREE.MathUtils.randFloat(0.3, 1.5)
      );

      this.mesh.add(extraSphere);
    }
  }
}

// ===== SOLAR SYSTEM PHYSICS =====
class SolarSystem {
  constructor(scene) {
    this.scene = scene;
    this.bodies = [];
    this.time = 0;
  }

  addBody(body) {
    this.bodies.push(body);
    this.scene.add(body.mesh);
  }

  // Circular orbit initialization relative to strongest gravitational influence
  initCircularOrbits() {
    for (let bi of this.bodies) {
      if (bi.fixed) continue;

      let center = bi.parent;
      if (!center) {
        let best = -1;
        let maxForce = -Infinity;
        for (let bj of this.bodies) {
          if (bi === bj) continue;
          const r = bi.position.distanceTo(bj.position);
          const force = (G * bj.mass) / (r * r);
          if (force > maxForce) {
            maxForce = force;
            center = bj;
          }
        }
      }

      const rVec = new THREE.Vector3().subVectors(bi.position, center.position);
      const r = rVec.length();
      const v = Math.sqrt((G * center.mass) / r);

      const up = new THREE.Vector3(0, 1, 0);
      let tangent = new THREE.Vector3().crossVectors(rVec, up);
      if (tangent.lengthSq() < 1e-6)
        tangent = new THREE.Vector3().crossVectors(
          rVec,
          new THREE.Vector3(1, 0, 0)
        );
      tangent.normalize();

      bi.velocity.copy(tangent.multiplyScalar(v));
    }
  }

  computeGravity() {
    for (let b of this.bodies) {
      b.acc.set(0, 0, 0);

      // Ignoring for celestial body with parent cuz couldn't stabilize satelites
      if (b.parent) continue;

      for (let other of this.bodies) {
        if (b === other) continue;
        const rVec = new THREE.Vector3().subVectors(other.position, b.position);
        const r = rVec.length();
        const f = (G * b.mass * other.mass) / (r * r);
        b.acc.add(rVec.normalize().multiplyScalar(f / b.mass));
      }
    }
  }

  step(dt = 1) {
    this.time += dt;

    for (let b of this.bodies) {
      b.mesh.rotation.y += b.rotationSpeed;

      if (b.parent) {
        b.orbitAngle += b.orbitSpeed * dt;
        b.position.x =
          b.parent.position.x + b.orbitRadius * Math.cos(b.orbitAngle);
        b.position.z =
          b.parent.position.z + b.orbitRadius * Math.sin(b.orbitAngle);
        b.mesh.position.copy(b.position);
      } else {
        if (!b.fixed) {
          // Using velocity vernet thought moon would stay in earth orbit
          b.velocity.add(b.acc.clone().multiplyScalar(dt / 2));

          b.position.add(b.velocity.clone().multiplyScalar(dt));
          b.mesh.position.copy(b.position);

          b.velocity.add(b.acc.clone().multiplyScalar(dt / 2));
        }
      }
    }

    this.computeGravity();
  }
}

// Conrolling
class Player {
  constructor(camera) {
    this.camera = camera;
    this.velocity = new THREE.Vector3();
    this.acceleration = 0.5;
    this.rotationSpeed = 0.002;

    this.keys = {};
    this.pitch = 0;
    this.yaw = 0;

    window.addEventListener(
      "keydown",
      (e) => (this.keys[e.key.toLowerCase()] = true)
    );
    window.addEventListener(
      "keyup",
      (e) => (this.keys[e.key.toLowerCase()] = false)
    );

    window.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement === document.body) {
        this.yaw -= e.movementX * this.rotationSpeed;
        this.pitch = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2, this.pitch - e.movementY * this.rotationSpeed)
        );
      }
    });

    document.body.addEventListener("click", () =>
      document.body.requestPointerLock()
    );
  }

  update() {
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    const right = new THREE.Vector3();
    right.crossVectors(dir, this.camera.up).normalize();

    if (this.keys["w"])
      this.camera.position.add(dir.clone().multiplyScalar(this.acceleration));
    if (this.keys["s"])
      this.camera.position.add(dir.clone().multiplyScalar(-this.acceleration));
    if (this.keys["a"])
      this.camera.position.add(
        right.clone().multiplyScalar(-this.acceleration)
      );
    if (this.keys["d"])
      this.camera.position.add(right.clone().multiplyScalar(this.acceleration));
  }
}

// Scene
const canvas = document.getElementById("my_Canvas");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  3000
);
camera.position.set(0, 200, 500);

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

scene.add(new THREE.AmbientLight(0xffffff, 0.02));

const light = new THREE.PointLight(0xffffff, 70000);
light.position.set(0, 0, 0);
scene.add(light);

scene.add(new THREE.AxesHelper(50));

// Planets
const solar = new SolarSystem(scene);

solar.addBody(
  new CelestialBody(
    "Sun",
    20,
    0,
    "./textures/sun_texture.jpg",
    false,
    null,
    1000,
    true,
    0.001
  )
);
solar.addBody(
  new CelestialBody(
    "Mercury",
    3,
    30,
    "textures/mercury_texture.jpg",
    true,
    null,
    0.055,
    false,
    0.03
  )
);
solar.addBody(
  new CelestialBody(
    "Venus",
    5,
    70,
    "textures/venus_texture.jpg",
    true,
    null,
    0.815,
    false,
    0.2
  )
);
solar.addBody(
  new CelestialBody(
    "Earth",
    5,
    100,
    "textures/earth_texture_day.jpg",
    true,
    "textures/earth_texture_night.jpg",
    1,
    false,
    0.01
  )
);
solar.addBody(
  new CelestialBody(
    "Moon",
    1.5,
    110,
    "textures/moon_texture.jpg",
    true,
    null,
    0.0123,
    false,
    -0.0001,
    solar.bodies.find((b) => b.name === "Earth")
  )
);
solar.addBody(
  new CelestialBody(
    "Mars",
    4,
    150,
    "textures/mars_texture.jpg",
    true,
    null,
    0.107,
    false,
    0.007
  )
);

const sun = solar.bodies.find((b) => b.name === "Sun");

for (let i = 0; i < 200; i++) {
  const asteroid = new Asteroid("Asteroid_" + i, 0.5, 2, 180, 250, sun);
  solar.addBody(asteroid);
}

solar.initCircularOrbits();

// initilizing player
const player = new Player(camera);

function animate() {
  requestAnimationFrame(animate);

  player.update();
  solar.step(0.1);

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
