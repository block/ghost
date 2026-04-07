export interface ThemeColors {
  slate: string[];
  red: string[];
  blue: string[];
  green: string[];
  yellow: string[];
}

export interface ThemeResponse {
  colors: ThemeColors;
}

export interface ThemeVariables {
  [key: string]: string;
}

export interface ThemeContextType {
  theme: ThemeVariables;
  updateTheme: (prompt: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}
