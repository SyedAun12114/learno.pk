//OLD CODE

// /** @type {import('tailwindcss').Config} */
// export default {
//   content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
//   theme: {
//     extend: {
//       colors: {
//         background: '#F7F5F0',
//         surface: '#EEEAE2',
//         card: '#FFFFFF',
//         border: '#DDD8CE',
//         muted: '#6F6B63',
//         primary: '#151515',
//         accent: '#C8FF4D',
//       },
//       fontFamily: {
//         sans: ['Onest', 'Inter', 'system-ui', 'sans-serif'],
//       },
//       animation: {
//         'fade-in': 'fadeIn 0.2s ease-in-out',
//         'slide-up': 'slideUp 0.3s ease-out',
//       },
//       keyframes: {
//         fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
//         slideUp: {
//           '0%': { opacity: '0', transform: 'translateY(10px)' },
//           '100%': { opacity: '1', transform: 'translateY(0)' },
//         },
//       },
//     },
//   },
//   plugins: [],
// };





//NEW CODE:
export default {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F7F5F0',
        surface: '#EEEAE2',
        card: '#FFFFFF',
        border: '#DDD8CE',
        muted: '#6F6B63',
        primary: '#151515',
        accent: '#C8FF4D',
      },
      fontFamily: {
        sans: ['Onest', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};