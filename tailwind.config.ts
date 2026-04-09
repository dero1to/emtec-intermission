import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'video-cond': ['video-cond', 'sans-serif'],
        'din-2014': ['din-2014', 'sans-serif'],
        'ryo-gothic-plusn': ['ryo-gothic-plusn', 'sans-serif'],
        sen: ['Sen', 'sans-serif'],
        'noto-sans-jp': ['Noto Sans JP', 'sans-serif'],
      },
      colors: {
        'COLOR-TIMETABLE-Box': '#1297cc',
      },
      backgroundImage: {
        'COLOR-UPCOMING-SESSION-LABEL':
          'linear-gradient(to right, #fff000, #f97f23, #e5640c)',
      },
      animation: {
        'spin-slow': 'spin 60s linear infinite',
        // 'spin-slow-reverse': 'spin 60s linear infinite',
      },
    },
    fontSize: {
      xxs: ['11px', '16px'],
      semi: ['18px', '22px'],
      sm: ['20px', '24px'],
      base: ['24px', '30px'],
      lg: ['28px', '34px'],
      xl: ['32px', '38px'],
      '1.5xl': ['34px', '35px'],
      '2xl': ['36px', '44px'],
      '2.5xl': ['38px', '46px'],
      '3xl': ['40px', '48px'],
      '3.5xl': ['48px', '56px'],
      '4xl': ['60px', '68px'],
      '4.5xl': ['65px', '73px'],
      '5xl': ['80px', '88px'],
    },
  },
  plugins: [],
}
export default config
