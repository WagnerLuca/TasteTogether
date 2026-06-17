/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        wine: {
          50: '#fdf2f4',
          100: '#fce7eb',
          600: '#b91c5c',
          700: '#9d174d',
          800: '#831843',
          900: '#500724',
        },
      },
    },
  },
  plugins: [],
};
