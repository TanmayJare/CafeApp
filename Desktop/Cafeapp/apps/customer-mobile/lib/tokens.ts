/** Design tokens — CaféConnect customer app */

export const C = {
  espresso:    '#1C0F08',
  espressoDk:  '#0D0704',
  matcha:      '#3D6B4A',
  matchaLight: '#EAF2EC',
  matchaDk:    '#2A4D34',
  cream:       '#FBF6EE',
  surface:     '#F7F2EB',
  white:       '#FFFFFF',
  border:      '#E8E0D5',
  borderMd:    '#CFC5B8',
  ink:         '#1A1410',
  ink2:        '#4A3F38',
  ink3:        '#8A7D74',
  amberBg:     '#FEF3C7',
  amberText:   '#92400E',
  greenBg:     '#DCFCE7',
  greenText:   '#166534',
  redBg:       '#FEE2E2',
  redText:     '#991B1B',
  blueBg:      '#DBEAFE',
  blueText:    '#1E40AF',
} as const;

export const R = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  pill: 32,
} as const;

export const F = {
  serif:   'DMSerifDisplay_400Regular',
  sans:    'Inter_400Regular',
  sansMd:  'Inter_500Medium',
  sansSb:  'Inter_600SemiBold',
  mono:    'DMMono_400Regular',
  monoMd:  'DMMono_500Medium',
} as const;

export const S = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
} as const;
