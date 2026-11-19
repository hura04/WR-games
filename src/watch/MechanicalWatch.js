// =============================================================
// 機械式（自動巻き）腕時計の3Dモデル
// 外装は caseParts.js、ムーブメントの配置は data/movements.js から。
// -------------------------------------------------------------
// 座標の決まり（単位 mm）
//   +Y : 文字盤側（表）  −Y : 裏蓋側（裏）
//   −Z : 12時方向        +X : 3時方向（リューズ側）
// =============================================================
import * as THREE from 'three';
import { discGeometry, gearGeometry, ringGeometry, bridgeGeometry, planarUV, spiralGeometry, screwHead } from './geometry.js';
import { genevaStripesTexture, perlageTexture, rotorTexture } from './textures.js';
import { buildExterior, tag, metal, plain } from './caseParts.js';
import { getMovement } from '../data/movements.js';

/** テクスチャを部品ごとに複製して、mm 単位の UV に合わせる */
function finishMat(tex, color, rough, repeat) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  return new THREE.MeshStandardMaterial({ map: t, color, metalness: 0.85, roughness: rough });
}

export function buildMechanicalWatch(def) {
  const root = new THREE.Group();
  root.name = 'watch';
  const parts = {};
  const movementIds = []; // 洗浄のときに隠す・汚れを落とす部品
  const add = (id, obj, parent = root, isMovement = false) => {
    tag(obj, id);
    parent.add(obj);
    parts[id] = obj;
    if (isMovement && !movementIds.includes(id)) movementIds.push(id);
    return obj;
  };
  const addMv = (id, obj, parent = root) => add(id, obj, parent, true);

  const ext = buildExterior(def, add, root);
  const mv = getMovement(def.caliber);
  const yPlateBack = ext.dialY - 0.36 - 0.2 - mv.plateThickness; // 地板の裏面
  const Y = (layer) => yPlateBack - layer; // 裏蓋側へ layer mm の高さ
  const P = ([x, z]) => new THREE.Vector3(x, 0, z);
  const plateR = mv.diameter / 2;

  // ---- 材質 ----
  const gilt = metal('#d6b46a', 0.28); // 金メッキの歯車
  const steel = metal('#cfd3d8', 0.18);
  const blued = metal('#2b4f9e', 0.2); // 焼き青ネジ
  const ruby = new THREE.MeshPhysicalMaterial({ color: '#b0102a', roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
  const stripes = genevaStripesTexture('#d9d6ce');
  const perlage = perlageTexture('#cfccc4');

  const makeScrew = (r = 0.55, mat = blued) => {
    const s = screwHead(r, 0.35);
    s.head.material = mat;
    s.slot.material = plain('#111');
    s.slot.scale.set(1, 0.5, 1);
    s.slot.position.y = 0.3;
    s.group.rotation.x = Math.PI; // 裏蓋側を向ける
    return s.group;
  };
  const makeJewel = (r = 0.55) => {
    const g = new THREE.Group();
    const j = new THREE.Mesh(discGeometry(r, 0.12, 16), ruby);
    const sink = new THREE.Mesh(new THREE.TorusGeometry(r + 0.12, 0.08, 6, 20), metal('#e7e2d6', 0.1));
    sink.rotation.x = Math.PI / 2;
    sink.position.y = 0.06;
    g.add(j, sink);
    g.rotation.x = Math.PI;
    return g;
  };

  // ---- 地板（ペルラージュ仕上げ） ----
  const plateGeo = planarUV(discGeometry(plateR, mv.plateThickness, 96), 1 / 6, 0);
  const plate = new THREE.Mesh(plateGeo, finishMat(perlage, '#ffffff', 0.4, 1));
  plate.position.y = yPlateBack;
  addMv('movement_plate', plate);

  // ---- 中枠（ムーブメントとケースのすき間を埋めるリング） ----
  const ring = new THREE.Mesh(ringGeometry(ext.backR - 0.65, plateR + 0.1, 2.6, 0.2), plain('#2c2a28', 0.55));
  ring.position.y = yPlateBack - 0.3;
  add('casing_ring', ring);

  // ---- 2番車（中心、地板のすぐ上。分解しない） ----
  const wheelOf = (w, mat = gilt) => {
    const g = new THREE.Group();
    const module = (w.r * 2) / w.teeth;
    const gear = new THREE.Mesh(gearGeometry(w.teeth, module, 0.22, { hole: 0.25, spokes: w.teeth >= 30 ? 4 : 0 }), mat);
    const pinion = new THREE.Mesh(gearGeometry(8, (w.pinion * 2) / 8, 0.9, { hole: 0.1, spokes: 0 }), steel);
    pinion.position.y = 0.22;
    const arbor = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.2, 8), steel);
    arbor.position.y = 0.5;
    g.add(gear, pinion, arbor);
    return g;
  };
  for (const w of mv.wheels) {
    const g = wheelOf(w, w.id === 'escape_wheel' ? steel : gilt);
    g.position.copy(P(w.pos));
    g.position.y = Y(w.layer + 0.22);
    g.rotation.x = Math.PI; // 裏蓋側から見て正しい向き
    addMv(w.id, g);
  }

  // ---- 香箱（ゼンマイの入った円筒の箱） ----
  const barrel = new THREE.Group();
  const bDrum = new THREE.Mesh(new THREE.CylinderGeometry(mv.barrel.r - 0.25, mv.barrel.r - 0.25, mv.barrel.h, 64), metal('#d2b26a', 0.3));
  const bTeeth = new THREE.Mesh(gearGeometry(mv.barrel.teeth, ((mv.barrel.r) * 2) / mv.barrel.teeth, 0.35, { hole: 1, spokes: 0 }), gilt);
  bTeeth.position.y = -mv.barrel.h / 2;
  const bCover = new THREE.Mesh(discGeometry(mv.barrel.r - 0.4, 0.1, 64), metal('#e0c584', 0.22));
  bCover.position.y = mv.barrel.h / 2;
  const bArbor = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, mv.barrel.h + 0.6, 16), steel);
  barrel.add(bDrum, bTeeth, bCover, bArbor);
  barrel.position.copy(P(mv.barrel.pos));
  barrel.position.y = Y(mv.barrel.layer + mv.barrel.h / 2);
  addMv('barrel', barrel);

  // ---- アンクル（爪石つき） ----
  const pal = new THREE.Group();
  const [px, pz] = mv.pallet.pivot;
  const [tx, tz] = mv.pallet.toward;
  const dir = Math.atan2(tz - pz, tx - px);
  const len = Math.hypot(tx - px, tz - pz) - mv.balance.r * 0.45;
  const lever = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, 0.35), steel);
  lever.position.x = len / 2;
  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.9), steel);
  fork.position.x = len;
  const arms = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 3.2), steel);
  arms.position.x = -0.4;
  pal.add(lever, fork, arms);
  for (const s of [-1, 1]) {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.25), ruby);
    stone.position.set(-0.9, 0, s * 1.5);
    pal.add(stone);
  }
  const palArbor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8), steel);
  pal.add(palArbor);
  const palPivot = new THREE.Group();
  palPivot.position.set(px, Y(mv.pallet.layer), pz);
  pal.rotation.y = -dir;
  palPivot.add(pal);
  addMv('pallet_fork', palPivot);

  // ---- テンプ（てん輪＋ヒゲゼンマイ）とテンプ受け ----
  const [bx, bz] = mv.balance.pos;
  const cockGroup = new THREE.Group(); // テンプ受けごと外すので、テンプは受けの子にする
  const cock = mv.bridges.balance_cock;
  const cockGeo = planarUV(bridgeGeometry(cock.cover, cock.h), 1 / 5, 0);
  const cockMesh = new THREE.Mesh(cockGeo, finishMat(stripes, '#ffffff', 0.25, 1));
  cockMesh.position.y = Y(cock.layer + cock.h);
  cockGroup.add(cockMesh);
  tag(cockMesh, 'balance_cock');
  const balance = new THREE.Group();
  const rim = new THREE.Mesh(ringGeometry(mv.balance.r, mv.balance.r - 0.45, 0.45, 0.05), gilt);
  balance.add(rim);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(mv.balance.r * 2 - 0.4, 0.2, 0.32), gilt);
    arm.position.y = 0.12;
    arm.rotation.y = (i / 3) * Math.PI;
    if (i > 0) arm.scale.x = 0.5, arm.position.set(Math.cos((i * Math.PI * 2) / 3) * mv.balance.r * 0.45, 0.12, -Math.sin((i * Math.PI * 2) / 3) * mv.balance.r * 0.45);
    balance.add(arm);
  }
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.4, 8), steel);
  balance.add(staff);
  const hair = new THREE.Mesh(spiralGeometry(0.6, mv.balance.r * 0.68, 11, 0.03), metal('#9aa3ad', 0.2));
  hair.position.y = 0.55;
  balance.add(hair);
  tag(balance, 'balance');
  balance.position.set(bx, Y(mv.balance.layer + 0.45), bz);
  balance.rotation.x = Math.PI;
  cockGroup.add(balance);
  // 衝撃吸収装置（金色のバネ）と穴石、緩急針、ヒゲ持ち
  const shock = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.07, 6, 20, Math.PI * 1.6), metal('#d9b45a', 0.2));
  shock.rotation.x = Math.PI / 2;
  shock.position.set(bx, Y(cock.layer + cock.h) - 0.05, bz);
  tag(shock, 'balance_cock');
  cockGroup.add(shock);
  const cj = makeJewel(0.5);
  cj.position.set(bx, Y(cock.layer + cock.h) - 0.02, bz);
  tag(cj, 'balance_cock');
  cockGroup.add(cj);
  const regulator = new THREE.Group();
  const index = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 0.35), steel);
  index.position.x = 2.6;
  const indexTip = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 8), steel);
  indexTip.rotation.z = -Math.PI / 2;
  indexTip.position.x = 5.4;
  regulator.add(index, indexTip);
  regulator.position.set(bx, Y(cock.layer + cock.h) - 0.1, bz);
  regulator.rotation.y = 0.9;
  tag(regulator, 'regulator');
  cockGroup.add(regulator);
  // ＋−の目盛り
  for (let i = -3; i <= 3; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.5), plain(i === 0 ? '#2a2a2a' : '#555'));
    const a = 0.9 + i * 0.12;
    tick.position.set(bx + Math.cos(a) * 5.9, Y(cock.layer + cock.h) - 0.03, bz - Math.sin(a) * 5.9);
    tick.rotation.y = a;
    tag(tick, 'regulator');
    cockGroup.add(tick);
  }
  const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 12), steel);
  stud.position.set(bx - 1.8, Y(cock.layer + cock.h) - 0.15, bz - 1.4);
  tag(stud, 'stud');
  cockGroup.add(stud);
  for (const [sxp, szp] of cock.screws) {
    const sc = makeScrew(0.6);
    sc.position.set(sxp, Y(cock.layer + cock.h), szp);
    tag(sc, 'balance_cock_screw');
    cockGroup.add(sc);
  }
  addMv('balance_cock', cockGroup);
  parts.balance = balance;
  parts.regulator = regulator;
  parts.stud = stud;

  // ---- 受け（ブリッジ）：コート・ド・ジュネーブ仕上げ＋穴石＋青ネジ ----
  for (const [id, b] of Object.entries(mv.bridges)) {
    if (id === 'balance_cock') continue;
    const g = new THREE.Group();
    const geo = planarUV(bridgeGeometry(b.cover, b.h), 1 / 5, 0);
    const mesh = new THREE.Mesh(geo, finishMat(stripes, '#ffffff', 0.25, 1));
    mesh.position.y = Y(b.layer + b.h);
    g.add(mesh);
    for (const jp of b.jewels) {
      const j = makeJewel(0.5);
      j.position.set(jp[0], Y(b.layer + b.h) - 0.02, jp[1]);
      g.add(j);
    }
    tag(g, id);
    for (const sp of b.screws) {
      const sc = makeScrew(0.6);
      sc.position.set(sp[0], Y(b.layer + b.h), sp[1]);
      tag(sc, `${id}_screw`);
      g.add(sc);
    }
    addMv(id, g);
  }

  // ---- 角穴車・丸穴車（ゼンマイを巻く歯車）とコハゼ ----
  const ratchet = new THREE.Group();
  const rGear = new THREE.Mesh(gearGeometry(56, (mv.ratchet.r * 2) / 56, 0.45, { hole: 0.6, spokes: 0 }), metal('#d5d9de', 0.12));
  ratchet.add(rGear);
  const rScrew = makeScrew(1.0, steel);
  rScrew.rotation.x = 0;
  rScrew.position.y = 0.45;
  tag(rScrew, 'ratchet_screw');
  ratchet.add(rScrew);
  ratchet.position.copy(P(mv.ratchet.pos));
  ratchet.position.y = Y(mv.ratchet.layer + 0.45);
  ratchet.rotation.x = Math.PI;
  addMv('ratchet_wheel', ratchet);
  parts.ratchet_screw = rScrew;
  tag(rGear, 'ratchet_wheel');

  const crownWheel = new THREE.Group();
  const cGear = new THREE.Mesh(gearGeometry(24, (mv.crownWheel.r * 2) / 24, 0.4, { hole: 0.4, spokes: 0 }), metal('#d5d9de', 0.12));
  tag(cGear, 'crown_wheel');
  const cScrew = makeScrew(0.7, steel);
  cScrew.rotation.x = 0;
  cScrew.position.y = 0.4;
  tag(cScrew, 'crown_wheel_screw');
  crownWheel.add(cGear, cScrew);
  crownWheel.position.copy(P(mv.crownWheel.pos));
  crownWheel.position.y = Y(mv.crownWheel.layer + 0.4);
  crownWheel.rotation.x = Math.PI;
  addMv('crown_wheel', crownWheel);
  tag(cGear, 'crown_wheel');

  const click = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 0.7), steel);
  click.position.copy(P(mv.click.pos));
  click.position.y = Y(mv.ratchet.layer + 0.3);
  click.rotation.y = 0.7;
  addMv('click', click);

  // ---- オシドリ（巻真を抜くときに押す） ----
  const settingLever = new THREE.Group();
  const leverPin = new THREE.Mesh(discGeometry(0.45, 0.3, 12), metal('#c4c9cf', 0.2));
  const dimple = new THREE.Mesh(discGeometry(0.2, 0.05, 10), plain('#222'));
  dimple.position.y = 0.3;
  settingLever.add(leverPin, dimple);
  settingLever.rotation.x = Math.PI;
  settingLever.position.set(mv.settingLever.pos[0], Y(0.3), mv.settingLever.pos[1]);
  addMv('setting_lever', settingLever);

  // ---- 文字盤足のネジ（地板のふち、裏側から締める） ----
  const dialScrews = new THREE.Group();
  for (const p of mv.dialScrews) {
    const s = makeScrew(0.5, steel);
    s.position.set(p[0], Y(0), p[1]);
    dialScrews.add(s);
  }
  addMv('dial_screw', dialScrews);

  // ---- 回転錘（ローター）：半円のおもり＋中心のベアリング ----
  const rotorGroup = new THREE.Group();
  const rs = new THREE.Shape();
  rs.absarc(0, 0, mv.rotor.r, Math.PI * 0.02, Math.PI * 0.98, false);
  rs.absarc(0, 0, 2.2, Math.PI * 0.98, Math.PI * 0.02, true);
  const rotorGeo = new THREE.ExtrudeGeometry(rs, { depth: mv.rotor.h, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.15, bevelSegments: 2, curveSegments: 48 });
  rotorGeo.rotateX(-Math.PI / 2);
  planarUV(rotorGeo, 1 / (mv.rotor.r * 2.1), 0.5);
  const rotorMat = new THREE.MeshStandardMaterial({ map: rotorTexture(def.brand), metalness: 0.9, roughness: 0.25 });
  const rotorMesh = new THREE.Mesh(rotorGeo, rotorMat);
  rotorMesh.rotation.x = Math.PI; // 刻印面を裏蓋側に
  rotorMesh.position.y = 0;
  const bearing = new THREE.Mesh(discGeometry(2.3, mv.rotor.h + 0.4, 32), metal('#e8e8e8', 0.08));
  bearing.rotation.x = Math.PI;
  const rotorScrew = makeScrew(1.0, steel);
  rotorScrew.position.y = -mv.rotor.h - 0.4;
  tag(rotorScrew, 'rotor_screw');
  rotorGroup.add(rotorMesh, bearing, rotorScrew);
  // 半円の外周おもり（重さを外周に集めて、腕の動きでよく回るようにする）
  const wShape = new THREE.Shape();
  wShape.absarc(0, 0, mv.rotor.r, Math.PI * 0.02, Math.PI * 0.98, false);
  wShape.absarc(0, 0, mv.rotor.r - 2.0, Math.PI * 0.98, Math.PI * 0.02, true);
  const wGeo = new THREE.ExtrudeGeometry(wShape, { depth: mv.rotor.h + 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2, curveSegments: 48 });
  wGeo.rotateX(-Math.PI / 2);
  const wMesh = new THREE.Mesh(wGeo, metal('#d4ccb6', 0.15));
  wMesh.rotation.x = Math.PI;
  rotorGroup.add(wMesh);
  rotorGroup.position.y = Y(mv.rotor.layer);
  addMv('rotor', rotorGroup);
  parts.rotor_screw = rotorScrew;

  // ---- 文字盤側：筒車・日の裏車・巻き上げ機構 ----
  const yDialSide = yPlateBack + mv.plateThickness; // 地板の表面
  const hourWheel = new THREE.Mesh(gearGeometry(40, (mv.hourWheel.r * 2) / 40, 0.2, { hole: 0.9, spokes: 0 }), gilt);
  const hwPipe = new THREE.Mesh(ringGeometry(0.9, 0.6, 0.9), gilt);
  const hw = new THREE.Group();
  hw.add(hourWheel, hwPipe);
  hw.position.y = yDialSide + 0.02;
  addMv('hour_wheel', hw);
  const mw = new THREE.Mesh(gearGeometry(30, (mv.minuteWheel.r * 2) / 30, 0.2, { hole: 0.3, spokes: 0 }), gilt);
  mw.position.set(mv.minuteWheel.pos[0], yDialSide + 0.02, mv.minuteWheel.pos[1]);
  addMv('minute_wheel', mw);
  const keyless = new THREE.Group();
  const sl = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.25, 1.2), steel);
  sl.position.set(7.6, 0, 2.0);
  sl.rotation.y = 0.35;
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.25, 1.0), steel);
  yoke.position.set(7.8, 0.02, -1.6);
  yoke.rotation.y = -0.3;
  const clutch = new THREE.Mesh(gearGeometry(12, 0.22, 0.25, { hole: 0.3, spokes: 0 }), steel);
  clutch.position.set(8.5, 0, 0);
  keyless.add(sl, yoke, clutch);
  keyless.position.y = yDialSide + 0.02;
  addMv('keyless', keyless);

  // ---- 巻真（リューズと一緒に抜ける） ----
  const stemY = yPlateBack + mv.plateThickness / 2;
  parts.crown.position.y = stemY;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, ext.R - 6.5, 12), steel);
  stem.rotation.z = Math.PI / 2;
  stem.position.x = 6.5 + (ext.R - 6.5) / 2;
  tag(stem, 'crown');
  parts.crown.add(stem);

  // ---- パッキン ----
  const gasketR = def.casebackDiameter / 2 - 0.3;
  const seat = new THREE.Mesh(new THREE.TorusGeometry(gasketR, 0.55, 8, 96), plain('#55585e', 0.8));
  seat.rotation.x = Math.PI / 2;
  seat.position.y = ext.yBack + 0.05;
  add('gasket_seat', seat);
  const makeGasket = (id, color, rough) => {
    const g = new THREE.Mesh(new THREE.TorusGeometry(gasketR, 0.5, 10, 96), plain(color, rough));
    g.scale.set(1, 1, 0.7);
    g.rotation.x = Math.PI / 2;
    g.position.y = ext.yBack - 0.15;
    return add(id, g);
  };
  makeGasket('gasket', '#2a2725', 0.95);
  makeGasket('gasket_new', '#141414', 0.25).visible = false;
  makeGasket('gasket_old_back', '#2a2725', 0.95).visible = false;

  // ---- 文字盤保護シート（針を外すときにかぶせる） ----
  const sheetGeo = new THREE.RingGeometry(1.4, ext.R - 3.5, 64);
  sheetGeo.rotateX(-Math.PI / 2);
  const sheet = new THREE.Mesh(sheetGeo, new THREE.MeshStandardMaterial({ color: '#7fb6e0', transparent: true, opacity: 0.55, roughness: 0.3, side: THREE.DoubleSide }));
  sheet.position.y = ext.dialY + 0.42;
  add('dial_protector_sheet', sheet).visible = false;

  // 元の位置を記録（組み立てで戻すときに使う）
  for (const obj of Object.values(parts)) {
    obj.userData.home = { parent: obj.parent, position: obj.position.clone(), quaternion: obj.quaternion.clone() };
  }

  // ---- 動き：テンプの往復、ガンギ車の送り、アンクルの首振り、秒針 ----
  const escape = parts.escape_wheel;
  let phase = 0;
  /**
   * @param {Date} date 表示する時刻
   * @param {number} dt 経過時間（秒）
   * @param {{running:boolean, amplitude:number}} st
   */
  function animate(date, dt, st) {
    if (st.running) {
      phase += dt * Math.PI * 2 * 4; // 4Hz
      const amp = THREE.MathUtils.degToRad(Math.max(60, st.amplitude || 280));
      balance.rotation.y = Math.sin(phase) * amp;
      pal.rotation.y = -dir + (Math.sin(phase) > 0 ? 0.12 : -0.12);
      escape.rotation.y = Math.floor(phase / Math.PI) * ((Math.PI * 2) / 20 / 2);
    }
    // 針は文字盤とムーブメントに付いているときだけ動かす
    if (parts.hands.parent === root && st.handsMode) ext.setHands(date, st.handsMode);
  }

  return { root, parts, movementIds, setTime: (d, mode) => ext.setHands(d, mode), animate, droop: ext.droop, frozenTime: new Date(2026, 0, 1, 10, 8, 37) };
}
