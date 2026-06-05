import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

function current(): Theme {
  if (typeof document === 'undefined') return 'light';
  return (document.documentElement.dataset.theme as Theme) || 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(current());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('missionos.theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(next)}
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
