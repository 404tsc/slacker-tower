import { useEffect, useRef, useState } from 'react';

import { t, useLang } from '../../i18n.js';
import type { Reminder } from '../engine/breaks.js';
import { reminderAt, reminderKey } from '../engine/breaks.js';
import type { OfficeState } from '../engine/officeState.js';

const CHECK_EVERY_MS = 15_000;
const SHOW_FOR_MS = 90_000;

/**
 * Water every full hour (9:00–22:00) and meals at 8:00 / 12:00 / 18:00:
 * the whole office takes a break and a banner reminds you to do the same.
 */
export function BreakReminder({ officeState }: { officeState: OfficeState }) {
  useLang();
  const [shown, setShown] = useState<Reminder | null>(null);
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const now = new Date();
      const reminder = reminderAt(now);
      if (!reminder) return;
      const key = reminderKey(now);
      if (firedRef.current === key) return;
      firedRef.current = key;
      officeState.startGroupBreak(reminder.kind);
      setShown(reminder);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setShown(null), SHOW_FOR_MS);
    };
    check();
    const interval = setInterval(check, CHECK_EVERY_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(hideTimer);
    };
  }, [officeState]);

  if (!shown) return null;
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 pixel-panel border-border px-12 py-6 flex items-center gap-10"
      style={{ top: 12, zIndex: 60, maxWidth: '90%' }}
      data-testid="break-reminder"
    >
      <div className="flex flex-col">
        <span style={{ fontSize: '24px', lineHeight: 1.1 }}>
          {shown.meal ? t('mealTitle', { meal: t(shown.meal) }) : t('drinkTitle')}
        </span>
        <span style={{ fontSize: '18px', lineHeight: 1.1, opacity: 0.85 }}>
          {shown.meal ? t('mealMsg') : t('drinkMsg')}
        </span>
      </div>
      <button
        type="button"
        className="pixel-panel border-border px-8"
        style={{ fontSize: '18px', cursor: 'pointer' }}
        onClick={() => setShown(null)}
      >
        {t('ok')}
      </button>
    </div>
  );
}
