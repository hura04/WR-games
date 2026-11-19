// =============================================================
// クォーツ腕時計の3Dモデルを、機種データ（watches.js）から組み立てる
// -------------------------------------------------------------
// 座標の決まり（単位 mm）
//   +Y : 文字盤側（表）  −Y : 裏蓋側（裏）
//   −Z : 12時方向        +X : 3時方向（リューズ側）
// 部品の mesh には data/parts.js と同じ id を userData.partId につけます。
// =============================================================
import * as THREE from 'three';
import { ringGeometry, discGeometry, gearGeometry, screwHead } from './geometry.js';
import { batteryTexture, labelTexture } from './textures.js';
import { buildExterior, tag, metal as metalMat, plain as plainMat, addRingHitArea } from './caseParts.js';

function texturedCircle(r, texture, faceUp = true) {
  const geo = new THREE.CircleGeometry(r, 64);
  geo.rotateX(faceUp ? -Math.PI / 2 : Math.PI / 2);
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texture, metalness: 0.5, roughness: 0.4 }));
}

/**
 * @param {object} def watches.js の機種データ
 * @returns {{ root: THREE.Group, parts: Record<string, THREE.Object3D>, setTime: Function }}
 */
export function buildQuartzWatch(def) {
  const root = new THREE.Group();
  root.name = 'watch';
  const parts = {};
  const add = (id, obj, parent = root) => {
    tag(obj, id);
    parent.add(obj);
    parts[id] = obj;
    return obj;
  };

  // 外装（ケース・文字盤・針・ベルト・裏蓋など）は共通の部品で作る
  const ext = buildExterior(def, add, root);
  const yBack = ext.yBack;
  const plain = plainMat;
  const metal = (c, r = 0.35) => metalMat(c, r);

  // ---- ムーブメント ----
  const mvY = yBack + 1.2; // 地板の裏面（裏蓋側から見える面）の高さ
  const plateR = def.casebackDiameter / 2 - 1.4; // 12.6
  const bx = -4.5, bz = 4.2; // 電池の位置
  const plateShape = new THREE.Shape();
  plateShape.absarc(0, 0, plateR, 0, Math.PI * 2, false);
  const pocket = new THREE.Path();
  pocket.absarc(bx, -bz, 3.55, 0, Math.PI * 2, true);
  plateShape.holes.push(pocket);
  const plateGeo = new THREE.ExtrudeGeometry(plateShape, { depth: 3.2, bevelEnabled: false, curveSegments: 48 });
  plateGeo.rotateX(-Math.PI / 2);
  const plate = new THREE.Mesh(plateGeo, metal('#d9d6cf', 0.45));
  plate.position.y = mvY;
  add('movement_plate', plate);

  // 回路ブロック（金色の薄い基板）
  const circuitShape = new THREE.Mesh(new THREE.BoxGeometry(9, 0.25, 5.5), metal('#c9a24a', 0.35));
  circuitShape.position.set(2.5, mvY - 0.12, 6);
  add('circuit', circuitShape);
  // 水晶振動子（小さな円筒）
  const quartz = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 4.5, 16), metal('#bfc3c9', 0.25));
  quartz.rotation.z = Math.PI / 2;
  quartz.scale.set(0.7, 1, 0.7);
  quartz.position.set(4, mvY - 0.55, 3.2);
  add('circuit', quartz);

  // コイル（銅線を巻いた円筒＋鉄心）
  const coilGroup = new THREE.Group();
  const winding = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 6, 24), metal('#b8692f', 0.4));
  winding.rotation.z = Math.PI / 2;
  const core = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.3, 1.2), metal('#8d9196', 0.5));
  coilGroup.add(winding, core);
  coilGroup.position.set(3.5, mvY - 0.6, -5.5);
  add('coil', coilGroup);

  // ローター（ステップモーター）
  const rotor = new THREE.Mesh(discGeometry(1.1, 0.6, 20), metal('#3b4048', 0.3));
  rotor.position.set(-1.6, mvY - 0.6, -5.5);
  add('step_rotor', rotor);
  const statorMat = metal('#9aa0a6', 0.5);
  const stator = new THREE.Mesh(ringGeometry(1.9, 1.25, 0.4), statorMat);
  stator.position.set(-1.6, mvY - 0.4, -5.5);
  add('step_rotor', stator);

  // 輪列（歯車）
  const wheelMat = metal('#d8b765', 0.3);
  const wheels = new THREE.Group();
  const w1 = new THREE.Mesh(gearGeometry(40, 0.12, 0.25), wheelMat);
  w1.position.set(-6.5, mvY - 0.35, -3.5);
  const w2 = new THREE.Mesh(gearGeometry(30, 0.1, 0.25), wheelMat);
  w2.position.set(-3.3, mvY - 0.55, -1.6);
  wheels.add(w1, w2);
  add('wheel', wheels);

  // 電池室（電池を外すと見えるくぼみ）
  const socket = new THREE.Mesh(ringGeometry(3.6, 2.6, 0.3), plain('#2b2d31', 0.9));
  socket.position.set(bx, mvY - 0.05, bz);
  add('battery_socket', socket);
  const socketFloor = new THREE.Mesh(discGeometry(3.5, 0.1), plain('#3d4046', 0.9));
  socketFloor.position.set(bx, mvY + 2.75, bz);
  add('battery_socket', socketFloor);

  // 電池（古い）
  const makeBattery = (id) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 2.6, 40), metal('#c7cbd1', 0.25));
    body.position.y = -1.3;
    const top = texturedCircle(3.35, batteryTexture(), false);
    top.material.metalness = 0.8;
    top.position.y = -2.61;
    g.add(body, top);
    g.position.set(bx, mvY + 2.4, bz); // 電池の＋面が地板から0.2mm出る
    return add(id, g);
  };
  makeBattery('battery');
  makeBattery('battery_new_installed').visible = false;

  // 電池押さえ（金属板）とネジ。回転の中心はネジ
  const sx = bx + 4.8, sz = bz + 1.5;
  const clampPivot = new THREE.Group();
  clampPivot.position.set(sx, mvY - 0.33, sz);
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.25, 2.2), metal('#c4c8cd', 0.3));
  clamp.position.set(-3.8, 0, -0.6);
  clamp.rotation.y = 0.16;
  clampPivot.add(clamp);
  add('battery_clamp', clampPivot);
  // 電池押さえの根元（ネジの下の台）
  const post = new THREE.Mesh(discGeometry(1.2, 0.3, 16), metal('#c4c8cd', 0.4));
  post.position.set(sx, mvY - 0.3, sz);
  add('battery_clamp', post);

  const screw = screwHead(0.85, 0.5);
  screw.head.material = metal('#9fa6ae', 0.3);
  screw.slot.material = plain('#151515');
  screw.slot.scale.set(1, 0.4, 1);
  screw.slot.position.y = 0.42;
  screw.group.rotation.x = Math.PI; // 裏側を向ける
  screw.group.position.set(sx, mvY - 0.45, sz);
  add('clamp_screw', screw.group);

  // AC端子
  const ac = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.3, 1.6),
    [plain('#d4a94a'), plain('#d4a94a'), plain('#d4a94a'), new THREE.MeshStandardMaterial({ map: labelTexture('AC') }), plain('#d4a94a'), plain('#d4a94a')],
  );
  ac.position.set(bx + 1.0, mvY - 0.35, bz + 5.4);
  add('ac_terminal', ac);

  // ---- パッキン溝・パッキン ----
  const gasketR = def.casebackDiameter / 2 - 0.3;
  const seat = new THREE.Mesh(new THREE.TorusGeometry(gasketR, 0.5, 8, 64), plain('#55585e', 0.8));
  seat.rotation.x = Math.PI / 2;
  seat.position.y = yBack + 0.05;
  addRingHitArea(seat, gasketR, 1.3, 0.35);
  add('gasket_seat', seat);
  const makeGasket = (id, color, rough) => {
    const g = new THREE.Mesh(new THREE.TorusGeometry(gasketR, 0.45, 10, 64), plain(color, rough));
    g.rotation.x = Math.PI / 2;
    g.position.y = yBack - 0.15;
    addRingHitArea(g, gasketR, 1.4, 0.4);
    return add(id, g);
  };
  makeGasket('gasket', '#2a2725', 0.95); // 古い：つやがない
  makeGasket('gasket_new', '#141414', 0.25).visible = false; // 新品：グリスでつやがある
  makeGasket('gasket_old_back', '#2a2725', 0.95).visible = false;

  // それぞれの部品の元の位置を覚えておく（戻すときに使う）
  for (const obj of Object.values(parts)) {
    obj.userData.home = { parent: obj.parent, position: obj.position.clone(), quaternion: obj.quaternion.clone() };
  }

  let rotorAngle = 0;
  /**
   * 針を動かす
   * @param {Date} date
   * @param {'running'|'stopped'|'eol'} mode
   */
  function setTime(date, mode) {
    const tick = ext.setHands(date, mode);
    if (mode === 'running' && tick) {
      rotorAngle += Math.PI; // ステップモーターは1秒ごとに180°
      rotor.rotation.y = rotorAngle;
    }
  }

  return { root, parts, setTime, droop: ext.droop, frozenTime: new Date(2026, 0, 1, 10, 8, 37) };
}
