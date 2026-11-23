import type { FinishChoices, WorkStageId } from '../types.ts';
import { FINISH_GROUPS, findFinish, type FinishGroup } from '../data/finishCatalog.ts';

// Front view of one apartment room that "builds up" stage by stage:
// bare concrete → wiring → plaster → screed → tiles → paint → ceiling → floor → doors → fixtures → clean.
// Colours come from the client's finish choices (paint, tile, laminate, doors…).
interface StageVisualProps {
  doneStages: Set<WorkStageId>;
  wallpaper: boolean; // wallpaper instead of paint
  finishes: FinishChoices;
  groups?: FinishGroup[];
}

export function StageVisual({ doneStages, wallpaper, finishes, groups = FINISH_GROUPS }: StageVisualProps) {
  const has = (s: WorkStageId) => doneStages.has(s);
  const plastered = has('walls_rough');
  const finished = has('walls_finish');

  const paint = findFinish('wall_paint', finishes.wall_paint, groups);
  const paper = findFinish('wallpaper', finishes.wallpaper, groups);
  const tile = findFinish('bath_tile', finishes.bath_tile, groups);
  const lam = findFinish('laminate', finishes.laminate, groups);
  const ceil = findFinish('ceiling', finishes.ceiling, groups);
  const door = findFinish('doors', finishes.doors, groups);
  const plinthOpt = findFinish('plinth', finishes.plinth, groups);
  const socket = findFinish('sockets', finishes.sockets, groups);

  const wallColor = wallpaper ? paper.color : paint.color;
  const plinthColor =
    plinthOpt.id === 'match_floor' ? lam.accent || lam.color : plinthOpt.id === 'match_wall' ? wallColor : plinthOpt.color;

  const wallFill = finished ? (wallpaper ? 'url(#rh-wallpaper)' : paint.color) : plastered ? '#c9c6c0' : 'url(#rh-concrete)';
  const floorFill = has('floor_finish') ? 'url(#rh-laminate)' : has('floor_rough') ? '#a9a49b' : 'url(#rh-concrete-dark)';
  const ceilingFill = has('ceiling') ? ceil.color : plastered ? '#c4c1bb' : 'url(#rh-concrete)';

  return (
    <svg viewBox="0 0 400 260" className="w-full h-auto rounded-2xl" role="img" aria-label="Визуализация этапов ремонта">
      <defs>
        <pattern id="rh-concrete" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill="#8d8a84" />
          <circle cx="4" cy="5" r="1" fill="#7b7872" />
          <circle cx="13" cy="12" r="1.3" fill="#9a968f" />
          <circle cx="9" cy="15" r="0.8" fill="#76736d" />
        </pattern>
        <pattern id="rh-concrete-dark" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#6f6c66" />
          <circle cx="5" cy="4" r="1" fill="#5f5c57" />
          <circle cx="12" cy="11" r="1.2" fill="#7c7973" />
        </pattern>
        <pattern id="rh-tiles" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill={tile.color} />
          <path d="M2 12 Q8 6 14 9" stroke={tile.accent || tile.color} strokeWidth="0.8" fill="none" opacity="0.6" />
          <path d="M16 0H0V16" fill="none" stroke={tile.accent || '#b9c0c4'} strokeWidth="1" />
        </pattern>
        <pattern id="rh-wallpaper" width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill={paper.color} />
          <path d="M11 3 L14 11 L11 19 L8 11 Z" fill={paper.accent || '#00000012'} opacity="0.7" />
        </pattern>
        <pattern id="rh-laminate" width="60" height="12" patternUnits="userSpaceOnUse">
          <rect width="60" height="12" fill={lam.color} />
          <rect x="0" y="6" width="60" height="6" fill={lam.accent || lam.color} />
          <path d="M0 6H60M22 0V6M48 6V12" stroke="#00000030" strokeWidth="0.8" />
        </pattern>
        <linearGradient id="rh-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9ec9ec" />
          <stop offset="1" stopColor="#dcecf7" />
        </linearGradient>
      </defs>

      {/* Ceiling */}
      <polygon points="0,0 400,0 340,34 60,34" fill={ceilingFill} />
      {has('ceiling') && ceil.accent && <polygon points="80,4 320,4 300,24 100,24" fill={ceil.accent} opacity="0.55" />}
      {/* Left and right side walls */}
      <polygon points="0,0 60,34 60,200 0,260" fill={wallFill} opacity="0.85" />
      <polygon points="400,0 340,34 340,200 400,260" fill={wallFill} opacity="0.85" />
      {/* Back wall */}
      <rect x="60" y="34" width="280" height="166" fill={wallFill} />
      {/* Floor */}
      <polygon points="0,260 60,200 340,200 400,260" fill={floorFill} />

      {/* Window */}
      <rect x="92" y="62" width="78" height="86" fill="url(#rh-window)" stroke={plastered ? '#ffffff' : '#6d6a64'} strokeWidth={plastered ? 5 : 3} />
      <path d="M131 62V148" stroke="#ffffff" strokeWidth="3" />

      {/* Tiled bathroom-style panel on the right side wall */}
      {has('tiling') && <polygon points="400,40 352,62 352,200 400,248" fill="url(#rh-tiles)" />}

      {/* Rough wiring and pipes before plaster */}
      {has('engineering_rough') && !plastered && (
        <g stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M200 40V120H240V175" />
          <path d="M200 120H300V170" />
          <path d="M200 40H320" />
          <g stroke="#38bdf8" strokeWidth="4">
            <path d="M372 70V220" />
            <path d="M386 64V232" />
          </g>
        </g>
      )}

      {/* Door */}
      <rect
        x="262"
        y="88"
        width="54"
        height="112"
        fill={has('doors') ? door.color : 'none'}
        stroke={plastered ? '#efece6' : '#5f5c57'}
        strokeWidth="4"
      />
      {has('doors') && door.accent && <rect x="270" y="98" width="38" height="42" fill="none" stroke={door.accent} strokeWidth="1.5" />}
      {has('doors') && <circle cx="306" cy="146" r="3" fill="#e2c27a" />}

      {/* Skirting */}
      {has('floor_finish') && <rect x="60" y="195" width="280" height="5" fill={plinthColor} />}

      {/* Ceiling lights */}
      {has('ceiling') && !has('engineering_finish') && (
        <g fill="#d6d2c8">
          <circle cx="140" cy="18" r="3" />
          <circle cx="200" cy="18" r="3" />
          <circle cx="260" cy="18" r="3" />
        </g>
      )}

      {/* Finish electrics: sockets, switch, glowing lights */}
      {has('engineering_finish') && (
        <g>
          <rect x="226" y="168" width="10" height="12" rx="2" fill={socket.color} stroke="#9b968d" />
          <rect x="246" y="168" width="10" height="12" rx="2" fill={socket.color} stroke="#9b968d" />
          <rect x="244" y="120" width="9" height="13" rx="2" fill={socket.color} stroke="#9b968d" />
          {[140, 200, 260].map((x) => (
            <g key={x}>
              <circle cx={x} cy="18" r="9" fill="#fde68a" opacity="0.45" />
              <circle cx={x} cy="18" r="3.5" fill="#fff7d6" />
            </g>
          ))}
        </g>
      )}

      {/* Furnished and clean */}
      {has('cleaning') && (
        <g>
          <rect x="110" y="166" width="110" height="26" rx="6" fill="#334155" />
          <rect x="104" y="156" width="16" height="36" rx="5" fill="#3f4d63" />
          <rect x="210" y="156" width="16" height="36" rx="5" fill="#3f4d63" />
          <rect x="122" y="156" width="40" height="14" rx="5" fill="#475569" />
          <rect x="166" y="156" width="40" height="14" rx="5" fill="#475569" />
          <rect x="190" y="130" width="10" height="16" rx="2" fill="#a16207" />
          <circle cx="195" cy="124" r="10" fill="#4d7c0f" />
          <g fill="#fbbf24">
            <path d="M44 214l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
            <path d="M360 214l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
          </g>
        </g>
      )}
    </svg>
  );
}
