export const safeGetItem = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeSetItem = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // silently fail in restricted environments (in-app browsers)
  }
};

export const safeRemoveItem = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // silently fail in restricted environments
  }
};
