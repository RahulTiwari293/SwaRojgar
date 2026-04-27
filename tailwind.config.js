/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', '"Inter"', 'ui-sans-serif', 'system-ui'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular'],
        display: ['"Plus Jakarta Sans"', '"Inter"', 'ui-sans-serif'],
        body:    ['"Plus Jakarta Sans"', 'Poppins'],
      },
      colors: {
        background:  'var(--background)',
        foreground:  'var(--foreground)',
        surface:     'var(--surface)',
        'surface-2': 'var(--surface-2)',
        hairline:    'var(--hairline)',
        primary: {
          DEFAULT:    'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        muted: {
          DEFAULT:    'var(--surface-2)',
          foreground: 'var(--muted-foreground)',
        },
        success:     'var(--success)',
        warning:     'var(--warning)',
        destructive: 'var(--destructive)',
        info:        'var(--info)',
        accent:      'var(--accent)',
      },
      boxShadow: {
        glow:   'var(--shadow-glow)',
        card:   'var(--shadow-card)',
        soft:   'var(--shadow-soft)',
        island: 'var(--shadow-island)',
      },
    },
  },
  plugins: [],
};
