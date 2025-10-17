// app/context/ThemeColorProvider.tsx
"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

interface ThemeValues {
  mainColor?: string; // Para acentos, botones, CTA, highlights
  secondaryColor?: string; // Para hover, detalles, pequeños acentos
  backgroundColor?: string; // Fondo general
  textColor?: string; // Texto general
  navbarColor?: string; // Color sticky navbar (sólido/translúcido)
  cardBackgroundColor?: string; // Fondo de cards
  contrastTextColor?: string; // Texto sobre navbar/card oscuros
  darkMode?: boolean;
}

export const ThemeColorContext = createContext<{
  themeValues: ThemeValues;
  setThemeValues: React.Dispatch<React.SetStateAction<ThemeValues>>;
}>({
  themeValues: {
    mainColor: "#2E2E2E", //navbar and buttons
    secondaryColor: "#2E2E2E", //first navbar icon and secondary button
    backgroundColor: "#F9FAFB", // background
    textColor: "#2E2E2E", // text and icons
    navbarColor: "#E5E8EBE6", // Color sticky navbar (sólido/translúcido)
    cardBackgroundColor: "#E5E8EB", // Fondo de cards
    contrastTextColor: "#E5E8EB", // Texto sobre navbar/card oscuros
    darkMode: false,
  },
  setThemeValues: () => {},
});

export function useThemeColor() {
  return useContext(ThemeColorContext);
}

export function ThemeColorProvider({
  initialTheme,
  children,
}: Readonly<{
  initialTheme: ThemeValues;
  children: ReactNode;
}>) {
  const [themeValues, setThemeValues] = useState<ThemeValues>(initialTheme);

  const contextValue = React.useMemo(
    () => ({ themeValues, setThemeValues }),
    [themeValues]
  );
  return (
    <ThemeColorContext.Provider value={contextValue}>
      <div
        style={
          {
            "--main-color": themeValues.mainColor,
            "--secondary-color": themeValues.secondaryColor,
            "--background-color": themeValues.backgroundColor,
            "--text-color": themeValues.textColor,
            "--navbar-color": themeValues.navbarColor,
            "--card-bg": themeValues.cardBackgroundColor,
            "--contrast-text": themeValues.contrastTextColor,

            /* 🔗 Mapeo a los tokens que Tailwind/shadcn usan */
            "--primary": themeValues.mainColor ?? "var(--color-primary)",
            "--primary-foreground": "white",
            "--secondary":
              themeValues.secondaryColor ?? "var(--color-primary-soft)",
            "--secondary-foreground": "var(--color-foreground)",
            "--background":
              themeValues.backgroundColor ?? "var(--color-background)",
            "--foreground": themeValues.textColor ?? "var(--color-foreground)",
            "--card": themeValues.cardBackgroundColor ?? "var(--color-surface)",
            "--card-foreground":
              themeValues.textColor ?? "var(--color-foreground)",
            "--muted": "var(--color-muted)",
            "--muted-foreground": "var(--color-muted-fg)",
            "--border": "var(--color-border)",
            "--ring": themeValues.mainColor ?? "var(--color-ring)",
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </ThemeColorContext.Provider>
  );
}
