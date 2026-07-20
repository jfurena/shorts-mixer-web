export interface SubtitleWord {
  text: string;
  start: number;
  end: number;
}

export interface HighlightClip {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  viralScore: number;
  category?: string;
  reason: string;
  transition: string;
  subtitles: SubtitleWord[];
  caption: string;
  hashtags: string[];
}

export interface VideoAnalysisResult {
  title: string;
  summary: string;
  topic: string;
  totalEstimatedClips: number;
  clips: HighlightClip[];
}

export type SubtitleStyle = 'tiktok' | 'youtube' | 'karaoke' | 'minimalist' | 'neon';

export type VideoRatio = '916' | '11' | '169';

export interface CustomizationSettings {
  subtitleStyle: SubtitleStyle;
  fontSize: number; // in pixels or Tailwind classes
  fontFamily: string; // font class / CSS name
  position: 'top' | 'center' | 'bottom';
  uppercase: boolean;
  highlightColor: string; // hex code
  primaryColor: string; // hex code
  transitionType: string;
  soundEffect: string;
}

export interface PresetStyle {
  id: SubtitleStyle;
  name: string;
  description: string;
  primaryColor: string;
  highlightColor: string;
  fontSize: number;
  fontFamily: string;
  uppercase: boolean;
  position: 'top' | 'center' | 'bottom';
}

export const PRESET_STYLES: PresetStyle[] = [
  {
    id: 'tiktok',
    name: 'TikTok Classic',
    description: 'Texto amarillo chillón, bordes gruesos negros y letras grandes.',
    primaryColor: '#FACC15', // yellow-400
    highlightColor: '#22D3EE', // cyan-400
    fontSize: 28,
    fontFamily: 'Impact, Arial Black, sans-serif',
    uppercase: true,
    position: 'bottom',
  },
  {
    id: 'youtube',
    name: 'Youtuber Pop',
    description: 'Fondo negro redondeado, texto verde y blanco de alto impacto.',
    primaryColor: '#FFFFFF',
    highlightColor: '#4ADE80', // green-400
    fontSize: 24,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    uppercase: true,
    position: 'bottom',
  },
  {
    id: 'karaoke',
    name: 'Karaoke Pro',
    description: 'La palabra actual resalta dinámicamente con color neón.',
    primaryColor: '#E2E8F0', // slate-200
    highlightColor: '#EC4899', // pink-500
    fontSize: 26,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    uppercase: false,
    position: 'bottom',
  },
  {
    id: 'minimalist',
    name: 'Elegant Minimal',
    description: 'Subtítulos limpios, refinados con tipografía sans-serif y sombra suave.',
    primaryColor: '#FFFFFF',
    highlightColor: '#F3F4F6',
    fontSize: 18,
    fontFamily: 'Inter, sans-serif',
    uppercase: false,
    position: 'bottom',
  },
  {
    id: 'neon',
    name: 'Cyberpunk Neon',
    description: 'Texto morado con sombra de luz de neón de alta tecnología.',
    primaryColor: '#A855F7', // purple-500
    highlightColor: '#F43F5E', // rose-500
    fontSize: 24,
    fontFamily: 'monospace',
    uppercase: true,
    position: 'center',
  }
];
