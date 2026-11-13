import { LANGS, setLang, t, useLang } from '../i18n.js';

/** Fork: 中文 / English / Deutsch toggle. */
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const lang = useLang();
  return (
    <div className={`flex items-center gap-4 ${className}`} title={t('language')}>
      <span aria-hidden="true">🌐</span>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setLang(l.id)}
          aria-pressed={lang === l.id}
          className={`flex-1 py-1 px-2 border-2 rounded-none cursor-pointer text-sm ${
            lang === l.id
              ? 'bg-active-bg border-accent text-text'
              : 'bg-btn-bg border-transparent text-text-muted hover:text-text'
          }`}
        >
          {l.id === 'zh' ? '中' : l.id.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
