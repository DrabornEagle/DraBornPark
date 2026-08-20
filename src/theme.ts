export const palette = {
  bg: '#050816',
  bg2: '#0A1024',
  bg3: '#101A33',
  panel: '#111A31',
  panel2: '#172341',
  panel3: '#1D2B4D',
  glass: '#121D38E8',
  glassStrong: '#192747F2',
  line: '#31466F',
  lineSoft: '#22365D',
  text: '#FCFDFF',
  muted: '#C1CCE3',
  muted2: '#91A2C1',
  cyan: '#35E4FF',
  aqua: '#4FF4C8',
  blue: '#6C8CFF',
  sky: '#7BCBFF',
  purple: '#A67BFF',
  violet: '#7B61FF',
  pink: '#FF73C6',
  magenta: '#FF5DA2',
  green: '#4FE6A4',
  mint: '#9AF4D4',
  orange: '#FFAE5C',
  coral: '#FF7B72',
  red: '#FF637A',
  yellow: '#FFE06B',
  lime: '#C7F36A',
  white: '#FFFFFF',
  ink: '#071019',
  black: '#02040B',
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
    shadowColor: '#000716',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.30,
    shadowRadius: 26,
    elevation: 8,
  },
  floating: {
    shadowColor: '#00030D',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.38,
    shadowRadius: 34,
    elevation: 12,
  },
};

export const spectrum = [palette.cyan, palette.purple, palette.pink, palette.orange, palette.green] as const;
