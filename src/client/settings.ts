// Player settings, remembered per browser in localStorage. Each setting is a small {get, set}
// pair (the shape the panel's hooks take); storage that is blocked (private mode) just means the
// setting lasts for this visit.

export type Setting<T> = { get(): T; set(value: T): void };

/**
 * A remembered setting. `onChange` runs after every set, and once now with the stored value
 * (`initial` true, while the page is still starting: touch only what already exists).
 */
export function setting<T extends boolean | number>(key: string, fallback: T,
  onChange?: (value: T, initial: boolean) => void): Setting<T> {
  let value = fallback;
  try {
    const raw = localStorage.getItem(`corallum.${key}`);
    if (raw !== null) {
      if (typeof fallback === 'boolean') value = (raw === 'on') as T;
      else if (Number.isFinite(Number(raw))) value = Number(raw) as T;
    }
  } catch { /* no storage */ }
  onChange?.(value, true);
  return {
    get: () => value,
    set(next: T) {
      value = next;
      try {
        localStorage.setItem(`corallum.${key}`, typeof next === 'boolean' ? (next ? 'on' : 'off') : String(next));
      } catch { /* no storage */ }
      onChange?.(next, false);
    },
  };
}
