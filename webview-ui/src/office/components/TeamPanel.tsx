// ─────────────────────────────────────────────────────────────────────────────
// Fork: 团队面板 — one row per agent: name, the task you gave it, what it is
// doing right now, and whether it needs you (授权 / 回复 / 审阅).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';

import { CharacterMugShot } from '../../components/CharacterMugShot.js';
import {
  TEAM_PANEL_ATTENTION_BG,
  TEAM_PANEL_BREAK_COLOR,
  TEAM_PANEL_IDLE_COLOR,
  TEAM_PANEL_PERMISSION_COLOR,
  TERMINAL_SIDEBAR_WIDTH_PX,
} from '../../constants.js';
import type { MsgKey } from '../../i18n.js';
import { breakLabel, t, tName, tStatus, useLang } from '../../i18n.js';
import { BREAK_EMOJI } from '../engine/breaks.js';
import type { OfficeState } from '../engine/officeState.js';
import type { ToolActivity } from '../types.js';

type StatusKind = 'permission' | 'reply' | 'review' | 'working' | 'break' | 'idle';

interface StatusInfo {
  kind: StatusKind;
  label: string;
  color: string;
  /** Lower sorts first: whatever needs you floats to the top. */
  rank: number;
}

const STATUS: Record<StatusKind, { color: string; rank: number; key: MsgKey }> = {
  permission: { color: TEAM_PANEL_PERMISSION_COLOR, rank: 0, key: 'stPermission' },
  reply: { color: 'var(--color-status-permission)', rank: 1, key: 'stReply' },
  review: { color: 'var(--color-status-success)', rank: 2, key: 'stReview' },
  working: { color: 'var(--color-status-active)', rank: 3, key: 'stWorking' },
  break: { color: TEAM_PANEL_BREAK_COLOR, rank: 4, key: 'stBreak' },
  idle: { color: TEAM_PANEL_IDLE_COLOR, rank: 5, key: 'stIdle' },
};

const COLLAPSED_KEY = 'pixel-agents.teamPanelCollapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(v: boolean): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, v ? '1' : '0');
  } catch {
    // storage unavailable — the panel just won't remember
  }
}

interface TeamPanelProps {
  officeState: OfficeState;
  agents: number[];
  agentTools: Record<number, ToolActivity[]>;
  agentStatuses: Record<number, string>;
  agentAwaitingInput: Record<number, boolean>;
  agentSeenActivity: Record<number, boolean>;
  agentTasks: Record<number, string>;
  /** Number of helper sub-agents currently running under each agent. */
  helperCounts: Record<number, number>;
  onSelect: (agentId: number) => void;
}

export function TeamPanel({
  officeState,
  agents,
  agentTools,
  agentStatuses,
  agentAwaitingInput,
  agentSeenActivity,
  agentTasks,
  helperCounts,
  onSelect,
}: TeamPanelProps) {
  useLang();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  // Character state (bubbles, breaks) is imperative — poll it.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  const rows = agents
    .map((id) => {
      const ch = officeState.characters.get(id);
      if (!ch || ch.isSubagent) return null;
      const tools = agentTools[id] ?? [];
      const liveTool = [...tools].reverse().find((t) => !t.done);

      let kind: StatusKind;
      if (ch.bubbleType === 'permission' || tools.some((t) => t.permissionWait && !t.done)) {
        kind = 'permission';
      } else if (agentStatuses[id] === 'waiting') {
        kind = agentAwaitingInput[id] ? 'reply' : 'review';
      } else if (liveTool || (ch.isActive && agentSeenActivity[id])) {
        kind = 'working';
      } else if (ch.breakKind) {
        kind = 'break';
      } else {
        kind = 'idle';
      }
      const st = STATUS[kind];
      const status: StatusInfo = { kind, color: st.color, rank: st.rank, label: t(st.key) };
      if (kind === 'break' && ch.breakKind) {
        status.label = `${BREAK_EMOJI[ch.breakKind]} ${breakLabel(ch.breakKind)}`;
      }

      let doing: string | null = null;
      if (kind === 'permission') {
        doing = liveTool ? t('wantsTo', { what: tStatus(liveTool.status) }) : t('waitingClick');
      } else if (kind === 'working') {
        const s = liveTool?.status ?? tools[tools.length - 1]?.status;
        doing = s ? tStatus(s) : t('thinking');
      }

      const name = tName(ch.directoryName) || ch.agentName || t('assistantN', { id });
      return {
        id,
        name,
        palette: ch.palette,
        hueShift: ch.hueShift,
        status,
        task: agentTasks[id] || '',
        doing,
        helpers: helperCounts[id] ?? 0,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.status.rank - b.status.rank || a.id - b.id);

  if (rows.length === 0) return null;

  const needYou = rows.filter((r) => r.status.rank <= 2).length;

  return (
    <div
      className="absolute pixel-panel border-border flex flex-col"
      style={{
        top: 12,
        right: TERMINAL_SIDEBAR_WIDTH_PX + 8,
        width: 360,
        maxWidth: 'calc(100% - 120px)',
        maxHeight: 'calc(100% - 110px)',
        zIndex: 45,
      }}
      data-testid="team-panel"
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="flex items-center justify-between px-8 py-4 cursor-pointer hover:bg-btn-hover"
        style={{ fontSize: '24px', lineHeight: 1.1 }}
        onClick={() => {
          const next = !collapsed;
          setCollapsed(next);
          writeCollapsed(next);
        }}
        title={collapsed ? t('expandTeam') : t('collapseTeam')}
      >
        <span>
          {t('teamCount', { n: rows.length })}
          {needYou > 0 && (
            <span style={{ color: STATUS.permission.color }}>{t('needYou', { n: needYou })}</span>
          )}
        </span>
        <span>{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className="flex flex-col overflow-y-auto" style={{ gap: 2 }}>
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex gap-6 px-6 py-4 cursor-pointer hover:bg-btn-hover border-t-2 border-border"
              style={{
                borderLeft: `4px solid ${r.status.color}`,
                background: r.status.rank <= 1 ? TEAM_PANEL_ATTENTION_BG : undefined,
              }}
              onClick={() => onSelect(r.id)}
              title={r.task ? t('taskTitle', { task: r.task }) : r.name}
              data-testid="team-row"
              data-agent-id={r.id}
            >
              <div className="shrink-0" style={{ paddingTop: 2 }}>
                <CharacterMugShot palette={r.palette} hueShift={r.hueShift} size={36} />
              </div>
              <div className="flex flex-col min-w-0 flex-1" style={{ gap: 3 }}>
                <div className="flex items-center justify-between gap-4">
                  <span
                    className="overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ fontSize: '22px', lineHeight: 1.05 }}
                  >
                    {r.name}
                  </span>
                  <span
                    className="shrink-0 whitespace-nowrap px-4"
                    style={{
                      fontSize: '17px',
                      lineHeight: 1.2,
                      color: r.status.color,
                      border: `1px solid ${r.status.color}`,
                    }}
                  >
                    {r.status.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '19px',
                    lineHeight: 1.15,
                    opacity: r.task ? 0.9 : 0.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  📋 {r.task || t('noTask')}
                </span>
                {(r.doing || r.helpers > 0) && (
                  <span
                    className="overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ fontSize: '19px', lineHeight: 1.1, opacity: 0.75 }}
                  >
                    {r.doing ? `▶ ${r.doing}` : ''}
                    {r.helpers > 0
                      ? `${r.doing ? ' · ' : ''}${t('helpers', { n: r.helpers })}`
                      : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
