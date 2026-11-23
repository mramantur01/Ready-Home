import * as THREE from 'three';
import type { FloorFinishId, WallFinishId } from '../types.ts';

function makeCanvas(size = 512): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAnisotropy || 4);
  tex.needsUpdate = true;
  return tex;
}

export function createFloorTexture(
  finish: FloorFinishId | 'raw_screed',
  maxAnisotropy: number,
): { map: THREE.CanvasTexture; roughness: number; metalness: number } {
  const [canvas, ctx] = makeCanvas(512);

  if (finish === 'raw_screed') {
    ctx.fillStyle = '#8b8f94';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4200; i++) {
      const x = (i * 97) % 512;
      const y = (i * 193) % 512;
      const shade = 118 + ((i * 31) % 38);
      ctx.fillStyle = `rgba(${shade},${shade},${shade + 2},0.35)`;
      ctx.fillRect(x, y, 4 + (i % 7), 3 + (i % 5));
    }
    ctx.strokeStyle = 'rgba(65,68,74,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.stroke();
    return { map: finalizeTexture(canvas, 3, 3, maxAnisotropy), roughness: 0.94, metalness: 0.02 };
  }

  if (finish === 'oak_herringbone') {
    ctx.fillStyle = '#b48758';
    ctx.fillRect(0, 0, 512, 512);
    const pw = 128;
    const ph = 32;
    const tones = ['#bc9060', '#b28454', '#c59b6d', '#a6794a', '#be9364'];
    for (let row = -2; row < 20; row++) {
      for (let col = -1; col < 6; col++) {
        ctx.save();
        const x = col * pw;
        const y = row * ph;
        ctx.translate(x, y);
        const dir = (col + row) % 2 === 0 ? 1 : -1;
        ctx.fillStyle = tones[Math.abs(row * 3 + col * 7) % tones.length];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(pw, dir * 24);
        ctx.lineTo(pw, dir * 24 + ph);
        ctx.lineTo(0, ph);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(72,46,24,0.32)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // subtle grain lines
        ctx.strokeStyle = 'rgba(255,240,215,0.08)';
        for (let g = 5; g < ph; g += 8) {
          ctx.beginPath();
          ctx.moveTo(4, g);
          ctx.lineTo(pw - 4, g + dir * 20);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    return { map: finalizeTexture(canvas, 3.5, 3.5, maxAnisotropy), roughness: 0.42, metalness: 0.04 };
  }

  if (finish === 'walnut_plank') {
    ctx.fillStyle = '#654632';
    ctx.fillRect(0, 0, 512, 512);
    const plankH = 64;
    const tones = ['#6c4b36', '#5e402d', '#75533c', '#583b28', '#684733'];
    for (let r = 0; r < 8; r++) {
      const y = r * plankH;
      const offset = (r % 2) * 180;
      for (let c = -1; c < 3; c++) {
        const x = c * 320 + offset;
        ctx.fillStyle = tones[(r * 5 + c + 10) % tones.length];
        ctx.fillRect(x, y, 320, plankH);
        ctx.strokeStyle = 'rgba(28,16,8,0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 320, plankH);
        ctx.strokeStyle = 'rgba(220,180,140,0.08)';
        for (let g = 8; g < plankH; g += 10) {
          ctx.beginPath();
          ctx.moveTo(x + 2, y + g);
          ctx.lineTo(x + 318, y + g + ((r + g) % 3) - 1);
          ctx.stroke();
        }
      }
    }
    return { map: finalizeTexture(canvas, 3, 3, maxAnisotropy), roughness: 0.36, metalness: 0.05 };
  }

  if (finish === 'travertine_tile') {
    ctx.fillStyle = '#dfd4c3';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 140; i++) {
      const y = (i * 19) % 512;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(180,164,142,0.22)' : 'rgba(248,243,234,0.25)';
      ctx.fillRect(0, y, 512, 3 + (i % 7));
    }
    ctx.strokeStyle = 'rgba(135,122,106,0.48)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, 253, 253);
    ctx.strokeRect(257.5, 1.5, 253, 253);
    ctx.strokeRect(1.5, 257.5, 253, 253);
    ctx.strokeRect(257.5, 257.5, 253, 253);
    return { map: finalizeTexture(canvas, 3.2, 3.2, maxAnisotropy), roughness: 0.28, metalness: 0.06 };
  }

  if (finish === 'slate_porcelain') {
    ctx.fillStyle = '#4a505a';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(210,220,235,0.08)' : 'rgba(24,28,34,0.18)';
      ctx.lineWidth = 1.5 + (i % 4);
      ctx.beginPath();
      ctx.moveTo((i * 43) % 512, 0);
      ctx.bezierCurveTo((i * 89) % 512, 170, (i * 131) % 512, 340, (i * 61) % 512, 512);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(22,26,32,0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, 253, 253);
    ctx.strokeRect(257.5, 1.5, 253, 253);
    ctx.strokeRect(1.5, 257.5, 253, 253);
    ctx.strokeRect(257.5, 257.5, 253, 253);
    return { map: finalizeTexture(canvas, 3, 3, maxAnisotropy), roughness: 0.3, metalness: 0.08 };
  }

  // microcement
  ctx.fillStyle = '#c5c1ba';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 600; i++) {
    const x = (i * 137) % 512;
    const y = (i * 229) % 512;
    const r = 12 + (i % 28);
    const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, i % 2 === 0 ? 'rgba(235,232,226,0.12)' : 'rgba(130,126,120,0.1)');
    grad.addColorStop(1, 'rgba(197,193,186,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return { map: finalizeTexture(canvas, 2.5, 2.5, maxAnisotropy), roughness: 0.45, metalness: 0.05 };
}

export function createWallTexture(
  finish: WallFinishId | 'raw_concrete',
  maxAnisotropy: number,
): { map: THREE.CanvasTexture; roughness: number; metalness: number } {
  const [canvas, ctx] = makeCanvas(512);

  if (finish === 'raw_concrete') {
    ctx.fillStyle = '#8b9096';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2400; i++) {
      const x = (i * 73) % 512;
      const y = (i * 151) % 512;
      const v = 115 + ((i * 19) % 45);
      ctx.fillStyle = `rgba(${v},${v + 2},${v + 5},0.32)`;
      ctx.fillRect(x, y, 6 + (i % 10), 4 + (i % 6));
    }
    // Formwork panel seams & tie holes
    ctx.strokeStyle = 'rgba(55,60,68,0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 252, 508);
    ctx.strokeRect(258, 2, 252, 508);
    ctx.fillStyle = 'rgba(48,52,58,0.55)';
    for (const cx of [64, 192, 320, 448]) {
      for (const cy of [128, 384]) {
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return { map: finalizeTexture(canvas, 2.5, 1.4, maxAnisotropy), roughness: 0.92, metalness: 0.02 };
  }

  if (finish === 'wood_slats') {
    ctx.fillStyle = '#241e1a';
    ctx.fillRect(0, 0, 512, 512);
    const step = 32;
    for (let x = 0; x < 512; x += step) {
      const grad = ctx.createLinearGradient(x, 0, x + 22, 0);
      grad.addColorStop(0, '#9c6e44');
      grad.addColorStop(0.5, '#be8e5e');
      grad.addColorStop(1, '#7e5430');
      ctx.fillStyle = grad;
      ctx.fillRect(x + 2, 0, 22, 512);
    }
    return { map: finalizeTexture(canvas, 3, 1, maxAnisotropy), roughness: 0.52, metalness: 0.05 };
  }

  if (finish === 'travertine_slab') {
    ctx.fillStyle = '#e4dacb';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 120; i++) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(170,152,128,0.22)' : 'rgba(255,250,242,0.3)';
      ctx.lineWidth = 2 + (i % 5);
      ctx.beginPath();
      const y = (i * 23) % 512;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(170, y + 10, 340, y - 10, 512, y + 4);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(135,120,104,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 254, 510);
    ctx.strokeRect(257, 1, 254, 510);
    return { map: finalizeTexture(canvas, 2.4, 1.2, maxAnisotropy), roughness: 0.34, metalness: 0.06 };
  }

  const baseColors: Record<Exclude<WallFinishId, 'wood_slats' | 'travertine_slab'>, [string, string]> = {
    warm_ivory: ['#f0ebe2', 'rgba(218,210,198,0.16)'],
    sand_plaster: ['#dfd1bc', 'rgba(174,154,126,0.22)'],
    graphite_silk: ['#3a414d', 'rgba(255,255,255,0.06)'],
    sage_matte: ['#b9c4b8', 'rgba(92,108,94,0.14)'],
    navy_velvet: ['#1f2d47', 'rgba(180,200,235,0.07)'],
  };
  const [base, cloud] = baseColors[finish];
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 380; i++) {
    const x = (i * 149) % 512;
    const y = (i * 211) % 512;
    const r = 18 + (i % 34);
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return {
    map: finalizeTexture(canvas, 2, 1, maxAnisotropy),
    roughness: finish === 'sand_plaster' ? 0.68 : 0.78,
    metalness: 0.03,
  };
}

export function createArtworkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512);
  const bg = ctx.createLinearGradient(0, 0, 512, 512);
  bg.addColorStop(0, '#18243d');
  bg.addColorStop(0.55, '#2a354d');
  bg.addColorStop(1, '#101828');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  // Abstract warm architectural gold/travertine strokes
  ctx.fillStyle = 'rgba(232,216,192,0.85)';
  ctx.beginPath();
  ctx.arc(190, 260, 125, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(245,158,11,0.78)';
  ctx.fillRect(210, 140, 190, 240);

  ctx.strokeStyle = 'rgba(255,244,214,0.65)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(70, 380);
  ctx.bezierCurveTo(180, 220, 310, 340, 445, 120);
  ctx.stroke();

  return finalizeTexture(canvas, 1, 1, maxAnisotropy);
}

export function createSkyBackdropTexture(mode: 'day' | 'evening'): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512);
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  if (mode === 'day') {
    grad.addColorStop(0, '#6ba4d9');
    grad.addColorStop(0.52, '#c8dff2');
    grad.addColorStop(0.72, '#eef2f6');
    grad.addColorStop(1, '#b8c4d0');
  } else {
    grad.addColorStop(0, '#0f1c36');
    grad.addColorStop(0.45, '#273c63');
    grad.addColorStop(0.7, '#d97736');
    grad.addColorStop(0.84, '#f59e0b');
    grad.addColorStop(1, '#1a2438');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Distant Ala-Too Bishkek mountain silhouette
  ctx.fillStyle = mode === 'day' ? 'rgba(130,152,178,0.55)' : 'rgba(20,30,52,0.75)';
  ctx.beginPath();
  ctx.moveTo(0, 370);
  ctx.lineTo(75, 290);
  ctx.lineTo(155, 335);
  ctx.lineTo(255, 255);
  ctx.lineTo(350, 320);
  ctx.lineTo(435, 275);
  ctx.lineTo(512, 345);
  ctx.lineTo(512, 512);
  ctx.lineTo(0, 512);
  ctx.closePath();
  ctx.fill();

  // Snow caps
  ctx.fillStyle = mode === 'day' ? 'rgba(255,255,255,0.65)' : 'rgba(255,214,165,0.28)';
  ctx.beginPath();
  ctx.moveTo(255, 255);
  ctx.lineTo(222, 286);
  ctx.lineTo(252, 279);
  ctx.lineTo(286, 289);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
