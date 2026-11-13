// ─────────────────────────────────────────────────────────────────────────────
// Fork: each agent's "current task" = the user's most recent prompt in its
// session transcript, shown in the webview's team panel.
// ─────────────────────────────────────────────────────────────────────────────
import * as fs from 'fs';

import type { AgentStateStore } from './agentStateStore.js';
import type { AgentState } from './types.js';

const MAX_TASK_CHARS = 160;
/** How far back from the end of a transcript to look for the last prompt. */
const TAIL_SCAN_BYTES = 1024 * 1024;

/** The user's typed prompt from a transcript record, or null when the record
 *  is a tool result, a slash-command echo, a system-injected message, etc. */
export function promptFromRecord(record: unknown): string | null {
  if (!record || typeof record !== 'object') return null;
  const r = record as {
    type?: string;
    isMeta?: boolean;
    isSidechain?: boolean;
    isCompactSummary?: boolean;
    message?: { content?: unknown };
    content?: unknown;
  };
  if (r.type !== 'user' || r.isMeta || r.isSidechain || r.isCompactSummary) return null;
  const content = r.message?.content ?? r.content;
  let text: string | undefined;
  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    const blocks = content as Array<{ type?: string; text?: string }>;
    if (blocks.some((b) => b.type === 'tool_result')) return null;
    text = blocks.find((b) => b.type === 'text' && typeof b.text === 'string')?.text;
  }
  if (!text) return null;
  // Strip injected wrappers (<system-reminder>, <pasted_content>, ...) and
  // skip slash-command / local-command echoes entirely.
  const trimmed = text.trim();
  if (/^<(command-|local-command|bash-|task-notification|user-memory)/.test(trimmed)) return null;
  if (trimmed.startsWith('[Request interrupted')) return null;
  const cleaned = trimmed
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, ' ')
    .replace(/<pasted_content[^>]*>[\s\S]*?<\/pasted_content[^>]*>/g, ' [粘贴内容] ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  return cleaned.length > MAX_TASK_CHARS ? cleaned.slice(0, MAX_TASK_CHARS - 1) + '…' : cleaned;
}

/** Last prompt in the tail of a transcript file ('' when none found). */
function scanTailForTask(file: string): string {
  try {
    const stat = fs.statSync(file);
    const start = Math.max(0, stat.size - TAIL_SCAN_BYTES);
    const len = stat.size - start;
    if (len <= 0) return '';
    const buf = Buffer.alloc(len);
    const fd = fs.openSync(file, 'r');
    try {
      fs.readSync(fd, buf, 0, len, start);
    } finally {
      fs.closeSync(fd);
    }
    const lines = buf.toString('utf-8').split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line.startsWith('{')) continue;
      try {
        const task = promptFromRecord(JSON.parse(line));
        if (task) return task;
      } catch {
        // partial first line of the window — ignore
      }
    }
  } catch {
    // missing / unreadable transcript
  }
  return '';
}

/** Record a new task and tell the webviews. */
export function setAgentTask(
  agentId: number,
  agent: AgentState,
  agents: AgentStateStore,
  task: string,
): void {
  if (agent.currentTask === task) return;
  agent.currentTask = task;
  agents.broadcast({ type: 'agentTask', id: agentId, task });
}

/** First time we look at an agent (e.g. an already-running session adopted at
 *  the end of its file), recover its task from the transcript tail. */
export function ensureAgentTask(agentId: number, agent: AgentState, agents: AgentStateStore): void {
  if (agent.currentTask !== undefined || !agent.jsonlFile) return;
  const task = scanTailForTask(agent.jsonlFile);
  agent.currentTask = task;
  if (task) agents.broadcast({ type: 'agentTask', id: agentId, task });
}
