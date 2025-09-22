/** @type {import('tailwindcss').Config} */
module.exports = {
  // Configura el modo oscuro para que se active con la clase 'dark'
  darkMode: 'class', 
  
  // Le dice a Tailwind en qué archivos debe buscar las clases
content: [
  './app/**/*.{js,ts,jsx,tsx,mdx}',
  './src/**/*.{js,ts,jsx,tsx,mdx}', // si usas src
  './components/**/*.{js,ts,jsx,tsx,mdx}'
],

  
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};