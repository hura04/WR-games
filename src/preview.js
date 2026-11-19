// 開発用：時計の3Dモデルをぐるぐる回して確認するページ
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createRenderer, getEnvironment } from './core/render.js';
import { WATCHES } from './data/watches.js';
import { buildWatchModel } from './watch/index.js';

const renderer = createRenderer();
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#2a241e');
scene.environment = getEnvironment(renderer);
scene.add(new THREE.HemisphereLight('#fff', '#443', 0.6));
const sun = new THREE.DirectionalLight('#fff', 1.5);
sun.position.set(40, 80, 30);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 1, 2000);
camera.position.set(0, 90, 60);
const controls = new OrbitControls(camera, renderer.domElement);

const params = new URLSearchParams(location.search);
let current = null;
function show(id, hide = '') {
  if (current) scene.remove(current.root);
  current = buildWatchModel(WATCHES.find((w) => w.id === id));
  for (const h of hide.split(',').filter(Boolean)) if (current.parts[h]) current.parts[h].visible = false;
  scene.add(current.root);
  if (params.get('back')) current.root.rotation.x = Math.PI;
}
const bar = document.getElementById('bar');
for (const w of WATCHES) {
  const b = document.createElement('button');
  b.textContent = w.name;
  b.onclick = () => show(w.id);
  bar.appendChild(b);
}
show(params.get('id') || WATCHES[0].id, params.get('hide') || '');
if (params.get('cam')) camera.position.fromArray(params.get('cam').split(',').map(Number));
renderer.setAnimationLoop(() => {
  current?.setTime?.(new Date(), 'running');
  controls.update();
  renderer.render(scene, camera);
});
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
