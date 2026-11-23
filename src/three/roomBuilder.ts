import * as THREE from 'three';
import type { AccentToneId, Visual3DConfig } from '../types.ts';
import {
  createArtworkTexture,
  createFloorTexture,
  createSkyBackdropTexture,
  createWallTexture,
} from './textures.ts';

const ACCENT_HEX: Record<AccentToneId, number> = {
  graphite: 0x3b4252,
  warm_sand: 0xcabca6,
  emerald: 0x265448,
  terracotta: 0xa65239,
  royal_navy: 0x1e3358,
};

function setShadow(obj: THREE.Object3D, cast = true, receive = true) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

function createPottedPlant(): THREE.Group {
  const group = new THREE.Group();
  const potMat = new THREE.MeshStandardMaterial({ color: 0xd8d1c5, roughness: 0.72, metalness: 0.04 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x3b2d22, roughness: 0.95 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c432e, roughness: 0.85 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f5a3e, roughness: 0.55, metalness: 0.02 });

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.42, 20), potMat);
  pot.position.y = 0.21;
  group.add(pot);

  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 16), soilMat);
  soil.position.y = 0.41;
  group.add(soil);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.95, 10), stemMat);
  trunk.position.y = 0.88;
  group.add(trunk);

  const leafCoords: Array<[number, number, number, number]> = [
    [0, 1.4, 0, 0.28],
    [0.18, 1.24, 0.12, 0.22],
    [-0.17, 1.28, -0.1, 0.23],
    [0.12, 1.12, -0.16, 0.2],
    [-0.14, 1.1, 0.16, 0.2],
  ];
  for (const [lx, ly, lz, r] of leafCoords) {
    const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), leafMat);
    foliage.position.set(lx, ly, lz);
    foliage.scale.set(1.1, 0.82, 1.0);
    group.add(foliage);
  }
  setShadow(group, true, true);
  return group;
}

function createBrassFloorLamp(evening: boolean): THREE.Group {
  const group = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xd4a44a, roughness: 0.24, metalness: 0.88 });
  const shade = new THREE.MeshStandardMaterial({
    color: 0xf7efe0,
    roughness: 0.6,
    emissive: new THREE.Color(0xffb454),
    emissiveIntensity: evening ? 1.1 : 0.2,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 24), brass);
  base.position.y = 0.02;
  group.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 1.52, 12), brass);
  pole.position.y = 0.78;
  group.add(pole);

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 10), brass);
  arm.rotation.z = Math.PI / 3;
  arm.position.set(0.14, 1.52, 0);
  group.add(arm);

  const dome = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 24, 1, true), shade);
  dome.position.set(0.28, 1.46, 0);
  group.add(dome);

  setShadow(group, true, false);
  return group;
}

function createSofaGroup(accentColor: number): THREE.Group {
  const group = new THREE.Group();
  const fabric = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.86, metalness: 0.02 });
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 0.84 });
  const brassLeg = new THREE.MeshStandardMaterial({ color: 0xc99a44, roughness: 0.28, metalness: 0.85 });

  // Legs (4)
  for (const [lx, lz] of [[-1.15, -0.4], [1.15, -0.4], [-1.15, 0.4], [1.15, 0.4], [1.15, 1.25], [0.35, 1.25]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.14, 10), brassLeg);
    leg.position.set(lx, 0.07, lz);
    group.add(leg);
  }

  // Main base + chaise L-section
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.24, 0.96), fabric);
  base.position.set(0, 0.26, 0);
  group.add(base);

  const chaise = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.24, 0.9), fabric);
  chaise.position.set(0.79, 0.26, 0.88);
  group.add(chaise);

  // Seat cushions
  for (const cx of [-0.76, 0, 0.78]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.14, 0.84), fabric);
    seat.position.set(cx, 0.44, 0.04);
    group.add(seat);
  }
  const chaiseSeat = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.14, 0.92), fabric);
  chaiseSeat.position.set(0.79, 0.44, 0.86);
  group.add(chaiseSeat);

  // Backrest & armrests
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.56, 0.22), fabric);
  back.position.set(0, 0.64, -0.37);
  group.add(back);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.96), fabric);
  armL.position.set(-1.16, 0.54, 0);
  group.add(armL);

  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.96), fabric);
  armR.position.set(1.16, 0.54, 0);
  group.add(armR);

  // Accent cushions
  for (const [px, rot] of [[-0.82, 0.18], [-0.15, -0.1], [0.75, 0.14]]) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.14), pillowMat);
    cushion.position.set(px, 0.67, -0.18);
    cushion.rotation.y = rot;
    cushion.rotation.x = -0.18;
    group.add(cushion);
  }

  setShadow(group, true, true);
  return group;
}

function createCoffeeTable(): THREE.Group {
  const group = new THREE.Group();
  const marble = new THREE.MeshStandardMaterial({ color: 0x222730, roughness: 0.22, metalness: 0.15 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd4a243, roughness: 0.26, metalness: 0.88 });
  const bookMat = new THREE.MeshStandardMaterial({ color: 0xe9dfd0, roughness: 0.7 });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.08, 0.68), brass);
  plinth.position.y = 0.04;
  group.add(plinth);

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.28, 0.76), marble);
  top.position.y = 0.22;
  group.add(top);

  const book = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.2), bookMat);
  book.position.set(-0.22, 0.378, 0.08);
  book.rotation.y = 0.22;
  group.add(book);

  const vase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.08, 0.2, 18),
    new THREE.MeshStandardMaterial({ color: 0xd6c6b2, roughness: 0.45 }),
  );
  vase.position.set(0.25, 0.46, -0.08);
  group.add(vase);

  setShadow(group, true, true);
  return group;
}

function createConstructionTripod(): THREE.Group {
  const group = new THREE.Group();
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2b303a, roughness: 0.5, metalness: 0.65 });
  const laserBody = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.2 });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.55 });

  for (let i = 0; i < 3; i++) {
    const ang = (i * Math.PI * 2) / 3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 1.32, 8), legMat);
    leg.position.set(Math.cos(ang) * 0.24, 0.62, Math.sin(ang) * 0.24);
    leg.rotation.z = Math.cos(ang) * 0.28;
    leg.rotation.x = -Math.sin(ang) * 0.28;
    group.add(leg);
  }
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.16), laserBody);
  head.position.y = 1.32;
  group.add(head);

  // Subtle green laser level crosshair line
  const laserLine = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.008, 0.008), beamMat);
  laserLine.position.set(0, 1.34, 0);
  group.add(laserLine);

  setShadow(group, true, false);
  return group;
}

export function buildRenovationRoom(
  config: Visual3DConfig,
  maxAnisotropy: number,
  isSoftwareGl: boolean,
): THREE.Group {
  const root = new THREE.Group();
  const isBefore = config.renovationStage === 'before';
  const evening = config.lightingMode === 'evening';
  const accentHex = ACCENT_HEX[config.accentTone] ?? 0x3b4252;

  const W = 6.2; // room width X
  const D = 5.4; // room depth Z
  const H = 3.0; // room height Y

  const floorTex = createFloorTexture(isBefore ? 'raw_screed' : config.floorFinish, maxAnisotropy);
  const wallTex = createWallTexture(isBefore ? 'raw_concrete' : config.wallFinish, maxAnisotropy);

  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex.map,
    roughness: floorTex.roughness,
    metalness: floorTex.metalness,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex.map,
    roughness: wallTex.roughness,
    metalness: wallTex.metalness,
  });

  const outerShellMat = new THREE.MeshStandardMaterial({
    color: 0x182235,
    roughness: 0.72,
    metalness: 0.12,
  });

  // 1. Floor slab + outer architectural plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 0.36, 0.18, D + 0.36), outerShellMat);
  plinth.position.set(0, -0.09, 0);
  plinth.receiveShadow = true;
  root.add(plinth);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.005;
  floor.receiveShadow = true;
  root.add(floor);

  // 2. Cutaway Back Wall (Z = -D/2) & Left Wall (X = -W/2) with panoramic window opening on Left Wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(W + 0.36, H, 0.18), wallMat);
  backWall.position.set(0, H / 2, -D / 2 - 0.09);
  backWall.receiveShadow = true;
  backWall.castShadow = true;
  root.add(backWall);

  // Left wall with panoramic window framing (3 solid parts + glass + sky view)
  const leftWallSide1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, H, 1.1), wallMat);
  leftWallSide1.position.set(-W / 2 - 0.09, H / 2, -D / 2 + 0.55);
  leftWallSide1.receiveShadow = true;
  root.add(leftWallSide1);

  const leftWallSide2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, H, 1.1), wallMat);
  leftWallSide2.position.set(-W / 2 - 0.09, H / 2, D / 2 - 0.55);
  leftWallSide2.receiveShadow = true;
  root.add(leftWallSide2);

  const leftWallSill = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, D - 2.2), wallMat);
  leftWallSill.position.set(-W / 2 - 0.09, 0.26, 0);
  leftWallSill.receiveShadow = true;
  root.add(leftWallSill);

  const leftWallHeader = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, D - 2.2), wallMat);
  leftWallHeader.position.set(-W / 2 - 0.09, H - 0.21, 0);
  root.add(leftWallHeader);

  // Panoramic aluminum window frame + mullions + Bishkek mountain sky outside
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e242d, roughness: 0.32, metalness: 0.78 });
  const winW = D - 2.2;
  const winH = H - 0.94;
  for (const mz of [-winW / 2 + 0.03, 0, winW / 2 - 0.03]) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.1, winH, 0.06), frameMat);
    mullion.position.set(-W / 2 - 0.06, 0.52 + winH / 2, mz);
    root.add(mullion);
  }
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: evening ? 0x99b8e6 : 0xdff1ff,
    roughness: 0.08,
    metalness: 0.05,
    transparent: true,
    opacity: isSoftwareGl ? 0.25 : 0.22,
    depthWrite: false,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW - 0.08, winH - 0.06), glassMat);
  glass.rotation.y = Math.PI / 2;
  glass.position.set(-W / 2 - 0.06, 0.52 + winH / 2, 0);
  root.add(glass);

  const skyTex = createSkyBackdropTexture(config.lightingMode);
  const skyPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(winW + 0.4, winH + 0.3),
    new THREE.MeshBasicMaterial({ map: skyTex }),
  );
  skyPlane.rotation.y = Math.PI / 2;
  skyPlane.position.set(-W / 2 - 0.22, 0.52 + winH / 2, 0);
  root.add(skyPlane);

  // 3. Baseboards & Ceiling architectural trim (only after renovation)
  if (!isBefore) {
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.42, metalness: 0.05 });
    const baseBack = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, 0.03), trimMat);
    baseBack.position.set(0, 0.05, -D / 2 + 0.015);
    root.add(baseBack);

    const baseLeft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, D), trimMat);
    baseLeft.position.set(-W / 2 + 0.015, 0.05, 0);
    root.add(baseLeft);

    // Partial ceiling frame along back/left edges (keeps cutaway view open from top/front)
    const ceilingSoffitMat = new THREE.MeshStandardMaterial({ color: 0xf4f1eb, roughness: 0.65 });
    const soffitBack = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, 0.72), ceilingSoffitMat);
    soffitBack.position.set(0, H - 0.06, -D / 2 + 0.36);
    root.add(soffitBack);

    const soffitLeft = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, D), ceilingSoffitMat);
    soffitLeft.position.set(-W / 2 + 0.36, H - 0.06, 0);
    root.add(soffitLeft);

    // Ceiling Lighting Type
    if (config.ceilingType === 'floating_led') {
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0xffd58a,
        emissive: new THREE.Color(0xffaa33),
        emissiveIntensity: evening ? 2.6 : 1.0,
      });
      const stripBack = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 0.03, 0.04), ledMat);
      stripBack.position.set(0, H - 0.11, -D / 2 + 0.72);
      root.add(stripBack);

      const stripLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, D - 0.4), ledMat);
      stripLeft.position.set(-W / 2 + 0.72, H - 0.11, 0);
      root.add(stripLeft);
    } else if (config.ceilingType === 'track_spots') {
      const trackMat = new THREE.MeshStandardMaterial({ color: 0x1a1e26, roughness: 0.35, metalness: 0.75 });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.04, 0.06), trackMat);
      bar.position.set(0.2, H - 0.08, -0.4);
      root.add(bar);
      for (const sx of [-1.2, -0.3, 0.6, 1.5]) {
        const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 14), trackMat);
        spot.position.set(sx, H - 0.15, -0.4);
        spot.rotation.x = 0.25;
        root.add(spot);
      }
    } else {
      // Designer Brass Ring Chandelier
      const brass = new THREE.MeshStandardMaterial({ color: 0xdca84a, roughness: 0.2, metalness: 0.92 });
      const glowRing = new THREE.MeshStandardMaterial({
        color: 0xfff3d6,
        emissive: new THREE.Color(0xffb84d),
        emissiveIntensity: evening ? 2.2 : 0.8,
      });
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.56, 10), brass);
      rod.position.set(0.1, H - 0.28, -0.1);
      root.add(rod);

      const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.024, 14, 48), brass);
      ringOuter.rotation.x = Math.PI / 2;
      ringOuter.position.set(0.1, H - 0.56, -0.1);
      root.add(ringOuter);

      const ringInner = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.015, 10, 48), glowRing);
      ringInner.rotation.x = Math.PI / 2;
      ringInner.position.set(0.1, H - 0.57, -0.1);
      root.add(ringInner);
    }
  }

  // 4. BEFORE RENOVATION MODE: Raw Construction Stage
  if (isBefore) {
    const tripod = createConstructionTripod();
    tripod.position.set(0.1, 0.01, 0.1);
    root.add(tripod);

    // Stacked Knauf plaster bags & paint bucket on floor
    const bagMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c5, roughness: 0.9 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.7 });
    for (let i = 0; i < 3; i++) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.42), bagMat);
      bag.position.set(1.8, 0.09 + i * 0.16, -1.6);
      bag.rotation.y = (i - 1) * 0.08;
      bag.castShadow = true;
      bag.receiveShadow = true;
      root.add(bag);
    }
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.34, 18), stripeMat);
    bucket.position.set(1.05, 0.18, -1.75);
    bucket.castShadow = true;
    root.add(bucket);

    // Hanging construction cable & bare bulb
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.65, 8),
      new THREE.MeshStandardMaterial({ color: 0x18181b }),
    );
    cord.position.set(0, H - 0.32, -0.2);
    root.add(cord);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 14, 14),
      new THREE.MeshStandardMaterial({
        color: 0xfff5d6,
        emissive: new THREE.Color(0xffc966),
        emissiveIntensity: 1.5,
      }),
    );
    bulb.position.set(0, H - 0.66, -0.2);
    root.add(bulb);
    return root;
  }

  // 5. AFTER RENOVATION ROOM FURNISHINGS BY ROOM TYPE
  const walnutMat = new THREE.MeshStandardMaterial({ color: 0x5c3e2a, roughness: 0.44, metalness: 0.05 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd5a448, roughness: 0.24, metalness: 0.88 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd3, roughness: 0.28, metalness: 0.06 });

  if (config.roomType === 'living') {
    // Area rug (offset Y >= 0.02 to prevent Z-fighting)
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.024, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xd9d1c5, roughness: 0.94 }),
    );
    rug.position.set(0.15, 0.022, 0.35);
    rug.receiveShadow = true;
    root.add(rug);

    // L-shaped designer sofa
    const sofa = createSofaGroup(accentHex);
    sofa.position.set(0.25, 0.03, 0.95);
    sofa.rotation.y = Math.PI;
    root.add(sofa);

    // Marble & brass coffee table
    const table = createCoffeeTable();
    table.position.set(0.15, 0.03, -0.35);
    root.add(table);

    // Floating Walnut Media Console + Accent Slatted Panel + TV on Back Wall
    const consoleMesh = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.36, 0.44), walnutMat);
    consoleMesh.position.set(0.2, 0.46, -D / 2 + 0.24);
    setShadow(consoleMesh, true, true);
    root.add(consoleMesh);

    const tvFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.98, 0.045),
      new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.14, metalness: 0.45 }),
    );
    tvFrame.position.set(0.2, 1.44, -D / 2 + 0.06);
    root.add(tvFrame);

    // Framed abstract art on back wall left
    const artTex = createArtworkTexture(maxAnisotropy);
    const artFrame = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.32, 0.04), brassMat);
    artFrame.position.set(-1.95, 1.56, -D / 2 + 0.04);
    root.add(artFrame);
    const artCanvas = new THREE.Mesh(
      new THREE.PlaneGeometry(0.94, 1.24),
      new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.5 }),
    );
    artCanvas.position.set(-1.95, 1.56, -D / 2 + 0.065);
    root.add(artCanvas);

    const lamp = createBrassFloorLamp(evening);
    lamp.position.set(-1.75, 0.01, 1.15);
    root.add(lamp);

    const plant = createPottedPlant();
    plant.position.set(2.35, 0.01, -1.9);
    root.add(plant);
  } else if (config.roomType === 'bedroom') {
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.024, 2.7),
      new THREE.MeshStandardMaterial({ color: 0xdfd8cc, roughness: 0.94 }),
    );
    rug.position.set(0.2, 0.022, 0.15);
    rug.receiveShadow = true;
    root.add(rug);

    // Fluted Oak Headboard Wall Panel
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 0.06), walnutMat);
    panel.position.set(0.2, 1.35, -D / 2 + 0.04);
    root.add(panel);

    // King Bed Group
    const bedGroup = new THREE.Group();
    const bedFrameMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.82 });
    const linenMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.88 });
    const throwMat = new THREE.MeshStandardMaterial({ color: 0xb68d5c, roughness: 0.86 });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.34, 2.25), bedFrameMat);
    frame.position.set(0, 0.22, 0);
    bedGroup.add(frame);

    const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.05, 0.14), bedFrameMat);
    headboard.position.set(0, 0.62, -1.08);
    bedGroup.add(headboard);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.24, 2.1), linenMat);
    mattress.position.set(0, 0.48, 0.02);
    bedGroup.add(mattress);

    const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.09, 0.85), throwMat);
    blanket.position.set(0, 0.59, 0.58);
    bedGroup.add(blanket);

    for (const px of [-0.46, 0.46]) {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.42), linenMat);
      pillow.position.set(px, 0.66, -0.74);
      pillow.rotation.x = 0.22;
      bedGroup.add(pillow);
    }
    bedGroup.position.set(0.2, 0.03, -1.25);
    setShadow(bedGroup, true, true);
    root.add(bedGroup);

    // Two Nightstands with warm brass lamps
    for (const nx of [-1.25, 1.65]) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.46, 0.44), walnutMat);
      stand.position.set(nx, 0.28, -D / 2 + 0.32);
      setShadow(stand, true, true);
      root.add(stand);

      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xfff5e0,
          emissive: new THREE.Color(0xffb44c),
          emissiveIntensity: evening ? 1.8 : 0.3,
        }),
      );
      globe.position.set(nx, 0.64, -D / 2 + 0.32);
      root.add(globe);
    }

    const plant = createPottedPlant();
    plant.position.set(-2.25, 0.01, 1.55);
    root.add(plant);
  } else if (config.roomType === 'kitchen') {
    // Full Back Wall Kitchen Cabinetry + Marble Backsplash
    const cabMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.46, metalness: 0.08 });
    const lowerCab = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.88, 0.64), cabMat);
    lowerCab.position.set(0.2, 0.44, -D / 2 + 0.34);
    setShadow(lowerCab, true, true);
    root.add(lowerCab);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(5.24, 0.05, 0.68), stoneMat);
    counter.position.set(0.2, 0.905, -D / 2 + 0.35);
    root.add(counter);

    const upperCab = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.88, 0.38), walnutMat);
    upperCab.position.set(0.2, 2.02, -D / 2 + 0.21);
    setShadow(upperCab, true, true);
    root.add(upperCab);

    // Under-cabinet warm LED bar
    const underLed = new THREE.Mesh(
      new THREE.BoxGeometry(4.9, 0.025, 0.03),
      new THREE.MeshStandardMaterial({
        color: 0xffe4b3,
        emissive: new THREE.Color(0xffb03a),
        emissiveIntensity: evening ? 2.4 : 0.8,
      }),
    );
    underLed.position.set(0.2, 1.57, -D / 2 + 0.35);
    root.add(underLed);

    // Sculpted Travertine Kitchen Island
    const islandBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.88, 1.05), stoneMat);
    islandBase.position.set(0.15, 0.44, 0.35);
    setShadow(islandBase, true, true);
    root.add(islandBase);

    const islandTop = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.06, 1.18), stoneMat);
    islandTop.position.set(0.15, 0.91, 0.35);
    root.add(islandTop);

    // Brass Faucet on Island
    const faucet = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.016, 10, 20, Math.PI), brassMat);
    faucet.position.set(0.15, 1.12, 0.22);
    root.add(faucet);
    const faucetStem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.2, 10), brassMat);
    faucetStem.position.set(0.03, 1.04, 0.22);
    root.add(faucetStem);

    // 3 Bar Stools along Island
    for (const bx of [-0.7, 0.15, 1.0]) {
      const stool = new THREE.Group();
      const seat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.18, 0.08, 20),
        new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.78 }),
      );
      seat.position.y = 0.66;
      stool.add(seat);
      for (const [lx, lz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.64, 8), brassMat);
        leg.position.set(lx, 0.32, lz);
        stool.add(leg);
      }
      stool.position.set(bx, 0.01, 1.18);
      setShadow(stool, true, true);
      root.add(stool);
    }

    const plant = createPottedPlant();
    plant.position.set(-2.3, 0.01, 1.7);
    root.add(plant);
  } else {
    // Luxury Spa Bathroom
    const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.16, metalness: 0.04 });

    // Floating Oak Vanity + Dual Basin + Backlit Mirror
    const vanity = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.56, 0.54), walnutMat);
    vanity.position.set(-0.35, 0.58, -D / 2 + 0.3);
    setShadow(vanity, true, true);
    root.add(vanity);

    const vanityTop = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.1, 0.58), ceramicMat);
    vanityTop.position.set(-0.35, 0.91, -D / 2 + 0.3);
    root.add(vanityTop);

    const mirrorHalo = new THREE.Mesh(
      new THREE.BoxGeometry(1.88, 1.08, 0.025),
      new THREE.MeshStandardMaterial({
        color: 0xffe4b0,
        emissive: new THREE.Color(0xffb444),
        emissiveIntensity: evening ? 2.1 : 0.85,
      }),
    );
    mirrorHalo.position.set(-0.35, 1.72, -D / 2 + 0.025);
    root.add(mirrorHalo);

    const mirrorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.0, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xdce4ee, roughness: 0.05, metalness: 0.92 }),
    );
    mirrorGlass.position.set(-0.35, 1.72, -D / 2 + 0.045);
    root.add(mirrorGlass);

    // Freestanding Sculptural Tub
    const tubOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.46, 0.58, 28), ceramicMat);
    tubOuter.scale.set(1.65, 1, 0.95);
    tubOuter.position.set(-0.65, 0.3, 0.95);
    setShadow(tubOuter, true, true);
    root.add(tubOuter);

    const tubFaucet = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.88, 12), brassMat);
    tubFaucet.position.set(-1.68, 0.44, 0.95);
    root.add(tubFaucet);

    // Walk-in Glass Shower Enclosure on Right Back Corner
    const showerFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.35, 1.8), brassMat);
    showerFrame.position.set(1.25, 1.18, -D / 2 + 0.92);
    root.add(showerFrame);

    const showerGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 2.3, 1.74),
      new THREE.MeshPhysicalMaterial({
        color: 0xe6f2ff,
        roughness: 0.06,
        transparent: true,
        opacity: isSoftwareGl ? 0.28 : 0.22,
        depthWrite: false,
      }),
    );
    showerGlass.position.set(1.25, 1.18, -D / 2 + 0.92);
    root.add(showerGlass);

    const rainHead = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 20), brassMat);
    rainHead.position.set(2.05, 2.28, -D / 2 + 0.65);
    root.add(rainHead);

    const plant = createPottedPlant();
    plant.position.set(2.15, 0.01, 1.45);
    root.add(plant);
  }

  return root;
}
