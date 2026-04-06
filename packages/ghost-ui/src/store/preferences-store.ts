import { create } from "zustand";
import { persist } from "zustand/middleware";

const PREFERENCES_STORAGE_KEY = "preferences-storage";

type TailwindVersion = "3" | "4";
type ColorFormat = "oklch" | "hsl" | "rgb" | "hex";
type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

type PreferencesState = {
  modesInSync: boolean;
  tailwindVersion: TailwindVersion;
  colorFormat: ColorFormat;
  showFontVars: boolean;
  showShadowsVars: boolean;

  packageManager: PackageManager;
  showTooltips: boolean;
};

type PreferencesStore = PreferencesState & {
  actions: () => {
    setModesInSync: (modesInSync: boolean) => void;
    setTailwindVersion: (tailwindVersion: TailwindVersion) => void;
    setColorFormat: (colorFormat: ColorFormat) => void;
    setShowFontVars: (showFontVars: boolean) => void;
    setShowShadowsVars: (showShadowsVars: boolean) => void;

    setPackageManager: (packageManager: PackageManager) => void;
    setShowTooltips: (showTooltips: boolean) => void;

    resetSettings: () => void;
  };
};

export const initialPreferencesState: PreferencesState = {
  modesInSync: false,
  tailwindVersion: "4",
  colorFormat: "oklch",
  showFontVars: false,
  showShadowsVars: true,
  packageManager: "pnpm",
  showTooltips: true,
};

const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      modesInSync: initialPreferencesState.modesInSync,
      tailwindVersion: initialPreferencesState.tailwindVersion,
      colorFormat: initialPreferencesState.colorFormat,
      showFontVars: initialPreferencesState.showFontVars,
      showShadowsVars: initialPreferencesState.showShadowsVars,

      packageManager: initialPreferencesState.packageManager,
      showTooltips: initialPreferencesState.showTooltips,

      // Actions had to be a function to avoid storing these in local storage
      // every property gets persisted in local storage, functions are not.
      actions: () => ({
        setModesInSync: (modesInSync: boolean) => set({ modesInSync }),
        setTailwindVersion: (tailwindVersion: TailwindVersion) => {
          if (!tailwindVersion) return;
          set({ tailwindVersion });
        },
        setColorFormat: (colorFormat: ColorFormat) => {
          if (!colorFormat) return;
          set({ colorFormat });
        },
        setShowFontVars: (showFontVars: boolean) => set({ showFontVars }),
        setShowShadowsVars: (showShadowsVars: boolean) =>
          set({ showShadowsVars }),

        setPackageManager: (packageManager: PackageManager) => {
          if (!packageManager) return;
          set({ packageManager });
        },
        setShowTooltips: (showTooltips: boolean) => set({ showTooltips }),

        resetSettings: () => set(initialPreferencesState),
      }),
    }),
    { name: PREFERENCES_STORAGE_KEY },
  ),
);

export const useModesInSync = () =>
  usePreferencesStore((state) => state.modesInSync);

export const useColorFormat = () =>
  usePreferencesStore((state) => state.colorFormat);

export const useTailwindVersion = () =>
  usePreferencesStore((state) => state.tailwindVersion);

export const useFontVars = () =>
  usePreferencesStore((state) => state.showFontVars);

export const useShadowVars = () =>
  usePreferencesStore((state) => state.showShadowsVars);

export const usePackageManager = () =>
  usePreferencesStore((state) => state.packageManager);

export const useShowTooltips = () =>
  usePreferencesStore((state) => state.showTooltips);

export const usePreferencesActions = () => {
  return usePreferencesStore((state) => state.actions)();
};
