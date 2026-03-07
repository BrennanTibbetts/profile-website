import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "r3fDiagnosticsEnabled";
const QUERY_KEYS = ["perf", "diagnostics", "debug3d"];
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function parseBooleanFlag(rawValue) {
  if (typeof rawValue !== "string") {
    return null;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }
  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  return null;
}

function getInitialValue(defaultValue) {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  const searchParams = new URLSearchParams(window.location.search);
  for (const key of QUERY_KEYS) {
    const parsed = parseBooleanFlag(searchParams.get(key));
    if (typeof parsed === "boolean") {
      return parsed;
    }
  }

  try {
    const persisted = parseBooleanFlag(window.localStorage.getItem(STORAGE_KEY));
    if (typeof persisted === "boolean") {
      return persisted;
    }
  } catch {
    // Ignore storage failures (private mode or blocked storage).
  }

  return defaultValue;
}

export function useDiagnosticsEnabled(defaultValue = false) {
  const [enabled, setEnabled] = useState(() => getInitialValue(defaultValue));

  const toggleDiagnostics = useCallback(() => {
    setEnabled((current) => !current);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // Ignore storage failures (private mode or blocked storage).
    }
  }, [enabled]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event) => {
      if (!event.shiftKey || event.key.toLowerCase() !== "d" || event.repeat) {
        return;
      }

      const activeElement = document.activeElement;
      const tagName = activeElement?.tagName?.toLowerCase();
      const isTypingContext = tagName === "input" || tagName === "textarea" || activeElement?.isContentEditable;
      if (isTypingContext) {
        return;
      }

      toggleDiagnostics();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleDiagnostics]);

  return [enabled, setEnabled];
}
