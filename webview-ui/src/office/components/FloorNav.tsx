import { useCallback, useEffect, useRef, useState } from 'react';

import { LanguageSwitch } from '../../components/LanguageSwitch.js';
import { Button } from '../../components/ui/Button.js';
import { OVERLAY_LABEL_Z_INDEX, ZOOM_MAX, ZOOM_MIN } from '../../constants.js';
import { t, tName, useLang } from '../../i18n.js';
import type { Floor } from '../engine/building.js';
import { floorOfRow, getFloors, setBuildingOverview } from '../engine/building.js';
import type { FacadeImages } from '../engine/facade.js';
import {
  buildFacade,
  buildingBounds,
  drawFacade,
  FACADE_PAD_TOP,
  FACADE_PAD_X,
  FACADE_STREET,
} from '../engine/facade.js';
import type { OfficeState } from '../engine/officeState.js';
import { mapOffset, overlayProjection } from '../projection.js';
import { TILE_SIZE } from '../types.js';

/** Emoji per floor name (building.ts FLOOR_NAMES). */
const FLOOR_EMOJI: Record<string, string> = {
  卧室: '🛏️',
  办公室: '💼',
  '健身·泳池': '🏋️',
};

/** CSS px kept free on the left for this panel when fitting the view. */
const NAV_WIDTH_PX = 200;
const COUNT_REFRESH_MS = 500;

interface FloorNavProps {
  officeState: OfficeState;
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
}

/**
 * Left-hand building directory: "全楼" shows the whole building, a floor
 * button zooms onto that floor and shades the others.
 */
export function FloorNav({ officeState, containerRef, zoom, onZoomChange, panRef }: FloorNavProps) {
  useLang();
  const [selected, setSelected] = useState<number | null>(null);
  const [counts, setCounts] = useState<number[]>([]);
  // Re-render every frame while a floor is selected so the shade follows pans
  const [, setTick] = useState(0);
  const didInit = useRef(false);

  const floors = getFloors();

  const goTo = useCallback(
    (floor: Floor | null) => {
      const el = containerRef.current;
      const fl = getFloors();
      if (!el || fl.length === 0) return;
      const layout = officeState.getLayout();
      const dpr = window.devicePixelRatio || 1;
      const rect = el.getBoundingClientRect();
      const freeW = Math.max(200, rect.width - NAV_WIDTH_PX) * dpr;
      const freeH = rect.height * dpr;

      // Area to show, in world px: one floor, or the whole building with its
      // roof, trees and street
      let x0: number, x1: number, y0: number, y1: number;
      if (floor) {
        x0 = floor.colStart * TILE_SIZE;
        x1 = (floor.colEnd + 1) * TILE_SIZE;
        y0 = floor.rowStart * TILE_SIZE;
        y1 = (floor.rowEnd + 1) * TILE_SIZE;
      } else {
        const b = buildingBounds(fl);
        if (!b) return;
        // the house with its garden on both sides and the roof on top
        x0 = b.x0 - FACADE_PAD_X;
        x1 = b.x1 + FACADE_PAD_X;
        y0 = b.y0 - FACADE_PAD_TOP + 10;
        y1 = b.y1 + FACADE_STREET;
      }
      const z = Math.max(
        ZOOM_MIN,
        Math.min(ZOOM_MAX, Math.floor(Math.min(freeW / (x1 - x0), freeH / (y1 - y0)) * 10) / 10),
      );
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const mapW = layout.cols * TILE_SIZE * z;
      const mapH = layout.rows * TILE_SIZE * z;
      officeState.cameraFollowId = null;
      // Center the area in the space right of this panel
      panRef.current = {
        x: mapW / 2 - cx * z + (NAV_WIDTH_PX * dpr) / 2,
        y: mapH / 2 - cy * z,
      };
      onZoomChange(z);
      setSelected(floor ? floor.index : null);
    },
    [containerRef, officeState, onZoomChange, panRef],
  );

  // Open on the whole building
  useEffect(() => {
    if (didInit.current || getFloors().length < 2) return;
    didInit.current = true;
    const id = requestAnimationFrame(() => goTo(null));
    return () => cancelAnimationFrame(id);
  }, [goTo]);

  // Who is on which floor
  useEffect(() => {
    const update = () => {
      const n = getFloors().map(() => 0);
      for (const ch of officeState.characters.values()) {
        const f = floorOfRow(ch.tileRow);
        if (f >= 0) n[f]++;
      }
      setCounts(n);
    };
    update();
    const id = setInterval(update, COUNT_REFRESH_MS);
    return () => clearInterval(id);
  }, [officeState]);

  // Overlays follow the camera frame by frame; in the whole-building view the
  // facade (sky, roof, brick shell, street) is drawn around the floors.
  const facadeRef = useRef<HTMLCanvasElement>(null);
  const facadeCache = useRef<{ layout: object; img: FacadeImages | null } | null>(null);
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      setTick((n) => n + 1);
      const canvas = facadeRef.current;
      const el = containerRef.current;
      if (selected === null && canvas && el) {
        const layout = officeState.getLayout();
        if (facadeCache.current?.layout !== layout) {
          facadeCache.current = { layout, img: buildFacade(layout, getFloors()) };
        }
        const img = facadeCache.current.img;
        const ctx = canvas.getContext('2d');
        if (img && ctx) {
          const dpr = window.devicePixelRatio || 1;
          const rect = el.getBoundingClientRect();
          const w = Math.round(rect.width * dpr);
          const h = Math.round(rect.height * dpr);
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          const { offsetX, offsetY } = mapOffset(
            w,
            h,
            layout.cols,
            layout.rows,
            zoom,
            panRef.current.x,
            panRef.current.y,
          );
          drawFacade(
            ctx,
            img,
            getFloors(),
            zoom,
            offsetX,
            offsetY,
            performance.now() / 1000,
            new Date().getHours(),
          );
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [selected, zoom, containerRef, officeState, panRef]);

  // Door signs belong inside a floor, not on the villa's cut-away front
  const overview = selected === null && floors.length >= 2;
  useEffect(() => {
    setBuildingOverview(overview);
    return () => setBuildingOverview(false);
  }, [overview]);

  if (floors.length < 2) return null;

  const el = containerRef.current;
  const dpr = window.devicePixelRatio || 1;
  const project = el
    ? overlayProjection(
        officeState.getLayout(),
        el.getBoundingClientRect(),
        zoom,
        panRef.current,
        dpr,
      )
    : null;
  const sel = selected !== null ? floors[selected] : undefined;

  const btn = (active: boolean) =>
    `w-full text-left border-border! shadow-pixel ${active ? 'bg-active-bg! border-accent!' : ''}`;

  return (
    <>
      {/* Shade the other floors */}
      {sel &&
        project &&
        (() => {
          const x0 = project.toScreenX(sel.colStart * TILE_SIZE);
          const x1 = project.toScreenX((sel.colEnd + 1) * TILE_SIZE);
          const y0 = project.toScreenY(sel.rowStart * TILE_SIZE);
          const y1 = project.toScreenY((sel.rowEnd + 1) * TILE_SIZE);
          // Four panels around the floor: above, below, left, right
          const rects = [
            { left: 0, top: 0, right: 0, height: Math.max(0, y0) },
            { left: 0, top: y1, right: 0, bottom: 0 },
            { left: 0, top: y0, width: Math.max(0, x0), height: y1 - y0 },
            { left: x1, top: y0, right: 0, height: y1 - y0 },
          ];
          return rects.map((r, i) => (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={{ ...r, background: 'var(--floor-dim)', zIndex: 1 }}
            />
          ));
        })()}

      {/* Whole building, front: the cut-away facade around the floors */}
      {selected === null && (
        <canvas
          ref={facadeRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 1 }}
        />
      )}
      {selected === null &&
        project &&
        (() => {
          const b = buildingBounds(floors);
          if (!b) return null;
          const cssPerWorld = zoom / dpr;
          const font = Math.max(16, 11 * cssPerWorld);
          return (
            <>
              <div
                className="absolute -translate-x-1/2 -translate-y-full pointer-events-none whitespace-nowrap pixel-panel border-border"
                style={{
                  left: project.toScreenX((b.x0 + b.x1) / 2),
                  // a name board on the attic, under the round window
                  top: project.toScreenY(b.y0 - 10),
                  fontSize: Math.max(14, 12 * cssPerWorld),
                  lineHeight: 1,
                  padding: `${Math.max(2, 2 * cssPerWorld)}px ${Math.max(6, 6 * cssPerWorld)}px`,
                  zIndex: 2,
                }}
              >
                {t('buildingName')}
              </div>
              {floors.map((f) => (
                <button
                  key={f.index}
                  type="button"
                  className="absolute -translate-x-full -translate-y-1/2 whitespace-nowrap pixel-panel border-border cursor-pointer hover:bg-btn-hover"
                  style={{
                    left: project.toScreenX(b.x0) - 6,
                    top: project.toScreenY(((f.rowStart + f.rowEnd + 1) / 2) * TILE_SIZE),
                    fontSize: font,
                    lineHeight: 1,
                    padding: `${Math.max(2, 2 * cssPerWorld)}px ${Math.max(4, 4 * cssPerWorld)}px`,
                    zIndex: 2,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => goTo(f)}
                  title={t('enterFloor', { floor: `${f.tag} ${tName(f.name)}` })}
                >
                  {f.tag}
                </button>
              ))}
            </>
          );
        })()}

      <div
        className="absolute left-8 z-10 flex flex-col gap-4 pixel-panel border-border p-4"
        style={{
          top: 108,
          width: NAV_WIDTH_PX - 16,
          fontSize: 20,
          zIndex: OVERLAY_LABEL_Z_INDEX + 1,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        data-testid="floor-nav"
      >
        <Button
          size="md"
          className={btn(selected === null)}
          onClick={() => goTo(null)}
          title={t('wholeBuildingTitle')}
        >
          {t('wholeBuilding')}
        </Button>
        {[...floors].reverse().map((f) => (
          <Button
            key={f.index}
            size="md"
            className={btn(selected === f.index)}
            onClick={() => goTo(f)}
            title={t('enterFloor', { floor: `${f.tag} ${tName(f.name)}` })}
          >
            <span className="flex items-center justify-between gap-4">
              <span>
                {f.tag} {FLOOR_EMOJI[f.name] ?? ''} {tName(f.name)}
              </span>
              {(counts[f.index] ?? 0) > 0 && (
                <span className="text-text-muted">{t('people', { n: counts[f.index] })}</span>
              )}
            </span>
          </Button>
        ))}
        <LanguageSwitch />
      </div>
    </>
  );
}
