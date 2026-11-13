import * as vscode from 'vscode';

import { FileStateAdapter } from '../../server/src/fileStateAdapter.js';
import {
  COMMAND_EXPORT_DEFAULT_LAYOUT,
  COMMAND_SHOW_PANEL,
  CONFIG_KEY_AUTO_SHOW_PANEL,
  VIEW_ID,
} from './constants.js';
import { migrateVsCodeState } from './migrateVsCodeState.js';
import { PixelAgentsViewProvider } from './PixelAgentsViewProvider.js';

let providerInstance: PixelAgentsViewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log(`[Pixel Agents] PIXEL_AGENTS_DEBUG=${process.env.PIXEL_AGENTS_DEBUG ?? 'not set'}`);

  // Shared file-backed state adapter (VS Code namespace in ~/.pixel-agents/config.json).
  const adapter = new FileStateAdapter({ namespace: 'vscode' });

  // One-time migration from legacy workspaceState/globalState. Idempotent; runs every
  // activate. Warns until all keys are cleared (e.g. if a disk error blocks writes).
  migrateVsCodeState(context, adapter);

  const provider = new PixelAgentsViewProvider(context, adapter);
  providerInstance = provider;

  context.subscriptions.push(vscode.window.registerWebviewViewProvider(VIEW_ID, provider));

  // Break reminders (same schedule as the office's group breaks in the webview):
  // water every full hour 9:00–22:00, meals at 8:00 / 12:00 / 18:00, local time.
  let lastReminderKey = '';
  const reminderTimer = setInterval(() => {
    const now = new Date();
    if (now.getMinutes() !== 0) return;
    const h = now.getHours();
    const key = `${now.toDateString()}-${h}`;
    if (key === lastReminderKey) return;
    const meals: Record<number, string> = { 8: '早饭', 12: '午饭', 18: '晚饭' };
    let text: string | null = null;
    if (meals[h]) text = `🍚 ${meals[h]}时间到！办公室的小人都去吃饭了，你也先去吃饭吧～`;
    else if (h >= 9 && h <= 22) text = '💧 喝水时间到！又过了一小时，起来喝口水、活动一下吧。';
    if (!text) return;
    lastReminderKey = key;
    void vscode.window.showInformationMessage(text, '好的');
  }, 15_000);
  context.subscriptions.push({ dispose: () => clearInterval(reminderTimer) });

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_SHOW_PANEL, () => {
      vscode.commands.executeCommand(`${VIEW_ID}.focus`);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_EXPORT_DEFAULT_LAYOUT, () => {
      provider.exportDefaultLayout();
    }),
  );

  // Auto-show panel: focus the Pixel Agents panel on startup if the user has
  // opted in via the pixel-agents.autoShowPanel setting.
  const config = vscode.workspace.getConfiguration();
  if (config.get<boolean>(CONFIG_KEY_AUTO_SHOW_PANEL, false)) {
    vscode.commands.executeCommand(`${VIEW_ID}.focus`);
  }
}

export function deactivate() {
  providerInstance?.dispose();
}
