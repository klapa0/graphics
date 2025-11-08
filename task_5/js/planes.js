import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js?module';

const airplanes = new Map();

export async function fetchPlanes(scene) {
    const url = 'https://opensky-network.org/api/states/all';

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (!data.states || data.states.length === 0) return;

        data.states.forEach(s => {
            const [
                icao24, , , , ,
                lon, lat, baro_altitude, on_ground, true_track
            ] = s;

            if (!lon || !lat || baro_altitude === null) return;

            const radius = 2 + baro_altitude * 0.000001;
            const phi = (90 - lat) * Math.PI / 180;
            const theta = (-lon) * Math.PI / 180;

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);

            const position = new THREE.Vector3(x, y, z);
            const normal = position.clone().normalize();

            let planeData = airplanes.get(icao24);

            if (!planeData) {
                const geom = new THREE.ConeGeometry(0.006, 0.02, 8);
                const color = on_ground
                    ? 0xffffff
                    : new THREE.Color(Math.random(), Math.random(), Math.random());
                const mat = new THREE.MeshBasicMaterial({ color });
                const mesh = new THREE.Mesh(geom, mat);
                mesh.position.copy(position);

                const trailGroup = new THREE.Group();
                scene.add(trailGroup);
                scene.add(mesh);

                planeData = { mesh, trail: [], trailGroup };
                airplanes.set(icao24, planeData);
            }

            const { mesh, trail, trailGroup } = planeData;
            mesh.up.copy(new THREE.Vector3(0,1,0));
            mesh.lookAt(position.clone().add(normal));

         
            if (true_track !== null) {
                mesh.rotateOnAxis(new THREE.Vector3(0,0,1), -true_track * Math.PI / 180);
            }

            trail.push(position.clone());
            if (trail.length > 50) trail.shift();
            trailGroup.clear();

            const sphereGeom = new THREE.SphereGeometry(0.004, 6, 6);
            const sphereMat = new THREE.MeshBasicMaterial({ color: mesh.material.color });
            for (const p of trail) {
                const sphere = new THREE.Mesh(sphereGeom, sphereMat);
                sphere.position.copy(p);
                trailGroup.add(sphere);
            }
        });
    } catch (e) {
        console.error('Error:', e);
    }
}
