// ─────────────────────────────────────────────────────────────────────────────
// Fork: UI language (中文 / English / Deutsch). The choice is remembered per
// browser. `t(key)` looks a phrase up in the current language; components that
// show text call `useLang()` so they re-render when the language changes.
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';

export type Lang = 'zh' | 'en' | 'de';

export const LANGS: Array<{ id: Lang; label: string }> = [
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
];

const STORAGE_KEY = 'pixel-agents.lang';

function readLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'zh' || v === 'en' || v === 'de') return v;
  } catch {
    // storage unavailable
  }
  // First visit: follow the browser's language
  const nav = (typeof navigator !== 'undefined' ? navigator.language : '').toLowerCase();
  if (nav.startsWith('zh')) return 'zh';
  if (nav.startsWith('de')) return 'de';
  return 'en';
}

let current: Lang = readLang();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // the choice just won't be remembered
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Current language; re-renders the component when it changes. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang);
}

type Entry = Record<Lang, string>;

const M = {
  // ── toolbar / common ──
  agent: { zh: '+ 助手', en: '+ Agent', de: '+ Agent' },
  layout: { zh: '布局', en: 'Layout', de: 'Layout' },
  layoutTitle: { zh: '编辑办公室布局', en: 'Edit office layout', de: 'Büro-Layout bearbeiten' },
  settings: { zh: '设置', en: 'Settings', de: 'Einstellungen' },
  terminalUnavailable: {
    zh: '这台服务器上没有可用的终端。',
    en: 'Terminal unavailable on this server.',
    de: 'Auf diesem Server ist kein Terminal verfügbar.',
  },
  addDirectory: { zh: '+ 文件夹', en: '+ Directory', de: '+ Ordner' },
  hostBadge: { zh: '主机', en: 'host', de: 'Host' },
  editDirectory: { zh: '编辑文件夹', en: 'Edit directory', de: 'Ordner bearbeiten' },
  editDirectoryNamed: { zh: '编辑 {name}', en: 'Edit {name}', de: '{name} bearbeiten' },
  loading: { zh: '加载中…', en: 'Loading...', de: 'Lädt …' },
  viewOnly: { zh: '只读', en: 'View only', de: 'Nur ansehen' },
  zoomIn: { zh: '放大（Ctrl+滚轮）', en: 'Zoom in (Ctrl+Scroll)', de: 'Vergrößern (Strg+Mausrad)' },
  zoomOut: {
    zh: '缩小（Ctrl+滚轮）',
    en: 'Zoom out (Ctrl+Scroll)',
    de: 'Verkleinern (Strg+Mausrad)',
  },
  closeAgent: { zh: '关闭助手', en: 'Close agent', de: 'Agent schließen' },
  closeTerminal: { zh: '关闭终端', en: 'Close terminal', de: 'Terminal schließen' },
  dragResize: { zh: '拖动调整宽度', en: 'Drag to resize', de: 'Ziehen zum Ändern der Breite' },
  agentN: { zh: '助手 {id}', en: 'Agent {id}', de: 'Agent {id}' },
  seeWhatsNew: { zh: '看看更新了什么', en: "See what's new", de: 'Was ist neu?' },
  seeWhatsNewBang: { zh: '看看更新了什么！', en: "See what's new!", de: 'Was ist neu?' },
  gotIt: { zh: '知道了', en: 'Got it', de: 'Verstanden' },
  ok: { zh: '好的', en: 'OK', de: 'Okay' },
  language: { zh: '语言', en: 'Language', de: 'Sprache' },

  // ── settings ──
  openSessionsFolder: {
    zh: '打开会话文件夹',
    en: 'Open Sessions Folder',
    de: 'Sitzungsordner öffnen',
  },
  exportLayout: { zh: '导出布局', en: 'Export Layout', de: 'Layout exportieren' },
  importLayout: { zh: '导入布局', en: 'Import Layout', de: 'Layout importieren' },
  assetDirPlaceholder: {
    zh: '素材文件夹的完整路径',
    en: 'Absolute asset directory path',
    de: 'Absoluter Pfad zum Asset-Ordner',
  },
  add: { zh: '添加', en: 'Add', de: 'Hinzufügen' },
  addAssetDirectory: {
    zh: '添加素材文件夹',
    en: 'Add Asset Directory',
    de: 'Asset-Ordner hinzufügen',
  },
  soundNotifications: { zh: '声音提醒', en: 'Sound Notifications', de: 'Tonbenachrichtigungen' },
  watchAllSessions: {
    zh: '显示所有会话',
    en: 'Watch All Sessions',
    de: 'Alle Sitzungen beobachten',
  },
  instantDetection: {
    zh: '即时检测（Hooks）',
    en: 'Instant Detection (Hooks)',
    de: 'Sofort-Erkennung (Hooks)',
  },
  alwaysShowLabels: {
    zh: '一直显示状态标签',
    en: 'Always Show Labels',
    de: 'Beschriftungen immer zeigen',
  },
  ghosts: {
    zh: '无终端的助手显示成半透明',
    en: 'Display Headless as Ghosts',
    de: 'Agenten ohne Terminal als Geister zeigen',
  },
  showAreas: { zh: '显示区域', en: 'Show Areas', de: 'Bereiche anzeigen' },
  skipPermissions: {
    zh: '跳过权限确认',
    en: 'Skip Permissions',
    de: 'Berechtigungen überspringen',
  },
  showStartDirectory: {
    zh: '显示启动文件夹',
    en: 'Show Start Directory',
    de: 'Startordner anzeigen',
  },
  showWorkspaceFolders: {
    zh: '显示工作区文件夹',
    en: 'Show Workspace Folders',
    de: 'Arbeitsbereichsordner anzeigen',
  },
  debugView: { zh: '调试视图', en: 'Debug View', de: 'Debug-Ansicht' },
  replaceLayoutConfirm: {
    zh: '要替换当前布局吗？没保存的修改会丢失。',
    en: 'Replace the current layout? Unsaved edits will be lost.',
    de: 'Aktuelles Layout ersetzen? Nicht gespeicherte Änderungen gehen verloren.',
  },
  invalidLayout: {
    zh: '布局文件无效。',
    en: 'Invalid layout file.',
    de: 'Ungültige Layout-Datei.',
  },
  layoutReadFailed: {
    zh: '无法读取或解析布局文件。',
    en: 'Failed to read or parse layout file.',
    de: 'Layout-Datei konnte nicht gelesen werden.',
  },
  hooksActiveTitle: {
    zh: '即时检测已开启',
    en: 'Instant Detection is ON',
    de: 'Sofort-Erkennung ist AN',
  },
  hooksActive: {
    zh: '即时检测已开启',
    en: 'Instant Detection Active',
    de: 'Sofort-Erkennung aktiv',
  },
  hooksLine1: {
    zh: '需要授权时会立刻提示',
    en: 'Permission prompts appear instantly',
    de: 'Berechtigungsanfragen erscheinen sofort',
  },
  hooksLine2: {
    zh: '助手做完一轮会马上知道',
    en: 'Turn completions detected the moment they happen',
    de: 'Fertige Runden werden sofort erkannt',
  },
  hooksLine3: {
    zh: '提示音立刻响起',
    en: 'Sound notifications play immediately',
    de: 'Töne werden sofort abgespielt',
  },
  hooksExplain: {
    zh: '这是通过 Claude Code 的 Hooks 实现的：一些小监听器，在你的 Claude 会话有动静时通知 Pixel Agents。',
    en: 'This works through Claude Code Hooks, small event listeners that notify Pixel Agents whenever something happens in your Claude sessions.',
    de: 'Das funktioniert über Claude Code Hooks – kleine Listener, die Pixel Agents benachrichtigen, sobald in deinen Claude-Sitzungen etwas passiert.',
  },
  viewMore: { zh: '了解更多', en: 'View more', de: 'Mehr dazu' },

  // ── layout editor ──
  undo: { zh: '撤销', en: 'Undo', de: 'Rückgängig' },
  undoTitle: { zh: '撤销（Ctrl+Z）', en: 'Undo (Ctrl+Z)', de: 'Rückgängig (Strg+Z)' },
  redo: { zh: '重做', en: 'Redo', de: 'Wiederholen' },
  redoTitle: { zh: '重做（Ctrl+Y）', en: 'Redo (Ctrl+Y)', de: 'Wiederholen (Strg+Y)' },
  save: { zh: '保存', en: 'Save', de: 'Speichern' },
  saveLayout: { zh: '保存布局', en: 'Save layout', de: 'Layout speichern' },
  reset: { zh: '还原', en: 'Reset', de: 'Zurücksetzen' },
  resetTitle: {
    zh: '还原到上次保存的布局',
    en: 'Reset to last saved layout',
    de: 'Auf zuletzt gespeichertes Layout zurücksetzen',
  },
  resetQ: { zh: '确定还原？', en: 'Reset?', de: 'Zurücksetzen?' },
  yes: { zh: '是', en: 'Yes', de: 'Ja' },
  no: { zh: '否', en: 'No', de: 'Nein' },
  rotateHint: { zh: '旋转（R）', en: 'Rotate (R)', de: 'Drehen (R)' },
  furniture: { zh: '家具', en: 'Furniture', de: 'Möbel' },
  furnitureTitle: { zh: '摆放家具', en: 'Place furniture', de: 'Möbel platzieren' },
  floor: { zh: '地板', en: 'Floor', de: 'Boden' },
  floorTitle: { zh: '刷地板', en: 'Paint floor tiles', de: 'Bodenfliesen malen' },
  walls: { zh: '墙', en: 'Walls', de: 'Wände' },
  wallsTitle: {
    zh: '刷墙（点一下切换）',
    en: 'Paint walls (click to toggle)',
    de: 'Wände malen (Klick zum Umschalten)',
  },
  pets: { zh: '宠物', en: 'Pets', de: 'Haustiere' },
  petsTitle: { zh: '放宠物', en: 'Place pets', de: 'Haustiere platzieren' },
  areas: { zh: '区域', en: 'Areas', de: 'Bereiche' },
  areasTitle: {
    zh: '划分区域并绑定文件夹：助手会坐到自己文件夹对应的区域',
    en: "Define folder-bound areas — agents spawn in their folder's area",
    de: 'Bereiche für Ordner festlegen – Agenten erscheinen im Bereich ihres Ordners',
  },
  erase: { zh: '擦除', en: 'Erase', de: 'Löschen' },
  eraseTitle: { zh: '把地块擦成空白', en: 'Erase tiles to void', de: 'Felder entfernen' },
  copy: { zh: '吸取', en: 'Copy', de: 'Kopieren' },
  copyFloorTitle: {
    zh: '从已有地块吸取花纹和颜色',
    en: 'Copy floor pattern + color from existing tile',
    de: 'Bodenmuster und Farbe von einem Feld übernehmen',
  },
  color: { zh: '颜色', en: 'Color', de: 'Farbe' },
  floorColorTitle: { zh: '调整地板颜色', en: 'Adjust floor color', de: 'Bodenfarbe anpassen' },
  wallColorTitle: { zh: '调整墙的颜色', en: 'Adjust wall color', de: 'Wandfarbe anpassen' },
  floorN: { zh: '地板 {n}', en: 'Floor {n}', de: 'Boden {n}' },
  wallN: { zh: '墙 {n}', en: 'Wall {n}', de: 'Wand {n}' },
  carpetN: { zh: '地毯 {n}', en: 'Carpet {n}', de: 'Teppich {n}' },
  areasHelp: {
    zh: '先在地图上刷出区域，再分配文件夹。助手会坐到自己文件夹对应的区域里。',
    en: "Paint areas on the map, then assign workspace folders. Agents will sit in their folder's area.",
    de: 'Bereiche auf die Karte malen und dann Ordner zuweisen. Agenten sitzen im Bereich ihres Ordners.',
  },
  carpet: { zh: '地毯', en: 'Carpet', de: 'Teppich' },
  carpetTitle: { zh: '铺地毯', en: 'Paint carpets', de: 'Teppiche malen' },
  newFurnitureColor: {
    zh: '调整新家具的颜色',
    en: 'Adjust color for new furniture',
    de: 'Farbe für neue Möbel anpassen',
  },
  copyCarpetTitle: {
    zh: '从已有地块吸取地毯样式和颜色（P）',
    en: 'Copy carpet variant + colors from existing tile (P)',
    de: 'Teppich und Farben von einem Feld übernehmen (P)',
  },
  copyFurnitureTitle: {
    zh: '吸取已摆放家具的类型',
    en: 'Copy furniture type from placed item',
    de: 'Möbeltyp von einem platzierten Stück übernehmen',
  },
  main: { zh: '主色', en: 'Main', de: 'Haupt' },
  accent: { zh: '点缀色', en: 'Accent', de: 'Akzent' },
  contrast: { zh: '对比度', en: 'Contrast', de: 'Kontrast' },
  hue: { zh: '色相', en: 'Hue', de: 'Farbton' },
  saturation: { zh: '饱和度', en: 'Saturation', de: 'Sättigung' },
  brightness: { zh: '亮度', en: 'Brightness', de: 'Helligkeit' },
  colorize: { zh: '上色', en: 'Colorize', de: 'Einfärben' },
  colorizeTitle: { zh: '切换上色模式', en: 'Toggle colorize mode', de: 'Einfärbemodus umschalten' },
  copyColorTitle: {
    zh: '从别的物件吸取颜色：在办公室里点一个',
    en: 'Copy color from another item — click one in the office',
    de: 'Farbe von einem anderen Objekt übernehmen – im Büro anklicken',
  },
  resetDefault: { zh: '恢复默认', en: 'Reset to default', de: 'Auf Standard zurücksetzen' },
  areaNamePlaceholder: { zh: '区域名称…', en: 'Area name…', de: 'Bereichsname …' },
  addArea: { zh: '添加区域', en: 'Add Area', de: 'Bereich hinzufügen' },
  addAreaTitle: { zh: '新建一个区域', en: 'Add a new Area', de: 'Neuen Bereich anlegen' },
  areaColor: { zh: '区域颜色', en: 'Area color', de: 'Bereichsfarbe' },
  renameHint: {
    zh: '{label}：双击改名',
    en: '{label} — double-click to rename',
    de: '{label} – Doppelklick zum Umbenennen',
  },
  removeArea: { zh: '删除区域', en: 'Remove area', de: 'Bereich entfernen' },
  noFolders: { zh: '还没有绑定文件夹', en: 'No folders mapped', de: 'Keine Ordner zugeordnet' },
  unmapFolder: { zh: '取消绑定', en: 'Unmap folder', de: 'Ordnerzuordnung entfernen' },
  allMapped: {
    zh: '所有文件夹都绑定过了',
    en: 'All folders already mapped',
    de: 'Alle Ordner sind schon zugeordnet',
  },
  mapFolder: { zh: '绑定文件夹…', en: 'Map a folder…', de: 'Ordner zuordnen …' },
  addFolder: { zh: '添加文件夹…', en: 'Add folder…', de: 'Ordner hinzufügen …' },
  noAreas: {
    zh: '还没有区域：在上面添加一个',
    en: 'No areas yet — add one above',
    de: 'Noch keine Bereiche – oben einen hinzufügen',
  },
  carpetColorTitle: {
    zh: '调整地毯的主色和点缀色',
    en: 'Adjust carpet main + accent colors',
    de: 'Haupt- und Akzentfarbe des Teppichs anpassen',
  },
  catDesks: { zh: '桌子', en: 'Desks', de: 'Tische' },
  catChairs: { zh: '椅子', en: 'Chairs', de: 'Stühle' },
  catStorage: { zh: '收纳', en: 'Storage', de: 'Stauraum' },
  catElectronics: { zh: '电器', en: 'Tech', de: 'Technik' },
  catDecor: { zh: '装饰', en: 'Decor', de: 'Deko' },
  catWall: { zh: '墙饰', en: 'Wall', de: 'Wand' },
  catMisc: { zh: '其他', en: 'Misc', de: 'Sonstiges' },

  // ── directory modal ──
  editDirectoryTitle: { zh: '编辑文件夹', en: 'Edit Directory', de: 'Ordner bearbeiten' },
  addDirectoryTitle: { zh: '添加文件夹', en: 'Add Directory', de: 'Ordner hinzufügen' },
  name: { zh: '名称', en: 'Name', de: 'Name' },
  projectName: { zh: '项目名称', en: 'Project name', de: 'Projektname' },
  path: { zh: '路径', en: 'Path', de: 'Pfad' },
  recentDirs: {
    zh: '最近用过的文件夹',
    en: 'Recent working directories',
    de: 'Zuletzt verwendete Ordner',
  },
  delete: { zh: '删除', en: 'Delete', de: 'Löschen' },
  cancel: { zh: '取消', en: 'Cancel', de: 'Abbrechen' },

  // ── agents / team panel ──
  needsApproval: { zh: '需要你授权', en: 'Needs approval', de: 'Braucht Freigabe' },
  waitingInput: { zh: '等你回复', en: 'Waiting for input', de: 'Wartet auf Eingabe' },
  idle: { zh: '空闲', en: 'Idle', de: 'Frei' },
  subtask: { zh: '子任务', en: 'Subtask', de: 'Teilaufgabe' },
  lead: { zh: '组长', en: 'LEAD', de: 'LEITUNG' },
  contextUsed: {
    zh: '上下文已用 {pct}%（{used}k / {max}k tokens）',
    en: '{pct}% context used ({used}k of {max}k tokens)',
    de: '{pct} % Kontext belegt ({used}k von {max}k Tokens)',
  },
  stPermission: { zh: '🔐 需要你授权', en: '🔐 Needs your OK', de: '🔐 Braucht dein OK' },
  stReply: { zh: '💬 等你回复', en: '💬 Waiting for you', de: '💬 Wartet auf dich' },
  stReview: { zh: '✅ 做完了·待审阅', en: '✅ Done · review', de: '✅ Fertig · prüfen' },
  stWorking: { zh: '⚙️ 工作中', en: '⚙️ Working', de: '⚙️ Arbeitet' },
  stBreak: { zh: '☕ 休息中', en: '☕ On a break', de: '☕ Macht Pause' },
  stIdle: { zh: '😴 空闲', en: '😴 Idle', de: '😴 Frei' },
  wantsTo: { zh: '想要：{what}', en: 'Wants to: {what}', de: 'Möchte: {what}' },
  waitingClick: { zh: '等你点同意', en: 'Waiting for your OK', de: 'Wartet auf dein OK' },
  thinking: { zh: '思考中…', en: 'Thinking…', de: 'Denkt nach …' },
  assistantN: { zh: '助手 #{id}', en: 'Agent #{id}', de: 'Agent #{id}' },
  expandTeam: { zh: '展开团队面板', en: 'Expand team panel', de: 'Team-Liste aufklappen' },
  collapseTeam: { zh: '收起团队面板', en: 'Collapse team panel', de: 'Team-Liste zuklappen' },
  teamCount: { zh: '👥 团队 · {n} 人', en: '👥 Team · {n}', de: '👥 Team · {n}' },
  needYou: { zh: ' · {n} 个在等你', en: ' · {n} need you', de: ' · {n} warten auf dich' },
  taskTitle: { zh: '任务：{task}', en: 'Task: {task}', de: 'Aufgabe: {task}' },
  noTask: { zh: '还没有布置任务', en: 'No task yet', de: 'Noch keine Aufgabe' },
  helpers: { zh: '👥 {n} 个帮手', en: '👥 {n} helpers', de: '👥 {n} Helfer' },

  // ── breaks & reminders ──
  brDrink: { zh: '喝水中', en: 'Drinking water', de: 'Trinkt Wasser' },
  brCoffee: { zh: '喝咖啡', en: 'Having coffee', de: 'Trinkt Kaffee' },
  brEat: { zh: '吃饭中', en: 'Eating', de: 'Isst' },
  brNap: { zh: '睡觉中', en: 'Sleeping', de: 'Schläft' },
  brRelax: { zh: '发呆中', en: 'Chilling', de: 'Chillt' },
  brWorkout: { zh: '健身中', en: 'Working out', de: 'Trainiert' },
  brSwim: { zh: '游泳中', en: 'Swimming', de: 'Schwimmt' },
  breakfast: { zh: '早饭', en: 'Breakfast', de: 'Frühstück' },
  lunch: { zh: '午饭', en: 'Lunch', de: 'Mittagessen' },
  dinner: { zh: '晚饭', en: 'Dinner', de: 'Abendessen' },
  mealTitle: { zh: '🍚 {meal}时间到', en: '🍚 Time for {meal}', de: '🍚 Zeit fürs {meal}' },
  mealMsg: {
    zh: '大家都去吃饭啦，你也先去吃饭吧～',
    en: "Everyone's off to eat — go grab something too!",
    de: 'Alle gehen essen – gönn dir auch was!',
  },
  drinkTitle: {
    zh: '💧 喝水时间到',
    en: '💧 Time to drink water',
    de: '💧 Zeit, Wasser zu trinken',
  },
  drinkMsg: {
    zh: '又过了一小时，起来喝口水、活动一下吧！',
    en: 'Another hour has passed — have some water and stretch!',
    de: 'Wieder eine Stunde um – trink etwas Wasser und beweg dich!',
  },

  // ── building ──
  wholeBuilding: { zh: '🏢 全楼', en: '🏢 Building', de: '🏢 Gebäude' },
  wholeBuildingTitle: {
    zh: '看整栋楼',
    en: 'See the whole building',
    de: 'Ganzes Gebäude ansehen',
  },
  enterFloor: { zh: '进入 {floor}', en: 'Go to {floor}', de: 'Zu {floor}' },
  people: { zh: '{n}人', en: '{n}', de: '{n}' },
  buildingName: { zh: '🐟 摸鱼大厦', en: '🐟 Slacker Tower', de: '🐟 Faulenzer-Turm' },
} satisfies Record<string, Entry>;

export type MsgKey = keyof typeof M;

/** The phrase in the current language, with {placeholders} filled in. */
export function t(key: MsgKey, vars?: Record<string, string | number>): string {
  let s: string = M[key][current];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

const BREAK_KEYS: Record<string, MsgKey> = {
  drink: 'brDrink',
  coffee: 'brCoffee',
  eat: 'brEat',
  nap: 'brNap',
  relax: 'brRelax',
  workout: 'brWorkout',
  swim: 'brSwim',
};

/** "Drinking water", "Sleeping", … for a break kind. */
export function breakLabel(kind: string): string {
  const key = BREAK_KEYS[kind];
  return key ? t(key) : kind;
}

const CATEGORY_KEYS: Record<string, MsgKey> = {
  desks: 'catDesks',
  chairs: 'catChairs',
  storage: 'catStorage',
  electronics: 'catElectronics',
  decor: 'catDecor',
  wall: 'catWall',
  misc: 'catMisc',
};

/** Furniture category tab label. */
export function catLabel(id: string, fallback: string): string {
  const key = CATEGORY_KEYS[id];
  return key ? t(key) : fallback;
}

// ── names that live in the layout / config (rooms, floors, roles) ───────────

const NAMES: Record<string, { en: string; de: string }> = {
  // rooms
  市场部: { en: 'Marketing', de: 'Marketing' },
  设计部: { en: 'Design', de: 'Design' },
  技术部: { en: 'Engineering', de: 'Technik' },
  会议室: { en: 'Meeting Room', de: 'Besprechungsraum' },
  茶水间: { en: 'Pantry', de: 'Teeküche' },
  休息区: { en: 'Lounge', de: 'Lounge' },
  电梯厅: { en: 'Elevators', de: 'Aufzüge' },
  健身房: { en: 'Gym', de: 'Fitnessraum' },
  泳池: { en: 'Pool', de: 'Pool' },
  卧室: { en: 'Bedroom', de: 'Schlafzimmer' },
  猫舍: { en: 'Cattery', de: 'Katzenzimmer' },
  // floors
  办公室: { en: 'Office', de: 'Büro' },
  '健身·泳池': { en: 'Gym · Pool', de: 'Fitness · Pool' },
  // roles
  品牌合作经理: { en: 'Partnership Manager', de: 'Partnermanager' },
  文案: { en: 'Copywriter', de: 'Texter' },
  设计: { en: 'Designer', de: 'Designer' },
  数据分析: { en: 'Data Analyst', de: 'Datenanalyst' },
  程序员: { en: 'Developer', de: 'Entwickler' },
  闲聊: { en: 'Chatter', de: 'Plauderer' },
};

/**
 * A room, floor or role name in the current language. Keeps a leading emoji
 * ("✍️ 文案" → "✍️ Copywriter") and handles "<role>卧室" bedrooms. Unknown
 * names (the user's own) are shown as they are.
 */
export function tName(name: string | undefined): string {
  if (!name || current === 'zh') return name ?? '';
  const m = /^([^\p{L}\p{N}]*)(.*)$/u.exec(name);
  const prefix = m?.[1] ?? '';
  const core = (m?.[2] ?? name).trim();
  const lang = current;
  const direct = NAMES[core];
  if (direct) return prefix + direct[lang];
  const numbered = /^卧室\s*(\d+)$/.exec(core);
  if (numbered) return prefix + (lang === 'de' ? `Schlafzimmer ${numbered[1]}` : `Bedroom ${numbered[1]}`);
  if (core.endsWith('卧室')) {
    const who = NAMES[core.slice(0, -2)];
    if (who) return prefix + (lang === 'de' ? `${who.de}-Zimmer` : `${who.en}'s Room`);
  }
  return name;
}

// ── the server's tool status lines (English) ────────────────────────────────

const STATUS_PATTERNS: Array<[RegExp, Record<Lang, string>]> = [
  [/^Reading /, { zh: '读取 ', en: 'Reading ', de: 'Liest ' }],
  [/^Editing notebook$/, { zh: '编辑笔记本', en: 'Editing notebook', de: 'Bearbeitet Notebook' }],
  [/^Editing /, { zh: '修改 ', en: 'Editing ', de: 'Bearbeitet ' }],
  [/^Writing /, { zh: '写入 ', en: 'Writing ', de: 'Schreibt ' }],
  [/^Running: /, { zh: '运行命令：', en: 'Running: ', de: 'Führt aus: ' }],
  [/^Searching files$/, { zh: '查找文件', en: 'Searching files', de: 'Sucht Dateien' }],
  [/^Searching code$/, { zh: '搜索代码', en: 'Searching code', de: 'Durchsucht Code' }],
  [/^Fetching web content$/, { zh: '读取网页', en: 'Fetching web content', de: 'Lädt Webseite' }],
  [/^Searching the web$/, { zh: '上网搜索', en: 'Searching the web', de: 'Sucht im Web' }],
  [
    /^Waiting for your answer$/,
    { zh: '在问你问题', en: 'Waiting for your answer', de: 'Wartet auf deine Antwort' },
  ],
  [/^Planning$/, { zh: '做计划', en: 'Planning', de: 'Plant' }],
  [/^Subtask: /, { zh: '派帮手：', en: 'Subtask: ', de: 'Teilaufgabe: ' }],
  [/^Using /, { zh: '使用 ', en: 'Using ', de: 'Nutzt ' }],
];

/** A tool status line from the server, in the current language. */
export function tStatus(status: string): string {
  for (const [re, tr] of STATUS_PATTERNS) {
    if (re.test(status)) return status.replace(re, tr[current]);
  }
  return status;
}
