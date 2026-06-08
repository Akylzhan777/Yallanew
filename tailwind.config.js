/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'sofia-pro': ['sofia-pro', 'Sofia Pro', 'Sofia', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
