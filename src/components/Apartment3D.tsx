import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ApartmentParams, FinishChoices, LayoutSpace, WorkStageId } from '../types.ts';
import { findFinish, type FinishGroup } from '../data/finishCatalog.ts';

// Whole-apartment "dollhouse": rooms laid out like the schematic plan (living rooms in a row,
// kitchen / bathrooms / hallway behind), walls without a ceiling so you can look inside,
// finishes appearing stage by stage with the client's chosen colours.

interface Apartment3DProps {
  params: ApartmentParams;
  spaces?: LayoutSpace[];
  doneStages: Set<WorkStageId>;
  finishes: FinishChoices;
  groups: FinishGroup[];
  wallpaper: boolean;
}

function synthSpaces(p: ApartmentParams): LayoutSpace[] {
  const baths = Array.from({ length: p.bathrooms }, (_, i) => ({ kind: 'bath' as const, area: i === 0 ? 4.5 : 3.5 }));
  const kitchen = { kind: 'kitchen' as const, area: Math.round(p.areaSqm * 0.15 * 10) / 10 };
  const livingTotal = p.areaSqm * 0.58;
  const living = Array.from({ length: p.rooms }, (_, i) => ({
    kind: 'living' as const,
    area: Math.round((livingTotal / p.rooms) * (i === 0 ? 1.25 : 0.9) * 10) / 10,
  }));
  return [...living, kitchen, ...baths];
}

type Rect = { x: number; z: number; w: number; d: number; kind: LayoutSpace['kind'] | 'hall' };

function layoutRects(p: ApartmentParams, spaces: LayoutSpace[]): Rect[] {
  const living = spaces.filter((s) => s.kind === 'living');
  const back = [...spaces.filter((s) => s.kind !== 'living')];
  const used = spaces.reduce((s, x) => s + x.area, 0);
  const hall = Math.max(3, p.areaSqm - used);
  const backItems: Array<{ kind: Rect['kind']; area: number }> = [...back, { kind: 'hall', area: hall }];
  const total = p.areaSqm;
  const width = Math.sqrt(total * 1.6); // apartment footprint ~1.6:1
  const frontArea = living.reduce((s, x) => s + x.area, 0) || 1;
  const backArea = backItems.reduce((s, x) => s + x.area, 0) || 1;
  const frontDepth = frontArea / width;
  const backDepth = backArea / width;
  const rects: Rect[] = [];
  let x = 0;
  for (const l of living) {
    const w = (l.area / frontArea) * width;
    rects.push({ x, z: 0, w, d: frontDepth, kind: 'living' });
    x += w;
  }
  x = 0;
  for (const b of backItems) {
    const w = (b.area / backArea) * width;
    rects.push({ x, z: frontDepth, w, d: backDepth, kind: b.kind });
    x += w;
  }
  // centre on the origin
  const depth = frontDepth + backDepth;
  return rects.map((r) => ({ ...r, x: r.x - width / 2, z: r.z - depth / 2 }));
}

export function Apartment3D({ params, spaces, doneStages, finishes, groups, wallpaper }: Apartment3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; group: THREE.Group } | null>(null);

  // one-time renderer setup
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      mount.textContent = '3D недоступно на этом устройстве.';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 200);
    camera.position.set(9, 12, 12);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 5;
    controls.maxDistance = 40;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(6, 14, 8);
    scene.add(sun);
    const group = new THREE.Group();
    scene.add(group);
    sceneRef.current = { renderer, scene, camera, controls, group };

    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, []);

  // rebuild the apartment when params, stage or colours change
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    const { group } = ctx;
    group.children.forEach((c) => {
      const m = c as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material)?.dispose?.();
    });
    group.clear();

    const has = (s: WorkStageId) => doneStages.has(s);
    const color = (c: string) => new THREE.Color(c);
    const concrete = '#8d8a84';
    const plaster = '#c9c6c0';
    const paint = findFinish('wall_paint', finishes.wall_paint, groups).color;
    const paper = findFinish('wallpaper', finishes.wallpaper, groups).color;
    const lam = findFinish('laminate', finishes.laminate, groups).color;
    const tile = findFinish('bath_tile', finishes.bath_tile, groups).color;
    const bathFloor = findFinish('bath_floor_tile', finishes.bath_floor_tile, groups).color;
    const door = findFinish('doors', finishes.doors, groups).color;

    const wallColor = (kind: Rect['kind']) => {
      if (kind === 'bath' && has('tiling')) return tile;
      if (has('walls_finish')) return wallpaper ? paper : paint;
      if (has('walls_rough')) return plaster;
      return concrete;
    };
    const floorColor = (kind: Rect['kind']) => {
      if (kind === 'bath') return has('tiling') ? bathFloor : has('floor_rough') ? '#a9a49b' : '#6f6c66';
      if (has('floor_finish')) return lam;
      return has('floor_rough') ? '#a9a49b' : '#6f6c66';
    };

    const H = Math.min(params.ceilingHeight, 3.3) * 0.9;
    const T = 0.12;
    const rects = layoutRects(params, spaces?.length ? spaces : synthSpaces(params));
    for (const r of rects) {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.06, r.d), new THREE.MeshStandardMaterial({ color: color(floorColor(r.kind)), roughness: 0.8 }));
      floor.position.set(r.x + r.w / 2, 0, r.z + r.d / 2);
      group.add(floor);
      const mat = new THREE.MeshStandardMaterial({ color: color(wallColor(r.kind)), roughness: 0.9 });
      const walls: Array<[number, number, number, number]> = [
        [r.x + r.w / 2, r.z, r.w, T],
        [r.x + r.w / 2, r.z + r.d, r.w, T],
        [r.x, r.z + r.d / 2, T, r.d],
        [r.x + r.w, r.z + r.d / 2, T, r.d],
      ];
      for (const [cx, cz, w, d] of walls) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), mat);
        wall.position.set(cx, H / 2, cz);
        group.add(wall);
      }
      // door into each room from the hallway side
      if (has('doors') && r.kind !== 'hall') {
        const dm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.0 * 0.9, 0.05), new THREE.MeshStandardMaterial({ color: color(door) }));
        dm.position.set(r.x + Math.min(r.w / 2, 1), 0.9, r.kind === 'living' ? r.z + r.d + T : r.z - T);
        group.add(dm);
      }
      // simple furniture once the apartment is finished
      if (has('cleaning')) {
        const f = new THREE.MeshStandardMaterial({ color: 0x334155 });
        const size: [number, number, number] =
          r.kind === 'living' ? [Math.min(2, r.w * 0.5), 0.45, 0.9] : r.kind === 'kitchen' ? [Math.min(2.4, r.w * 0.7), 0.9, 0.6] : r.kind === 'bath' ? [0.7, 0.5, 1.5] : [0, 0, 0];
        if (size[0] > 0) {
          const box = new THREE.Mesh(new THREE.BoxGeometry(...size), f);
          box.position.set(r.x + r.w / 2, size[1] / 2, r.z + r.d / 2);
          group.add(box);
        }
      }
    }
  }, [params, spaces, doneStages, finishes, groups, wallpaper]);

  return <div ref={mountRef} className="w-full h-72 sm:h-80 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200 dark:from-[#0f172a] dark:to-[#16213a] touch-none" />;
}

export default Apartment3D;
