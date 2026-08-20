export const palette = {
  bg: '#040714',
  bg2: '#091128',
  bg3: '#101D3A',
  panel: '#101B36',
  panel2: '#17284B',
  panel3: '#21355F',
  glass: '#101C3BEA',
  glassStrong: '#17284CF5',
  line: '#35527F',
  lineSoft: '#223C68',
  text: '#FCFDFF',
  muted: '#C7D4EA',
  muted2: '#91A7C9',
  cyan: '#36E8FF',
  aqua: '#55F6CC',
  blue: '#6D8FFF',
  sky: '#78D5FF',
  purple: '#AC7FFF',
  violet: '#8067FF',
  pink: '#FF74CC',
  magenta: '#FF5CAA',
  green: '#50E9A5',
  mint: '#9EF7D7',
  orange: '#FFB25F',
  coral: '#FF7C74',
  red: '#FF647C',
  yellow: '#FFE36F',
  lime: '#CBF46E',
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
    shadowColor: '#000716',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.34,
    shadowRadius: 28,
    elevation: 9,
  },
  floating: {
    shadowColor: '#00030D',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.42,
    shadowRadius: 36,
    elevation: 13,
  },
};

export const spectrum = [palette.cyan, palette.purple, palette.pink, palette.orange, palette.green] as const;
