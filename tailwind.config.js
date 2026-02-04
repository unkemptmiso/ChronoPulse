/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
        "./supabase/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: 'var(--bg-color)',
                surface: 'var(--surface-color)',
                surfaceHighlight: 'var(--surface-highlight)',
                textMain: 'var(--text-main)',
                textMuted: 'var(--text-muted)',
                border: 'var(--border-color)',
                danger: '#ef4444',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                'glow': '0 0 20px rgba(var(--glow-color), 0.15)',
                'glow-active': '0 0 30px rgba(var(--glow-color), 0.25)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [],
}
