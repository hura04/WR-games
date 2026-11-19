// 機種データの movement の種類に合わせて、3Dモデルを作る関数を選ぶ
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildQuartzWatch } from './QuartzWatch.js';
import { buildMechanicalWatch } from './MechanicalWatch.js';

export function buildWatchModel(def) {
  if (def.movement === 'mechanical') return buildMechanicalWatch(def);
  return buildQuartzWatch(def);
}

/**
 * 飾り用（ショーケースなど）の動かない時計。
 * 中のムーブメントは見えないので省き、同じ見た目の材質ごとに1つのメッシュへまとめて軽くする。
 */
export function buildDisplayWatch(def, date = new Date(2026, 0, 1, 10, 8, 37)) {
  const w = buildWatchModel(def);
  w.setTime(date, 'stopped');
  const hide = new Set([...(w.movementIds || []), 'movement_plate', 'battery', 'battery_new_installed', 'gasket_new', 'gasket_old_back', 'dial_protector_sheet']);
  w.root.updateMatrixWorld(true);
  const buckets = new Map();
  w.root.traverse((o) => {
    if (!o.isMesh) return;
    for (let p = o; p; p = p.parent) if (!p.visible || hide.has(p.userData.partId) || hide.has(p.name)) return;
    if (Array.isArray(o.material)) return; // 複数材質のメッシュ（ベルトのふちなど）はそのまま
    const m = o.material;
    const key = [m.type, m.color?.getHexString(), m.metalness, m.roughness, m.map?.uuid, m.transparent, m.opacity].join('|');
    if (!buckets.has(key)) buckets.set(key, { material: m, geos: [] });
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    // 結合のため属性をそろえる
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    buckets.get(key).geos.push(g.index ? g.toNonIndexed() : g);
  });
  const group = new THREE.Group();
  for (const { material, geos } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
}
