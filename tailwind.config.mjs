/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        cream: {
          50: '#FFFCF8',
          100: '#FAF7F2',
          200: '#F5F0EB',
          300: '#E8E0D8',
          400: '#D4C8BD',
        },
        ink: {
          DEFAULT: '#2C2420',
          light: '#7A706A',
          muted: '#A39A94',
        },
        clay: {
          DEFAULT: '#D4815B',
          light: '#E8A98B',
          dark: '#B8603A',
        },
        slate: {
          DEFAULT: '#4A6B8A',
          light: '#7A9BBA',
          dark: '#2D4A6E',
        },
      },
    },
  },
  plugins: [],
};
