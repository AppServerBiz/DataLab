/**
 * Nautilus Quant Design System - Core Tokens & Types
 */

export const NAUTILUS_TOKENS = {
  colors: {
    bgMain: '#0B0E14',
    bgCard: '#181C25',
    bgCardHover: '#1E232F',
    bgSurface: '#121620',
    bgToolbar: '#13171F',
    
    textMain: '#E2E8F0',
    textMuted: '#64748B',
    textHeading: '#FFFFFF',
    textInverse: '#000000',
    
    accentBlue: '#38BDF8',
    accentBlueHover: '#7DD3FC',
    accentGreen: '#22C55E',
    accentGreenSoft: 'rgba(34, 197, 94, 0.15)',
    accentRed: '#EF4444',
    accentRedSoft: 'rgba(239, 68, 68, 0.15)',
    accentWarning: '#F59E0B',
    accentPurple: '#A855F7',
    
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderMedium: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.15)'
  },
  
  fonts: {
    main: "'JetBrains Mono', monospace",
    header: "'Michroma', sans-serif"
  },
  
  palette: [
    '#38BDF8', '#22C55E', '#F59E0B', '#EF4444', '#A855F7', 
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#0EA5E9', '#10B981', '#D946EF', '#F43F5E', '#8B5CF6'
  ]
} as const;

export type NautilusTokens = typeof NAUTILUS_TOKENS;
