// ─────────────────────────────────────────────────────────────────────────────
// Roles: every user-defined Directory is a role (品牌合作经理, 文案, ...). A role's
// character always looks the same, sits at the same desk and wears a name tag.
// ─────────────────────────────────────────────────────────────────────────────

export interface RoleLook {
  palette: number;
  hueShift: number;
}

/** Hand-picked looks for the starting team; any other role gets a stable look
 *  derived from its name. Keys are the Directory names. */
const ROLE_PRESETS: Record<string, RoleLook> = {
  '🤝 品牌合作经理': { palette: 0, hueShift: 0 },
  '✍️ 文案': { palette: 1, hueShift: 0 },
  '🎨 设计': { palette: 2, hueShift: 0 },
  '📊 数据分析': { palette: 3, hueShift: 0 },
  '💻 程序员': { palette: 4, hueShift: 0 },
  '💬 闲聊': { palette: 5, hueShift: 0 },
};

function hashName(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function isRole(name: string | undefined, roleNames: ReadonlySet<string>): boolean {
  return !!name && (name in ROLE_PRESETS || roleNames.has(name));
}

export function roleLook(name: string, paletteCount: number): RoleLook {
  const preset = ROLE_PRESETS[name];
  if (preset && preset.palette < paletteCount) return preset;
  const h = hashName(name);
  const count = Math.max(1, paletteCount);
  // Later roles always get a hue shift, so they never look exactly like one
  // of the starting team.
  return { palette: h % count, hueShift: 45 + ((h >>> 8) % 270) };
}

// ── Each role's own desk, remembered in this browser ─────────────────────────

const SEATS_KEY = 'pixel-agents.roleSeats';

// The engine compiles without DOM types; reach browser storage loosely.
interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
function storage(): KeyValueStore | undefined {
  return (globalThis as { localStorage?: KeyValueStore }).localStorage;
}

function readSeats(): Record<string, string> {
  try {
    const raw = storage()?.getItem(SEATS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function rememberedRoleSeat(name: string): string | undefined {
  return readSeats()[name];
}

export function rememberRoleSeat(name: string, seatId: string): void {
  try {
    const seats = readSeats();
    if (seats[name] === seatId) return;
    // A desk belongs to one role: drop any other role holding it
    for (const key of Object.keys(seats)) if (seats[key] === seatId) delete seats[key];
    seats[name] = seatId;
    storage()?.setItem(SEATS_KEY, JSON.stringify(seats));
  } catch {
    // storage unavailable: the role simply picks a free desk next time
  }
}

/** Seats reserved for roles, so non-role agents prefer other desks. */
export function reservedRoleSeats(): Set<string> {
  return new Set(Object.values(readSeats()));
}
