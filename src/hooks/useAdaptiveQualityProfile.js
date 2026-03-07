import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "profileWebsiteAdaptiveQualityV1";
const CACHE_TTL_MS = 1000 * 60 * 45;
const WARMUP_MS = 120;
const SAMPLE_MS = 900;

const TIER_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
};

export const QUALITY_PRESETS = {
  high: {
    canvasDpr: [1, 1.25],
    enableEnvironment: true,
    environmentResolution: 256,
    lightingIntensityScale: 1,
    enableMouseTracking: true,
    connectorCount: 9,
    connectorPhysicsStepDivisor: 1,
    connectorPointerUpdateDivisor: 1,
    connectorAccentLights: true,
    connectorCenterPullMultiplier: 1,
  },
  medium: {
    canvasDpr: 1,
    enableEnvironment: true,
    environmentResolution: 192,
    lightingIntensityScale: 0.82,
    enableMouseTracking: true,
    connectorCount: 7,
    connectorPhysicsStepDivisor: 2,
    connectorPointerUpdateDivisor: 2,
    connectorAccentLights: false,
    connectorCenterPullMultiplier: 0.9,
  },
  low: {
    canvasDpr: 0.85,
    enableEnvironment: false,
    environmentResolution: 128,
    lightingIntensityScale: 0.68,
    enableMouseTracking: false,
    connectorCount: 5,
    connectorPhysicsStepDivisor: 3,
    connectorPointerUpdateDivisor: 3,
    connectorAccentLights: false,
    connectorCenterPullMultiplier: 0.75,
  },
};

function worstTier(a, b) {
  return TIER_ORDER[a] >= TIER_ORDER[b] ? a : b;
}

function getHardwareTier() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "high";
  }

  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = navigator.deviceMemory ?? 8;

  if (cores <= 4 || memory <= 4) {
    return "low";
  }
  if (cores <= 8 || memory <= 8) {
    return "medium";
  }
  return "high";
}

function runtimeTierFromSample(avgFps, p95Ms) {
  if (!Number.isFinite(avgFps) || !Number.isFinite(p95Ms)) {
    return "medium";
  }
  if (avgFps < 43 || p95Ms > 34) {
    return "low";
  }
  if (avgFps < 56 || p95Ms > 24) {
    return "medium";
  }
  return "high";
}

function percentile(values, pct) {
  if (!values.length) {
    return Number.NaN;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * pct));
  return sorted[index];
}

function readCachedTier() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.tier || !(parsed.tier in QUALITY_PRESETS)) {
      return null;
    }
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedTier(payload) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      })
    );
  } catch {
    // Ignore persistence failures.
  }
}

export function useAdaptiveQualityProfile() {
  const hardwareTier = useMemo(() => getHardwareTier(), []);
  const cached = useMemo(() => readCachedTier(), []);
  const [profile, setProfile] = useState(() => ({
    tier: cached?.tier ?? hardwareTier,
    source: cached ? "cache" : "hardware",
    runtimeFps: cached?.runtimeFps ?? null,
    p95FrameMs: cached?.p95FrameMs ?? null,
    ready: Boolean(cached),
  }));

  useEffect(() => {
    if (cached) {
      return;
    }

    let rafId = 0;
    let cancelled = false;
    let startTime = 0;
    let lastTime = 0;
    const samples = [];

    const onFrame = (now) => {
      if (cancelled) {
        return;
      }

      if (startTime === 0) {
        startTime = now;
        lastTime = now;
        rafId = window.requestAnimationFrame(onFrame);
        return;
      }

      const elapsed = now - startTime;
      const dt = now - lastTime;
      lastTime = now;

      if (elapsed >= WARMUP_MS) {
        samples.push(dt);
      }

      if (elapsed < WARMUP_MS + SAMPLE_MS) {
        rafId = window.requestAnimationFrame(onFrame);
        return;
      }

      const avgDtMs = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : Number.NaN;
      const avgFps = Number.isFinite(avgDtMs) && avgDtMs > 0 ? 1000 / avgDtMs : Number.NaN;
      const p95Ms = percentile(samples, 0.95);

      const runtimeTier = runtimeTierFromSample(avgFps, p95Ms);
      const tier = worstTier(hardwareTier, runtimeTier);
      const next = {
        tier,
        source: "runtime",
        runtimeFps: avgFps,
        p95FrameMs: p95Ms,
        ready: true,
      };

      setProfile(next);
      writeCachedTier({
        tier: next.tier,
        runtimeFps: next.runtimeFps,
        p95FrameMs: next.p95FrameMs,
      });
    };

    rafId = window.requestAnimationFrame(onFrame);

    return () => {
      cancelled = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [cached, hardwareTier]);

  return {
    ...profile,
    preset: QUALITY_PRESETS[profile.tier] ?? QUALITY_PRESETS.high,
  };
}
