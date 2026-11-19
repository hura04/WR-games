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
import { dialTexture, casebackTexture, batteryTexture, labelTexture } from './textures.js';

const metal = (color, rough = 0.35) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: rough });
const plain = (color, rough = 0.7) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });

function tag(obj, partId) {
  obj.traverse((o) => {
    if (o.isMesh) o.userData.partId = partId;
  });
  obj.userData.partId = partId;
  obj.name = partId;
  return obj;
}

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

  const R = def.caseDiameter / 2; // 18
  const H = def.caseThickness; // 9
  const yBack = -H / 2; // ケース裏面の高さ
  const yFront = H / 2;
  const caseMat = metal(def.caseColor, 0.28);

  // ---- ケース（胴）とラグ ----
  const caseGroup = new THREE.Group();
  // 下側（裏蓋が当たる部分）は内径を小さく、上側（文字盤まわり）は風防の径に合わせる
  const caseLower = new THREE.Mesh(ringGeometry(R, def.casebackDiameter / 2 - 0.6, 4.2, 0.5), caseMat);
  caseLower.position.y = yBack;
  const caseUpper = new THREE.Mesh(ringGeometry(R, def.crystalDiameter / 2, H - 1.6 - 4.0, 0.5), caseMat);
  caseUpper.position.y = yBack + 4.0;
  caseGroup.add(caseLower, caseUpper);
  const lugGeo = new THREE.BoxGeometry(2.4, 3.2, 7);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const lug = new THREE.Mesh(lugGeo, caseMat);
      lug.position.set(sx * (def.lugWidth / 2 + 1.2), yBack + 3.2, sz * (R + 1.5));
      lug.rotation.x = sz * 0.12;
      caseGroup.add(lug);
    }
  add('case', caseGroup);

  // ---- ベゼル・風防・文字盤 ----
  const bezel = new THREE.Mesh(ringGeometry(R - 0.3, def.crystalDiameter / 2, 1.4, 0.4), caseMat);
  bezel.position.y = yFront - 1.6;
  add('bezel', bezel);

  const crystal = new THREE.Mesh(
    discGeometry(def.crystalDiameter / 2, 1.0),
    new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 0.95, transparent: true, opacity: 0.25, roughness: 0.02, thickness: 1 }),
  );
  crystal.position.y = yFront - 1.5;
  add('crystal', crystal);

  const dial = texturedCircle(def.crystalDiameter / 2 - 0.2, dialTexture(def));
  dial.material.metalness = 0.1;
  dial.material.roughness = 0.6;
  dial.position.y = yFront - 3.2;
  add('dial', dial);

  // ---- 針（中心に回転軸） ----
  const handMat = metal(def.handColor, 0.3);
  const makeHand = (len, width, y, color) => {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(width, 0.15, len), color ? plain(color, 0.4) : handMat);
    m.position.set(0, 0, -len / 2 + len * 0.12);
    pivot.add(m);
    pivot.position.y = y;
    return pivot;
  };
  const hourHand = makeHand(8.5, 1.1, yFront - 2.9);
  const minuteHand = makeHand(12.5, 0.8, yFront - 2.7);
  const secondHand = makeHand(13.5, 0.25, yFront - 2.5, '#c0392b');
  const cap = new THREE.Mesh(discGeometry(0.7, 0.3), handMat);
  cap.position.y = yFront - 2.5;
  const hands = new THREE.Group();
  hands.add(hourHand, minuteHand, secondHand, cap);
  add('dial', hands, root); // 針も「文字盤」扱い（触らない部品）
  parts.dial = dial;

  // ---- リューズ ----
  const crownGroup = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2.6, 28), caseMat);
  crown.rotation.z = Math.PI / 2;
  crown.position.x = R + 1.6;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.2, 16), caseMat);
  tube.rotation.z = Math.PI / 2;
  tube.position.x = R + 0.1;
  crownGroup.add(crown, tube);
  crownGroup.position.y = yBack + 3.6;
  add('crown', crownGroup);

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
  add('rotor', rotor);
  const statorMat = metal('#9aa0a6', 0.5);
  const stator = new THREE.Mesh(ringGeometry(1.9, 1.25, 0.4), statorMat);
  stator.position.set(-1.6, mvY - 0.4, -5.5);
  add('rotor', stator);

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
  add('gasket_seat', seat);
  const makeGasket = (id, color, rough) => {
    const g = new THREE.Mesh(new THREE.TorusGeometry(gasketR, 0.45, 10, 64), plain(color, rough));
    g.rotation.x = Math.PI / 2;
    g.position.y = yBack - 0.15;
    return add(id, g);
  };
  makeGasket('gasket', '#2a2725', 0.95); // 古い：つやがない
  makeGasket('gasket_new', '#141414', 0.25).visible = false; // 新品：グリスでつやがある
  makeGasket('gasket_old_back', '#2a2725', 0.95).visible = false;

  // ---- 裏蓋（こじ口つき） ----
  const backR = def.casebackDiameter / 2;
  const cbGroup = new THREE.Group();
  const cbBody = new THREE.Mesh(discGeometry(backR, 1.0), metal('#b9bdc3', 0.3));
  cbBody.position.y = -1.0;
  const cbFace = texturedCircle(backR - 0.6, casebackTexture(), false);
  cbFace.position.y = -1.01;
  const cbStep = new THREE.Mesh(ringGeometry(backR - 0.6, backR - 1.4, 0.6), metal('#b9bdc3', 0.3));
  cbStep.position.y = 0;
  cbGroup.add(cbBody, cbFace, cbStep);
  cbGroup.position.y = yBack;
  add('caseback', cbGroup);
  // こじ口（6時側のラグ寄り、裏蓋のふちの切り欠き）
  // 裏蓋の面から見える暗いすき間として表現（外周から少しはみ出す）
  const notch = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 2.0), plain('#26282c', 0.6));
  const notchAngle = Math.PI / 2 + 0.38; // 6時から少し4時側
  notch.position.set(Math.cos(notchAngle) * (backR - 0.5), -1.1, Math.sin(notchAngle) * (backR - 0.5));
  notch.rotation.y = -notchAngle + Math.PI / 2;
  tag(notch, 'caseback_notch');
  cbGroup.add(notch);
  parts.caseback_notch = notch;

  // それぞれの部品の元の位置を覚えておく（戻すときに使う）
  for (const obj of Object.values(parts)) {
    obj.userData.home = { parent: obj.parent, position: obj.position.clone(), quaternion: obj.quaternion.clone() };
  }

  let rotorAngle = 0;
  let lastSecond = -1;
  /**
   * 針を動かす
   * @param {Date} date
   * @param {'running'|'stopped'|'eol'} mode
   */
  function setTime(date, mode) {
    const s = date.getSeconds();
    const m = date.getMinutes() + s / 60;
    const h = (date.getHours() % 12) + m / 60;
    hourHand.rotation.y = -(h / 12) * Math.PI * 2;
    minuteHand.rotation.y = -(m / 60) * Math.PI * 2;
    if (mode === 'running') secondHand.rotation.y = -(s / 60) * Math.PI * 2;
    if (mode === 'eol') secondHand.rotation.y = -((s - (s % 2)) / 60) * Math.PI * 2;
    if (mode === 'running' && s !== lastSecond) {
      rotorAngle += Math.PI;
      rotor.rotation.y = rotorAngle;
    }
    lastSecond = s;
  }

  return { root, parts, setTime, frozenTime: new Date(2026, 0, 1, 10, 8, 37) };
}
