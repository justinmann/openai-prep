import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_FORMAT,
  parseFormatSettings,
  type FormatSettings,
} from '../shared/format';

// Formatting preferences: a per-browser convenience, so localStorage.

const KEY = 'oaiprep:format';

function read(): FormatSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return parseFormatSettings(raw ? (JSON.parse(raw) as unknown) : null);
  } catch {
    return DEFAULT_FORMAT;
  }
}

export function useFormatPrefs(): [
  FormatSettings,
  (patch: Partial<FormatSettings>) => void,
] {
  const [prefs, setPrefs] = useState<FormatSettings>(DEFAULT_FORMAT);
  useEffect(() => {
    setPrefs(read());
  }, []);
  const update = useCallback((patch: Partial<FormatSettings>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // storage blocked: the change lasts for this page only
      }
      return next;
    });
  }, []);
  return [prefs, update];
}
