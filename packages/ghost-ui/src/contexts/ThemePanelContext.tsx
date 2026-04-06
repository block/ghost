"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ALL_THEMEABLE_KEYS,
  DEFAULT_COLORS_DARK,
  DEFAULT_COLORS_LIGHT,
  DEFAULT_SHADOWS_DARK,
  DEFAULT_SHADOWS_LIGHT,
} from "@/lib/theme-defaults";
import { PRESETS, type ThemePreset } from "@/lib/theme-presets";
import { useTheme as useNextTheme } from "@/lib/theme-provider";
import {
  generateCSSExport,
  scaleRadius,
  scaleShadows,
} from "@/lib/theme-utils";

const STORAGE_KEY = "ghost-ui-theme";

interface StoredTheme {
  presetId: string | null;
  overrides: Record<string, string>;
  radiusScale: number;
  shadowScale: number;
}

interface ThemePanelContextType {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  activePresetId: string | null;
  overrides: Record<string, string>;
  radiusScale: number;
  shadowScale: number;
  applyPreset: (id: string) => void;
  setVariable: (key: string, value: string) => void;
  setVariables: (vars: Record<string, string>) => void;
  setRadiusScale: (factor: number) => void;
  setShadowScale: (factor: number) => void;
  reset: () => void;
  exportCSS: () => string;
}

const ThemePanelContext = createContext<ThemePanelContextType | undefined>(
  undefined,
);

export function ThemePanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === "dark";

  const [isOpen, setOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(
    "default",
  );
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [radiusScale, setRadiusScaleState] = useState(50);
  const [shadowScale, setShadowScaleState] = useState(50);
  const [mounted, setMounted] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevKeysRef = useRef<Set<string>>(new Set());

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredTheme = JSON.parse(stored);
        setActivePresetId(data.presetId);
        setOverrides(data.overrides);
        setRadiusScaleState(data.radiusScale ?? 50);
        setShadowScaleState(data.shadowScale ?? 50);
      }
    } catch {
      // ignore corrupted data
    }
    setMounted(true);
  }, []);

  // Apply overrides to document whenever they change
  useEffect(() => {
    if (!mounted) return;

    const currentKeys = new Set(Object.keys(overrides));

    // Remove properties that were in previous overrides but not in current
    for (const key of prevKeysRef.current) {
      if (!currentKeys.has(key)) {
        document.documentElement.style.removeProperty(key);
      }
    }

    // Apply current overrides
    requestAnimationFrame(() => {
      for (const [key, value] of Object.entries(overrides)) {
        document.documentElement.style.setProperty(key, value);
      }
    });

    prevKeysRef.current = currentKeys;
  }, [overrides, mounted]);

  // Debounced save to localStorage
  useEffect(() => {
    if (!mounted) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const data: StoredTheme = {
        presetId: activePresetId,
        overrides,
        radiusScale,
        shadowScale,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, 300);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [overrides, activePresetId, radiusScale, shadowScale, mounted]);

  // Re-apply preset when dark/light mode toggles
  useEffect(() => {
    if (!mounted) return;
    if (!activePresetId || activePresetId === "default") return;

    const preset = PRESETS.find((p) => p.id === activePresetId);
    if (!preset) return;

    const modeVars = isDark ? preset.variables.dark : preset.variables.light;
    if (Object.keys(modeVars).length > 0) {
      setOverrides(modeVars);
    }
  }, [isDark, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = useCallback(
    (id: string) => {
      setActivePresetId(id);

      if (id === "default") {
        // Clear all overrides to restore CSS defaults
        setOverrides({});
        setRadiusScaleState(50);
        setShadowScaleState(50);
        return;
      }

      const preset = PRESETS.find((p) => p.id === id);
      if (!preset) return;

      const modeVars = isDark ? preset.variables.dark : preset.variables.light;
      setOverrides(modeVars);
      setRadiusScaleState(50);
      setShadowScaleState(50);
    },
    [isDark],
  );

  const setVariable = useCallback((key: string, value: string) => {
    setActivePresetId(null); // mark as custom
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setVariables = useCallback((vars: Record<string, string>) => {
    setActivePresetId(null);
    setOverrides((prev) => ({ ...prev, ...vars }));
  }, []);

  const setRadiusScale = useCallback((factor: number) => {
    setRadiusScaleState(factor);
    setActivePresetId(null);
    const radiusVars = scaleRadius(factor);
    setOverrides((prev) => ({ ...prev, ...radiusVars }));
  }, []);

  const setShadowScale = useCallback(
    (factor: number) => {
      setShadowScaleState(factor);
      setActivePresetId(null);
      const shadowVars = scaleShadows(factor, isDark);
      setOverrides((prev) => ({ ...prev, ...shadowVars }));
    },
    [isDark],
  );

  const reset = useCallback(() => {
    // Remove all overrides from document
    for (const key of ALL_THEMEABLE_KEYS) {
      document.documentElement.style.removeProperty(key);
    }
    // Also remove any current override keys not in ALL_THEMEABLE_KEYS
    for (const key of Object.keys(overrides)) {
      document.documentElement.style.removeProperty(key);
    }

    setOverrides({});
    setActivePresetId("default");
    setRadiusScaleState(50);
    setShadowScaleState(50);
    localStorage.removeItem(STORAGE_KEY);
  }, [overrides]);

  const exportCSS = useCallback(() => {
    return generateCSSExport(overrides);
  }, [overrides]);

  return (
    <ThemePanelContext.Provider
      value={{
        isOpen,
        setOpen,
        activePresetId,
        overrides,
        radiusScale,
        shadowScale,
        applyPreset,
        setVariable,
        setVariables,
        setRadiusScale,
        setShadowScale,
        reset,
        exportCSS,
      }}
    >
      {children}
    </ThemePanelContext.Provider>
  );
}

export function useThemePanel() {
  const context = useContext(ThemePanelContext);
  if (context === undefined) {
    throw new Error("useThemePanel must be used within a ThemePanelProvider");
  }
  return context;
}
