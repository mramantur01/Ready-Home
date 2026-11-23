import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Bookmark,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  Moon,
  RotateCcw,
  Sun,
} from 'lucide-react';
import type {
  AccentToneId,
  CeilingTypeId,
  FloorFinishId,
  Lang,
  MaterialTier,
  Room3DType,
  StylePresetId,
  Visual3DConfig,
  WallFinishId,
} from '../types.ts';
import { calculate3DProjectEstimate } from '../data/defaultContent.ts';
import { formatKgs, TIER_LABELS, UI_COPY } from '../i18n.ts';
import { buildRenovationRoom } from '../three/roomBuilder.ts';

interface RenovationStudio3DProps {
  lang: Lang;
  onBookWith3D: (config: Visual3DConfig) => void;
  onSavePreset?: (config: Visual3DConfig) => Promise<boolean>;
  isLoggedIn: boolean;
}

type CameraPresetId = 'iso' | 'inside' | 'top' | 'detail';
type ControlTab = 'room' | 'walls' | 'floor' | 'ceiling' | 'params';

const CAMERA_PRESETS: Record<CameraPresetId, { pos: [number, number, number]; target: [number, number, number] }> = {
  iso: { pos: [6.4, 4.9, 6.2], target: [0, 1.0, -0.15] },
  inside: { pos: [2.7, 1.65, 2.35], target: [-0.4, 1.18, -1.2] },
  top: { pos: [0.1, 8.6, 1.4], target: [0, 0.2, -0.1] },
  detail: { pos: [2.4, 1.8, -0.3], target: [-0.6, 0.95, -1.4] },
};

const STYLE_PRESETS: Record<
  StylePresetId,
  {
    label: Record<Lang, string>;
    wallFinish: WallFinishId;
    floorFinish: FloorFinishId;
    ceilingType: CeilingTypeId;
    accentTone: AccentToneId;
    lightingMode: 'day' | 'evening';
  }
> = {
  minimal: {
    label: { ru: 'Минимализм', ky: 'Минимализм', en: 'Minimalist' },
    wallFinish: 'warm_ivory',
    floorFinish: 'oak_herringbone',
    ceilingType: 'floating_led',
    accentTone: 'warm_sand',
    lightingMode: 'day',
  },
  ready_amber: {
    label: { ru: 'READY Dark Amber', ky: 'READY Dark Amber', en: 'READY Dark Amber' },
    wallFinish: 'navy_velvet',
    floorFinish: 'walnut_plank',
    ceilingType: 'floating_led',
    accentTone: 'graphite',
    lightingMode: 'evening',
  },
  neoclassic: {
    label: { ru: 'Неоклассика', ky: 'Неоклассика', en: 'Neoclassic' },
    wallFinish: 'sand_plaster',
    floorFinish: 'travertine_tile',
    ceilingType: 'designer_chandelier',
    accentTone: 'royal_navy',
    lightingMode: 'evening',
  },
  warm_loft: {
    label: { ru: 'Тёплый Лофт', ky: 'Жылуу Лофт', en: 'Warm Loft' },
    wallFinish: 'wood_slats',
    floorFinish: 'slate_porcelain',
    ceilingType: 'track_spots',
    accentTone: 'terracotta',
    lightingMode: 'evening',
  },
  scandi: {
    label: { ru: 'Сканди', ky: 'Сканди', en: 'Scandi' },
    wallFinish: 'sage_matte',
    floorFinish: 'oak_herringbone',
    ceilingType: 'track_spots',
    accentTone: 'emerald',
    lightingMode: 'day',
  },
};

const ROOM_OPTIONS: Array<{ id: Room3DType; label: Record<Lang, string> }> = [
  { id: 'living', label: { ru: 'Гостиная-студия', ky: 'Конок бөлмө', en: 'Living Studio' } },
  { id: 'bedroom', label: { ru: 'Мастер-спальня', ky: 'Уктоочу бөлмө', en: 'Master Bedroom' } },
  { id: 'kitchen', label: { ru: 'Кухня-столовая', ky: 'Ашкана-столовая', en: 'Kitchen & Dining' } },
  { id: 'bathroom', label: { ru: 'Ванная / Санузел', ky: 'Ванна / Санузел', en: 'Spa Bathroom' } },
];

const WALL_OPTIONS: Array<{ id: WallFinishId; swatch: string; label: Record<Lang, string> }> = [
  { id: 'warm_ivory', swatch: '#f0ebe2', label: { ru: 'Тёплый шёлк', ky: 'Жылуу ак', en: 'Warm Ivory' } },
  { id: 'sand_plaster', swatch: '#dfd1bc', label: { ru: 'Венецианская штукатурка', ky: 'Венеция штукатуркасы', en: 'Venetian Plaster' } },
  { id: 'graphite_silk', swatch: '#3a414d', label: { ru: 'Графитовый шёлк', ky: 'Графит', en: 'Graphite Silk' } },
  { id: 'sage_matte', swatch: '#b9c4b8', label: { ru: 'Шалфей матовый', ky: 'Шалфей', en: 'Matte Sage' } },
  { id: 'navy_velvet', swatch: '#1f2d47', label: { ru: 'Глубокий синий', ky: 'Кочкул көк', en: 'Deep Navy' } },
  { id: 'wood_slats', swatch: '#9c6e44', label: { ru: 'Дубовые рейки', ky: 'Эмен рейкалар', en: 'Fluted Oak Slats' } },
  { id: 'travertine_slab', swatch: '#e4dacb', label: { ru: 'Слэбы травертина', ky: 'Травертин плита', en: 'Travertine Slabs' } },
];

const FLOOR_OPTIONS: Array<{ id: FloorFinishId; swatch: string; label: Record<Lang, string> }> = [
  { id: 'oak_herringbone', swatch: '#b88b5a', label: { ru: 'Дуб ёлочка', ky: 'Эмен паркет', en: 'Oak Herringbone' } },
  { id: 'walnut_plank', swatch: '#654632', label: { ru: 'Инженерный орех', ky: 'Жаңгак такта', en: 'Walnut Plank' } },
  { id: 'travertine_tile', swatch: '#dfd4c3', label: { ru: 'Керамогранит травертин', ky: 'Травертин плит', en: 'Travertine Tile' } },
  { id: 'slate_porcelain', swatch: '#4a505a', label: { ru: 'Сланцевый гранит', ky: 'Кара керамогранит', en: 'Slate Porcelain' } },
  { id: 'microcement', swatch: '#c5c1ba', label: { ru: 'Микроцемент', ky: 'Микроцемент', en: 'Microcement' } },
];

const CEILING_OPTIONS: Array<{ id: CeilingTypeId; label: Record<Lang, string> }> = [
  { id: 'floating_led', label: { ru: 'Парящий с LED', ky: 'LED парящий шып', en: 'Floating LED Cove' } },
  { id: 'track_spots', label: { ru: 'Трековый свет', ky: 'Тректик жарык', en: 'Architectural Track' } },
  { id: 'designer_chandelier', label: { ru: 'Люстра-кольцо', ky: 'Дизайнердик люстра', en: 'Brass Ring Pendant' } },
];

const ACCENT_OPTIONS: Array<{ id: AccentToneId; swatch: string; label: Record<Lang, string> }> = [
  { id: 'graphite', swatch: '#3b4252', label: { ru: 'Графит', ky: 'Графит', en: 'Graphite' } },
  { id: 'warm_sand', swatch: '#cabca6', label: { ru: 'Песок', ky: 'Кум', en: 'Warm Sand' } },
  { id: 'emerald', swatch: '#265448', label: { ru: 'Изумруд', ky: 'Зумуруд', en: 'Emerald' } },
  { id: 'terracotta', swatch: '#a65239', label: { ru: 'Терракота', ky: 'Терракота', en: 'Terracotta' } },
  { id: 'royal_navy', swatch: '#1e3358', label: { ru: 'Индиго', ky: 'Индиго', en: 'Indigo' } },
];

// Reusable module-scope math vectors (Zero GC inside render loop)
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function RenovationStudio3D({
  lang,
  onBookWith3D,
  onSavePreset,
  isLoggedIn,
}: RenovationStudio3DProps) {
  const copy = UI_COPY[lang].studio3d;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);
  const [dockOpen, setDockOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<ControlTab>('room');
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('iso');
  const [saveFeedback, setSaveFeedback] = useState<string>('');

  const [config, setConfig] = useState<Omit<Visual3DConfig, 'estimatedPriceKgs'>>({
    roomType: 'living',
    stylePreset: 'minimal',
    wallFinish: 'warm_ivory',
    floorFinish: 'oak_herringbone',
    ceilingType: 'floating_led',
    accentTone: 'graphite',
    lightingMode: 'evening',
    renovationStage: 'after',
    areaSqm: 78,
    tier: 'comfort',
  });

  const estimatedPriceKgs = useMemo(() => calculate3DProjectEstimate(config), [config]);
  const fullConfig: Visual3DConfig = useMemo(
    () => ({ ...config, estimatedPriceKgs }),
    [config, estimatedPriceKgs],
  );

  // Refs to interact with persistent WebGL scene without tearing down renderer
  const sceneCtxRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    renderer: THREE.WebGLRenderer;
    keyLight: THREE.DirectionalLight;
    fillLight: THREE.HemisphereLight;
    warmPoint: THREE.PointLight;
    roomHolder: THREE.Group;
    isSoftwareGl: boolean;
    maxAniso: number;
    requestRender: () => void;
    transitionCamera: (preset: CameraPresetId) => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(300, container.clientWidth);
    const height = Math.max(360, container.clientHeight);
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1526);
    scene.fog = new THREE.FogExp2(0x0d1526, 0.022);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    camera.position.set(...CAMERA_PRESETS.iso.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.iso.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.1;
    controls.maxDistance = 13.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.update();

    // 3-point warm/cool studio architectural rig
    const fillLight = new THREE.HemisphereLight(0xcfe0ff, 0x26201a, 0.65);
    scene.add(fillLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 1.5);
    keyLight.position.set(-6, 7.5, 5.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x88b4ff, 0.45);
    rimLight.position.set(6, 4.5, -5);
    scene.add(rimLight);

    const warmPoint = new THREE.PointLight(0xffb55a, 3.2, 12, 1.8);
    warmPoint.position.set(0.1, 2.55, -0.2);
    scene.add(warmPoint);

    const roomHolder = new THREE.Group();
    scene.add(roomHolder);

    // Subtle grounding contact shadow plane beneath architectural diorama
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshStandardMaterial({ color: 0x0b1222, roughness: 0.96, metalness: 0.02 }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let transitioning = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        const now = performance.now();
        const dt = Math.min(0.08, (now - lastTime) / 1000);
        lastTime = now;

        if (transitioning) {
          const alpha = isSoftwareGl ? 1 : 1 - Math.exp(-7 * dt);
          camera.position.lerp(_camGoalPos, alpha);
          controls.target.lerp(_camGoalTarget, alpha);
          if (
            camera.position.distanceTo(_camGoalPos) < 0.03 &&
            controls.target.distanceTo(_camGoalTarget) < 0.03
          ) {
            camera.position.copy(_camGoalPos);
            controls.target.copy(_camGoalTarget);
            transitioning = false;
          } else {
            renderDirty = true;
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    function transitionCamera(preset: CameraPresetId) {
      const p = CAMERA_PRESETS[preset];
      _camGoalPos.set(...p.pos);
      _camGoalTarget.set(...p.target);
      transitioning = true;
      lastTime = performance.now();
      requestRender();
    }

    const onControlsStart = () => {
      transitioning = false;
    };
    const onControlsChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlsStart);
    controls.addEventListener('change', onControlsChange);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = Math.max(300, container.clientWidth);
      const h = Math.max(360, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    sceneCtxRef.current = {
      scene,
      camera,
      controls,
      renderer,
      keyLight,
      fillLight,
      warmPoint,
      roomHolder,
      isSoftwareGl,
      maxAniso,
      requestRender,
      transitionCamera,
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('change', onControlsChange);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      envTex.dispose();
      renderer.dispose();
      sceneCtxRef.current = null;
    };
  }, []);

  // Rebuild 3D room & lighting whenever customization config changes
  useEffect(() => {
    const ctx = sceneCtxRef.current;
    if (!ctx) return;

    // Dispose old room geometry/materials/textures cleanly
    while (ctx.roomHolder.children.length > 0) {
      const child = ctx.roomHolder.children[0];
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            if (!mat) continue;
            const std = mat as THREE.MeshStandardMaterial;
            std.map?.dispose();
            mat.dispose();
          }
        }
      });
      ctx.roomHolder.remove(child);
    }

    const room = buildRenovationRoom(fullConfig, ctx.maxAniso, ctx.isSoftwareGl);
    ctx.roomHolder.add(room);

    // Adjust studio lighting to match Day vs Evening mode
    if (fullConfig.lightingMode === 'day') {
      ctx.scene.background = new THREE.Color(0x16243d);
      (ctx.scene.fog as THREE.FogExp2).color.setHex(0x16243d);
      ctx.keyLight.color.setHex(0xfff6e8);
      ctx.keyLight.intensity = 1.95;
      ctx.fillLight.intensity = 0.9;
      ctx.warmPoint.intensity = fullConfig.renovationStage === 'before' ? 1.2 : 1.8;
    } else {
      ctx.scene.background = new THREE.Color(0x0c1424);
      (ctx.scene.fog as THREE.FogExp2).color.setHex(0x0c1424);
      ctx.keyLight.color.setHex(0xffd2a1);
      ctx.keyLight.intensity = 0.85;
      ctx.fillLight.intensity = 0.48;
      ctx.warmPoint.intensity = fullConfig.renovationStage === 'before' ? 2.6 : 4.2;
    }

    ctx.requestRender();
  }, [fullConfig]);

  const applyPreset = (presetId: StylePresetId) => {
    const p = STYLE_PRESETS[presetId];
    setConfig((prev) => ({
      ...prev,
      stylePreset: presetId,
      wallFinish: p.wallFinish,
      floorFinish: p.floorFinish,
      ceilingType: p.ceilingType,
      accentTone: p.accentTone,
      lightingMode: p.lightingMode,
      renovationStage: 'after',
    }));
  };

  const handleCameraChange = (preset: CameraPresetId) => {
    setCameraPreset(preset);
    sceneCtxRef.current?.transitionCamera(preset);
  };

  const handleSave = async () => {
    if (!onSavePreset) return;
    const ok = await onSavePreset(fullConfig);
    if (ok) {
      setSaveFeedback(copy.savedOk);
      setTimeout(() => setSaveFeedback(''), 2500);
    }
  };

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
              {copy.kicker}
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white"
              style={{ textWrap: 'balance' }}
            >
              {copy.title}
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
              {copy.subtitle}
            </p>
          </div>

          {/* Before / After 3D Stage Segmented Control */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-[#0d1526] border border-slate-300 dark:border-white/10">
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, renovationStage: 'before' }))}
                className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  config.renovationStage === 'before'
                    ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {copy.beforeBtn}
              </button>
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, renovationStage: 'after' }))}
                className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  config.renovationStage === 'after'
                    ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {copy.afterBtn}
              </button>
            </div>
          </div>
        </div>

        {/* Full-Width Unobstructed 3D Viewport Container */}
        <div className="relative w-full h-[560px] sm:h-[640px] lg:h-[680px] rounded-3xl overflow-hidden border border-slate-300 dark:border-white/10 bg-[#0d1526] shadow-2xl">
          {/* Isolated WebGL mount div */}
          <div
            ref={mountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            aria-label="Интерактивный 3D-конструктор ремонта квартиры READY HOME"
          />

          {webglError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1526] text-center p-6">
              <Layers className="w-10 h-10 text-amber-500 mb-3" />
              <p className="text-white font-semibold text-lg">WebGL временно недоступен в браузере</p>
              <p className="text-slate-400 text-sm mt-1 max-w-md">
                Вы всё равно можете выбрать стиль, площадь и записаться на бесплатный 3D-замер с нашим архитектором.
              </p>
            </div>
          )}

          {/* Top-Left Minimal Spec Readout (no backdrop-filter over WebGL!) */}
          <div className="pointer-events-none absolute top-4 left-4 right-4 flex flex-wrap items-start justify-between gap-3 z-10">
            <div className="pointer-events-auto rounded-2xl bg-[#0b1222]/90 border border-white/10 px-4 py-2.5 text-white">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span>{ROOM_OPTIONS.find((r) => r.id === config.roomType)?.label[lang]}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{config.areaSqm} м²</span>
                <span aria-hidden="true">·</span>
                <span>{TIER_LABELS[config.tier][lang]}</span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-xs text-slate-400">{copy.estimateLabel}:</span>
                <span className="text-lg font-bold text-amber-400 tabular-nums">
                  {formatKgs(estimatedPriceKgs)}
                </span>
              </div>
            </div>

            {/* Top-Right Compact Camera & Day/Evening Bar */}
            <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl bg-[#0b1222]/90 border border-white/10 p-1.5">
              {(['iso', 'inside', 'top', 'detail'] as CameraPresetId[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleCameraChange(preset)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    cameraPreset === preset
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {copy.camera[preset]}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    lightingMode: c.lightingMode === 'day' ? 'evening' : 'day',
                  }))
                }
                title={config.lightingMode === 'day' ? copy.eveningMode : copy.dayMode}
                className="p-1.5 rounded-xl text-amber-400 hover:bg-white/10 transition-colors cursor-pointer"
              >
                {config.lightingMode === 'day' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => handleCameraChange('iso')}
                title="Сброс камеры"
                className="p-1.5 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Unified Collapsible Bottom Control Dock (Zero Side-Panel Occlusion) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[960px] z-20 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setDockOpen((v) => !v)}
              className="mb-1.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0b1222]/95 border border-white/15 text-xs font-medium text-slate-200 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{dockOpen ? copy.hideControls : copy.showControls}</span>
              {dockOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            {dockOpen && (
              <div className="w-full rounded-2xl bg-[#0c1425]/96 border border-white/12 p-3.5 sm:p-4 text-white shadow-2xl">
                {/* Dock Tabs + CTA Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                    {(['room', 'walls', 'floor', 'ceiling', 'params'] as ControlTab[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          activeTab === tab
                            ? 'bg-amber-500 text-slate-950 font-semibold'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {copy.tabs[tab]}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onSavePreset && (
                      <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs font-medium text-slate-200 hover:border-amber-500/60 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>{saveFeedback || (isLoggedIn ? copy.savePreset : copy.savePreset)}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onBookWith3D(fullConfig)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span>{copy.bookWith3d}</span>
                    </button>
                  </div>
                </div>

                {/* Active Control Row */}
                <div className="pt-3">
                  {activeTab === 'room' && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ROOM_OPTIONS.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setConfig((c) => ({ ...c, roomType: r.id }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                              config.roomType === r.id
                                ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {r.label[lang]}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(Object.keys(STYLE_PRESETS) as StylePresetId[]).map((presetId) => (
                          <button
                            key={presetId}
                            type="button"
                            onClick={() => applyPreset(presetId)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                              config.stylePreset === presetId
                                ? 'border-amber-400 bg-white/15 text-white'
                                : 'border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {STYLE_PRESETS[presetId].label[lang]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'walls' && (
                    <div className="flex flex-wrap items-center gap-2">
                      {WALL_OPTIONS.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() =>
                            setConfig((c) => ({ ...c, wallFinish: w.id, renovationStage: 'after' }))
                          }
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                            config.wallFinish === w.id
                              ? 'border-amber-500 bg-amber-500/15 text-amber-200'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-sm border border-white/30 shrink-0"
                            style={{ backgroundColor: w.swatch }}
                          />
                          <span>{w.label[lang]}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTab === 'floor' && (
                    <div className="flex flex-wrap items-center gap-2">
                      {FLOOR_OPTIONS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() =>
                            setConfig((c) => ({ ...c, floorFinish: f.id, renovationStage: 'after' }))
                          }
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                            config.floorFinish === f.id
                              ? 'border-amber-500 bg-amber-500/15 text-amber-200'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-sm border border-white/30 shrink-0"
                            style={{ backgroundColor: f.swatch }}
                          />
                          <span>{f.label[lang]}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTab === 'ceiling' && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {CEILING_OPTIONS.map((cl) => (
                          <button
                            key={cl.id}
                            type="button"
                            onClick={() =>
                              setConfig((c) => ({ ...c, ceilingType: cl.id, renovationStage: 'after' }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                              config.ceilingType === cl.id
                                ? 'border-amber-500 bg-amber-500/15 text-amber-200'
                                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {cl.label[lang]}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ACCENT_OPTIONS.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() =>
                              setConfig((c) => ({ ...c, accentTone: a.id, renovationStage: 'after' }))
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              config.accentTone === a.id
                                ? 'border-amber-400 bg-white/15 text-white'
                                : 'border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-sm border border-white/30"
                              style={{ backgroundColor: a.swatch }}
                            />
                            <span>{a.label[lang]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'params' && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 flex items-center gap-3">
                        <span className="text-xs text-slate-300 whitespace-nowrap">
                          Площадь: <strong className="text-amber-400 tabular-nums">{config.areaSqm} м²</strong>
                        </span>
                        <input
                          type="range"
                          min={20}
                          max={240}
                          step={2}
                          value={config.areaSqm}
                          onChange={(e) => setConfig((c) => ({ ...c, areaSqm: Number(e.target.value) }))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(['standard', 'comfort', 'premium'] as MaterialTier[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setConfig((c) => ({ ...c, tier: t }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                              config.tier === t
                                ? 'border-amber-500 bg-amber-500/15 text-amber-200'
                                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {TIER_LABELS[t][lang]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
