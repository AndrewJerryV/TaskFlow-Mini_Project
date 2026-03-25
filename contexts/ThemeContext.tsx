'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'Light' | 'Dark' | 'System';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    isDark: boolean;
    reduceMotion: boolean;
    setReduceMotion: (reduce: boolean) => void;
    highContrast: boolean;
    setHighContrast: (contrast: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('Light');
    const [isDark, setIsDark] = useState(false);
    const [reduceMotion, setReduceMotionState] = useState(false);
    const [highContrast, setHighContrastState] = useState(false);

    // Load theme and accessibility settings from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme) {
            setThemeState(savedTheme);
        }

        const savedReduceMotion = localStorage.getItem('reduceMotion') === 'true';
        setReduceMotionState(savedReduceMotion);

        const savedHighContrast = localStorage.getItem('highContrast') === 'true';
        setHighContrastState(savedHighContrast);
    }, []);

    useEffect(() => {
        let dark = false;

        if (theme === 'Dark') {
            dark = true;
        } else if (theme === 'System') {
            dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        setIsDark(dark);

        if (dark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        if (reduceMotion) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
        localStorage.setItem('reduceMotion', String(reduceMotion));
    }, [reduceMotion]);

    useEffect(() => {
        if (highContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
        localStorage.setItem('highContrast', String(highContrast));
    }, [highContrast]);

    useEffect(() => {
        if (theme !== 'System') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            setIsDark(e.matches);
            if (e.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const setReduceMotion = (reduce: boolean) => {
        setReduceMotionState(reduce);
    };

    const setHighContrast = (contrast: boolean) => {
        setHighContrastState(contrast);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isDark, reduceMotion, setReduceMotion, highContrast, setHighContrast }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
