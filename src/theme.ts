export const palette = {
  bg: '#030713',
  bg2: '#08142C',
  bg3: '#132447',
  panel: '#0F1C38',
  panel2: '#172B52',
  panel3: '#243B69',
  glass: '#0F1D3BEF',
  glassStrong: '#192D53F7',
  line: '#3F5F91',
  lineSoft: '#284776',
  text: '#FCFEFF',
  muted: '#CEDAF0',
  muted2: '#9CB1D3',
  cyan: '#2DE9FF',
  aqua: '#48F7C8',
  blue: '#6F91FF',
  sky: '#72D9FF',
  purple: '#B17CFF',
  violet: '#8566FF',
  pink: '#FF6FCB',
  magenta: '#FF55A9',
  green: '#48EBA1',
  mint: '#A0F8D9',
  orange: '#FFAF57',
  coral: '#FF7B71',
  red: '#FF5E7B',
  yellow: '#FFE66E',
  lime: '#D0F66C',
  white: '#FFFFFF',
  ink: '#061019',
  black: '#01030A',
};

export const radius = { sm: 16, md: 22, lg: 30, xl: 40, xxl: 52, pill: 999 };

export const type = {
  micro: 12,
  caption: 13,
  body: 15,
  bodyStrong: 16,
  cardTitle: 18,
  section: 22,
  title: 28,
  display: 35,
  hero: 40,
};

export const spacing = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 32, xxxl: 42 };

export const shadows = {
  soft: {
    shadowColor: '#00152C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 30,
    elevation: 10,
  },
  floating: {
    shadowColor: '#000A22',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.48,
    shadowRadius: 38,
    elevation: 14,
  },
};

export const spectrum = [palette.cyan, palette.purple, palette.pink, palette.orange, palette.green] as const;
