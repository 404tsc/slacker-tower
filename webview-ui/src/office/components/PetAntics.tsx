// Fork: the emoji side of pet scenes (petAntics.ts) — 💢 glares, ⭐💥 popping
// out of the scuffle cloud, 💫 / 😤 afterwards, 💕 for friends.
import { useEffect, useState } from 'react';

import { OVERLAY_BUBBLE_Z_INDEX } from '../../constants.js';
import { isBuildingOverview } from '../engine/building.js';
import type { OfficeState } from '../engine/officeState.js';
import { getAntics } from '../engine/petAntics.js';
import { overlayProjection } from '../projection.js';
import type { Pet } from '../types.js';

interface PetAnticsProps {
  officeState: OfficeState;
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  panRef: React.RefObject<{ x: number; y: number }>;
}

/** World px above a pet's feet where its emote floats. */
const HEAD = 22;

export function PetAntics({ officeState, containerRef, zoom, panRef }: PetAnticsProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let rafId = 0;
    const loop = () => {
      setTick((n) => n + 1);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const el = containerRef.current;
  const scenes = getAntics();
  const nappers = officeState.pets.filter((p) => p.perch);
  if (!el || (scenes.length === 0 && nappers.length === 0) || isBuildingOverview()) return null;
  const dpr = window.devicePixelRatio || 1;
  const project = overlayProjection(
    officeState.getLayout(),
    el.getBoundingClientRect(),
    zoom,
    panRef.current,
    dpr,
  );
  const size = Math.max(18, 7 * (zoom / dpr) * 1.7);

  const marks: Array<{ key: string; x: number; y: number; emoji: string; scale?: number }> = [];
  const above = (p: Pet, emoji: string, key: string, lift = 0) =>
    marks.push({ key, x: p.x, y: p.y - HEAD - lift, emoji });

  // a cat napping on a bed: a slow 💤
  nappers.forEach((p, i) => {
    const drift = (tick / 156 + i * 0.37) % 1; // ~2.6 s per puff at 60 fps
    marks.push({
      key: `nap${p.id}`,
      x: p.x + 6 + drift * 4,
      y: p.y - HEAD + 4 - drift * 10,
      emoji: '💤',
      scale: 0.7 + drift * 0.2,
    });
  });

  scenes.forEach((s, i) => {
    const bob = Math.sin(s.t * 8) * 1.5;
    if (s.phase === 'glare') {
      above(s.a, '💢', `${i}a`, bob);
      above(s.b, '💢', `${i}b`, -bob);
    } else if (s.phase === 'brawl') {
      // stars and bangs popping around the cloud
      const step = Math.floor(s.t * 5);
      for (let k = 0; k < 2; k++) {
        const a = s.seed + (step + k * 3) * 2.1;
        marks.push({
          key: `${i}s${k}`,
          x: s.x + Math.cos(a) * 20,
          y: s.y - 16 + Math.sin(a) * 12,
          emoji: ['⭐', '💥', '💢', '✨'][(step + k) % 4],
          scale: 0.8,
        });
      }
    } else if (s.phase === 'after' && s.winner && s.loser) {
      above(s.loser, '💫', `${i}l`, bob);
      above(s.winner, '😤', `${i}w`);
    } else if (s.phase === 'cuddle') {
      // hearts rising from between them
      for (let k = 0; k < 2; k++) {
        const p = (s.t * 0.6 + k / 2) % 1;
        marks.push({
          key: `${i}h${k}`,
          x: s.x + Math.sin(p * 6 + k) * 4,
          y: s.y - 14 - p * 18,
          emoji: k ? '💕' : '❤️',
          scale: 0.8 + p * 0.3,
        });
      }
    }
  });

  return (
    <>
      {marks.map((m) => (
        <div
          key={m.key}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: project.toScreenX(m.x),
            top: project.toScreenY(m.y),
            fontSize: size * (m.scale ?? 1),
            lineHeight: 1,
            zIndex: OVERLAY_BUBBLE_Z_INDEX,
          }}
          data-testid="pet-antic"
        >
          {m.emoji}
        </div>
      ))}
    </>
  );
}
