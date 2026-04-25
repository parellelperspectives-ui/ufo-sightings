module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        monoCustom: [
          'SF Mono',
          'Monaco',
          'Cascadia Code',
          'Fira Code',
          'DejaVu Sans Mono',
          'Liberation Mono',
          'monospace'
        ],
      },
      keyframes: {
          loading: {
            '0%':   { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(100%)' },
          }
        },
        animation: {
          loading: 'loading 1.5s ease-in-out infinite',
      }
    },
  },
};