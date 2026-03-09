import { useState } from "react";

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

  return defaultValue;
}

export function useDiagnosticsEnabled(defaultValue = false) {
  const [enabled, setEnabled] = useState(() => getInitialValue(defaultValue));

  return [enabled, setEnabled];
}
