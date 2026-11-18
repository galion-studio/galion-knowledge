import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Port of src/components/KnowledgeGlobe.tsx (V1), same three.js 0.161 scene:
// sphere radii, colours, meridian counts, point colours, spin speeds, lights,
// and OrbitControls limits.

const mount = document.getElementById("knowledge-globe");
if (mount) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const key = new THREE.PointLight(0xffffff, 0.5);
  key.position.set(10, 10, 10);
  scene.add(key);
  const fill = new THREE.PointLight(0x3b82f6, 0.3);
  fill.position.set(-10, -10, -10);
  scene.add(fill);

  const globe = new THREE.Group();
  globe.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(2, 64, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.3,
        roughness: 0.7,
        transparent: true,
        opacity: 0.95,
      })
    )
  );
  globe.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(1.98, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.3 })
    )
  );
  scene.add(globe);

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.3,
  });
  const meridians = new THREE.Group();
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const points = [];
    for (let j = 0; j <= 50; j += 1) {
      const phi = (j / 50) * Math.PI - Math.PI / 2;
      points.push(
        new THREE.Vector3(
          Math.cos(phi) * Math.cos(angle) * 2.02,
          Math.sin(phi) * 2.02,
          Math.cos(phi) * Math.sin(angle) * 2.02
        )
      );
    }
    meridians.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
  }
  for (let i = 1; i < 6; i += 1) {
    const phi = (i / 6) * Math.PI - Math.PI / 2;
    const points = [];
    for (let j = 0; j <= 50; j += 1) {
      const angle = (j / 50) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(phi) * Math.cos(angle) * 2.02,
          Math.sin(phi) * 2.02,
          Math.cos(phi) * Math.sin(angle) * 2.02
        )
      );
    }
    meridians.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
  }
  scene.add(meridians);

  const count = 300;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const phi = Math.acos(-1 + 2 * Math.random());
    const theta = Math.random() * Math.PI * 2;
    const radius = 2.02 + Math.random() * 0.15;
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    const choice = Math.random();
    if (choice < 0.33) {
      colors.set([0.3, 0.5, 1], i * 3);
    } else if (choice < 0.66) {
      colors.set([0.2, 0.8, 0.9], i * 3);
    } else {
      colors.set([0.6, 0.3, 0.9], i * 3);
    }
  }
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pointGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(
    pointGeometry,
    new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })
  );
  scene.add(points);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(2.3, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0x1e40af,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
    })
  );
  scene.add(glow);

  const streamPositions = new Float32Array(100 * 3);
  for (let i = 0; i < 100; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.5 + Math.random() * 0.5;
    streamPositions[i * 3] = Math.cos(angle) * radius;
    streamPositions[i * 3 + 1] = (Math.random() - 0.5) * 4;
    streamPositions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const streamGeometry = new THREE.BufferGeometry();
  streamGeometry.setAttribute("position", new THREE.BufferAttribute(streamPositions, 3));
  const streams = new THREE.Points(
    streamGeometry,
    new THREE.PointsMaterial({ size: 0.02, color: 0x60a5fa, transparent: true, opacity: 0.6 })
  );
  scene.add(streams);

  const ambientPositions = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i += 1) {
    ambientPositions[i * 3] = (Math.random() - 0.5) * 20;
    ambientPositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    ambientPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  const ambientGeometry = new THREE.BufferGeometry();
  ambientGeometry.setAttribute("position", new THREE.BufferAttribute(ambientPositions, 3));
  const ambient = new THREE.Points(
    ambientGeometry,
    new THREE.PointsMaterial({ size: 0.02, color: 0x475569, transparent: true, opacity: 0.4 })
  );
  scene.add(ambient);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;
  controls.minPolarAngle = Math.PI / 3;
  controls.maxPolarAngle = Math.PI / 1.5;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();

  function resize() {
    const width = mount.clientWidth || 1;
    const height = mount.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function frame() {
    requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    if (!reduce) {
      globe.rotation.y = t * 0.03;
      meridians.rotation.y = t * 0.05;
      points.rotation.y = t * 0.02;
      glow.scale.setScalar(1 + Math.sin(t * 0.5) * 0.02);
      const stream = streamGeometry.attributes.position.array;
      for (let i = 0; i < 100; i += 1) {
        stream[i * 3 + 1] += 0.02;
        if (stream[i * 3 + 1] > 2) stream[i * 3 + 1] = -2;
      }
      streamGeometry.attributes.position.needsUpdate = true;
      streams.rotation.y = t * 0.1;
      ambient.rotation.y = t * 0.01;
      ambient.rotation.x = t * 0.005;
      controls.update();
    }
    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener("resize", resize);
  frame();
}
