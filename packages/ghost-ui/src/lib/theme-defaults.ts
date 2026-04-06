// Resolved default CSS variable values from main.css
// These are concrete values (not var() references) so setProperty/removeProperty works correctly.

export const DEFAULT_COLORS_LIGHT: Record<string, string> = {
  "--background-accent": "#1a1a1a",
  "--border-accent": "#1a1a1a",
  "--text-accent": "#1a1a1a",
  "--background-default": "#ffffff",
  "--background-alt": "#f5f5f5",
  "--background-medium": "#cccccc",
  "--background-muted": "#f0f0f0",
  "--background-inverse": "#000000",
  "--background-danger": "#f94b4b",
  "--background-success": "#91cb80",
  "--background-info": "#5c98f9",
  "--background-warning": "#fbcd44",
  "--border-default": "#e8e8e8",
  "--border-input": "#e5e5e5",
  "--border-input-hover": "#cccccc",
  "--border-strong": "#1a1a1a",
  "--border-card": "#e8e8e8",
  "--border-inverse": "#000000",
  "--border-danger": "#f94b4b",
  "--border-success": "#91cb80",
  "--border-warning": "#fbcd44",
  "--border-info": "#5c98f9",
  "--text-default": "#1a1a1a",
  "--text-muted": "#999999",
  "--text-alt": "#666666",
  "--text-inverse": "#ffffff",
  "--text-danger": "#f94b4b",
  "--text-success": "#91cb80",
  "--text-warning": "#fbcd44",
  "--text-info": "#5c98f9",
  "--chart-1": "#f6b44a",
  "--chart-2": "#7585ff",
  "--chart-3": "#d76a6a",
  "--chart-4": "#d185e0",
  "--chart-5": "#91cb80",
};

export const DEFAULT_COLORS_DARK: Record<string, string> = {
  "--background-accent": "#ffffff",
  "--border-accent": "#ffffff",
  "--text-accent": "#ffffff",
  "--background-default": "#000000",
  "--background-alt": "#232323",
  "--background-medium": "#333333",
  "--background-muted": "#232323",
  "--background-inverse": "#ffffff",
  "--background-danger": "#ff6b6b",
  "--background-success": "#a3d795",
  "--background-info": "#7cacff",
  "--background-warning": "#ffd966",
  "--border-default": "#333333",
  "--border-input": "#333333",
  "--border-input-hover": "#666666",
  "--border-strong": "#ffffff",
  "--border-card": "#333333",
  "--border-inverse": "#ffffff",
  "--border-danger": "#f94b4b",
  "--border-success": "#91cb80",
  "--border-warning": "#fbcd44",
  "--border-info": "#5c98f9",
  "--text-default": "#ffffff",
  "--text-muted": "#999999",
  "--text-alt": "#999999",
  "--text-inverse": "#000000",
  "--text-danger": "#ff6b6b",
  "--text-success": "#a3d795",
  "--text-warning": "#ffd966",
  "--text-info": "#7cacff",
  "--chart-1": "#f6b44a",
  "--chart-2": "#7585ff",
  "--chart-3": "#d76a6a",
  "--chart-4": "#d185e0",
  "--chart-5": "#91cb80",
};

export const DEFAULT_RADIUS: Record<string, string> = {
  "--radius": "20px",
  "--radius-pill": "999px",
  "--radius-button": "999px",
  "--radius-input": "999px",
  "--radius-card": "20px",
  "--radius-card-lg": "24px",
  "--radius-card-sm": "14px",
  "--radius-dropdown": "10px",
  "--radius-modal": "16px",
};

// Default radius values in px for scaling interpolation
export const DEFAULT_RADIUS_PX: Record<string, number> = {
  "--radius": 20,
  "--radius-pill": 999,
  "--radius-button": 999,
  "--radius-input": 999,
  "--radius-card": 20,
  "--radius-card-lg": 24,
  "--radius-card-sm": 14,
  "--radius-dropdown": 10,
  "--radius-modal": 16,
};

export const DEFAULT_SHADOWS_LIGHT: Record<string, string> = {
  "--shadow-mini": "0 2px 8px rgba(76, 76, 76, 0.15)",
  "--shadow-mini-inset": "0 1px 4px rgba(76, 76, 76, 0.1) inset",
  "--shadow-btn": "0 2px 8px rgba(76, 76, 76, 0.15)",
  "--shadow-card": "0 2px 8px rgba(76, 76, 76, 0.15)",
  "--shadow-elevated": "0 3px 12px rgba(76, 76, 76, 0.22)",
  "--shadow-popover": "0 8px 30px rgba(0, 0, 0, 0.12)",
  "--shadow-modal": "0 20px 60px rgba(0, 0, 0, 0.2)",
  "--shadow-kbd": "0 2px 8px rgba(76, 76, 76, 0.15)",
  "--shadow-date-field-focus": "0 0 0 3px rgba(26, 26, 26, 0.15)",
};

export const DEFAULT_SHADOWS_DARK: Record<string, string> = {
  "--shadow-mini": "0 2px 8px rgba(0, 0, 0, 0.4)",
  "--shadow-mini-inset": "0 1px 4px rgba(0, 0, 0, 0.5) inset",
  "--shadow-btn": "0 2px 8px rgba(0, 0, 0, 0.3)",
  "--shadow-card": "0 2px 8px rgba(0, 0, 0, 0.4)",
  "--shadow-elevated": "0 3px 12px rgba(0, 0, 0, 0.5)",
  "--shadow-popover": "0 8px 30px rgba(0, 0, 0, 0.4)",
  "--shadow-modal": "0 20px 60px rgba(0, 0, 0, 0.6)",
  "--shadow-kbd": "0 2px 8px rgba(0, 0, 0, 0.4)",
  "--shadow-date-field-focus": "0 0 0 3px rgba(244, 244, 245, 0.1)",
};

// Default shadow alpha values for scaling (light mode baselines)
export const DEFAULT_SHADOW_ALPHAS_LIGHT: Record<string, number> = {
  "--shadow-mini": 0.15,
  "--shadow-mini-inset": 0.1,
  "--shadow-btn": 0.15,
  "--shadow-card": 0.15,
  "--shadow-elevated": 0.22,
  "--shadow-popover": 0.12,
  "--shadow-modal": 0.2,
  "--shadow-kbd": 0.15,
  "--shadow-date-field-focus": 0.15,
};

export const DEFAULT_SHADOW_ALPHAS_DARK: Record<string, number> = {
  "--shadow-mini": 0.4,
  "--shadow-mini-inset": 0.5,
  "--shadow-btn": 0.3,
  "--shadow-card": 0.4,
  "--shadow-elevated": 0.5,
  "--shadow-popover": 0.4,
  "--shadow-modal": 0.6,
  "--shadow-kbd": 0.4,
  "--shadow-date-field-focus": 0.1,
};

// All variables that the theme panel can override
export const ALL_THEMEABLE_KEYS = [
  ...Object.keys(DEFAULT_COLORS_LIGHT),
  ...Object.keys(DEFAULT_RADIUS),
  ...Object.keys(DEFAULT_SHADOWS_LIGHT),
];
