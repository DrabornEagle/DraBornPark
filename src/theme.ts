export const palette = {
  bg: '#030713',
  bg2: '#07132A',
  bg3: '#10264A',
  panel: '#0D1B36',
  panel2: '#15305A',
  panel3: '#204573',
  glass: '#0E1C39F2',
  glassStrong: '#17345FF7',
  line: '#4B6FA6',
  lineSoft: '#2C4F82',
  text: '#FCFEFF',
  muted: '#D2DEF2',
  muted2: '#9FB5D8',
  cyan: '#21E8FF',
  aqua: '#3DF4C3',
  blue: '#668CFF',
  sky: '#69D7FF',
  purple: '#B06EFF',
  violet: '#7D63FF',
  pink: '#FF67C7',
  magenta: '#FF4FA8',
  green: '#42E99B',
  mint: '#98F7D5',
  orange: '#FFAA4D',
  coral: '#FF756D',
  red: '#FF5876',
  yellow: '#FFE45F',
  lime: '#CEF45D',
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

// v0.4.4: kartlar renk, sınır ve yüzey hiyerarşisiyle ayrılır; arka glow/shadow kullanılmaz.
export const shadows = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

export const spectrum = [palette.cyan, palette.purple, palette.pink, palette.orange, palette.green] as const;
