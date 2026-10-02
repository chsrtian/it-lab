import { useEffect, useState } from "react";

const STORAGE_KEY = "itlab:devDiagnostics";

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useDevDiagnostics() {
  const [enabled, setEnabled] = useState(readEnabled);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEnabled(e.newValue === "1");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = () => {
    const next = !enabled;
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    setEnabled(next);
  };

  return { enabled, toggle };
}
