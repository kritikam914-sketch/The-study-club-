import type { AvatarId, CheerType, DayKey, ThemeId } from './types';

export const HOUR_SECONDS = 3600;
export const POINTS_PER_HOUR = 5;
export const MAX_ROOM_MEMBERS = 5;

export const DAYS_OF_WEEK: Array<{ key: DayKey; label: string; short: string }> = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
];

export const DAY_PALETTES: Record<DayKey, { headerBg: string; accent: string }> = {
  mon: { headerBg: '#FFF0F3', accent: '#FF5E7E' },
  tue: { headerBg: '#FFF3E8', accent: '#FF7A3D' },
  wed: { headerBg: '#FEF9E7', accent: '#D97706' },
  thu: { headerBg: '#ECFDF5', accent: '#10B981' },
  fri: { headerBg: '#EFF6FF', accent: '#3B82F6' },
  sat: { headerBg: '#F3EEFF', accent: '#8B5CF6' },
  sun: { headerBg: '#FDF2F8', accent: '#EC4899' },
  backlog: { headerBg: '#F5F3EF', accent: '#64748B' },
};

export const SUBJECT_OPTIONS = [
  'Mathematics',
  'Computer Science',
  'Literature',
  'Biology',
  'History',
  'Languages',
  'Design',
  'General',
];

export const SUBJECT_ACCENTS: Record<string, string> = {
  Mathematics: '#3B82F6',
  'Computer Science': '#FF5E7E',
  Literature: '#D97706',
  Biology: '#10B981',
  History: '#B45309',
  Languages: '#0891B2',
  Design: '#EC4899',
  General: '#64748B',
};

export const CARTOON_IMAGES = {
  studyDeskBanner: '/src/assets/images/cartoon_study_desk_banner_1794909306133.jpg',
  trophyOwl: '/src/assets/images/cartoon_trophy_owl_1794909305293.jpg',
  plannerBunny: '/src/assets/images/cartoon_planner_bunny_1794909305763.jpg',
  timerKitty: '/src/assets/images/cartoon_timer_kitty_1794909306680.jpg',
} as const;

export interface AvatarOption {
  id: AvatarId;
  label: string;
  tagline: string;
  image: string;
  tint: string;
}

export const AVATARS: AvatarOption[] = [
  {
    id: 'fox',
    label: 'Fox Scholar',
    tagline: 'Sharp notes & espresso',
    image: '/src/assets/images/avatar_fox_scholar_1794908297359.jpg',
    tint: '#FFF1EB',
  },
  {
    id: 'cat',
    label: 'Lo-Fi Cat',
    tagline: 'Headphones on, world off',
    image: '/src/assets/images/avatar_cat_coder_1794908297655.jpg',
    tint: '#EEF4FF',
  },
  {
    id: 'frog',
    label: 'Sprout Frog',
    tagline: 'Steady leaf-by-leaf pace',
    image: '/src/assets/images/avatar_frog_botanist_1794908297684.jpg',
    tint: '#ECFDF5',
  },
  {
    id: 'bear',
    label: 'Studio Bear',
    tagline: 'Cozy deep-work marathoner',
    image: '/src/assets/images/avatar_bear_artist_1794908298596.jpg',
    tint: '#FFFBEB',
  },
  {
    id: 'owl',
    label: 'Night Owl',
    tagline: 'Tea & late-night clarity',
    image: '/src/assets/images/avatar_owl_night_1794908299737.jpg',
    tint: '#F3F0FF',
  },
];

export function getAvatarOption(id: AvatarId): AvatarOption {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  cost: number;
  swatchPrimary: string;
  swatchSecondary: string;
  swatchCanvas: string;
}

export const STUDIO_THEMES: ThemeOption[] = [
  {
    id: 'tangerine',
    name: 'Peach Blossom',
    description: 'Warm pastel cream with rosy coral and bright sky blue accents.',
    cost: 0,
    swatchPrimary: '#FF5E7E',
    swatchSecondary: '#3B82F6',
    swatchCanvas: '#FFF9F5',
  },
  {
    id: 'lavender',
    name: 'Lavender Cloud',
    description: 'Soft lilac mist with violet ink and bubblegum pink highlights.',
    cost: 0,
    swatchPrimary: '#8B5CF6',
    swatchSecondary: '#EC4899',
    swatchCanvas: '#FAF7FF',
  },
  {
    id: 'matcha',
    name: 'Matcha Botanical',
    description: 'Calm mint-cream paper with emerald and sunny marigold.',
    cost: 5,
    swatchPrimary: '#10B981',
    swatchSecondary: '#F59E0B',
    swatchCanvas: '#F4FBF6',
  },
  {
    id: 'cobalt',
    name: 'Skyline Sorbet',
    description: 'Breezy sky blue paper with cobalt ink and strawberry rose.',
    cost: 10,
    swatchPrimary: '#2563EB',
    swatchSecondary: '#FF6B8B',
    swatchCanvas: '#F3F8FF',
  },
  {
    id: 'sunset',
    name: 'Apricot Sunset',
    description: 'Golden apricot linen with warm tangerine and amber tones.',
    cost: 15,
    swatchPrimary: '#FF6B35',
    swatchSecondary: '#F59E0B',
    swatchCanvas: '#FFF8F2',
  },
  {
    id: 'berry',
    name: 'Berry Mint',
    description: 'Sweet raspberry pink paired with refreshing seafoam teal.',
    cost: 20,
    swatchPrimary: '#EC4899',
    swatchSecondary: '#14B8A6',
    swatchCanvas: '#FFF6FA',
  },
];

export interface CollectibleBadge {
  id: string;
  name: string;
  description: string;
  cost: number;
}

export const COLLECTIBLE_BADGES: CollectibleBadge[] = [
  {
    id: 'first_hour',
    name: 'First 60-Minute Bell',
    description: 'Commemorates your very first +5 pt study hour.',
    cost: 5,
  },
  {
    id: 'study_club_pin',
    name: 'Five-Seat Club Pin',
    description: 'Honorary desk pin for multiplayer study buddies.',
    cost: 10,
  },
  {
    id: 'deep_focus_stamp',
    name: 'Deep Focus Wax Stamp',
    description: 'For scholars who stack multi-hour study streaks.',
    cost: 20,
  },
  {
    id: 'golden_owl_award',
    name: 'Dean of the Desk',
    description: 'Elite mastery stamp for 6+ hours of logged study.',
    cost: 30,
  },
];

export const CHEER_OPTIONS: Array<{ type: CheerType; label: string; short: string }> = [
  { type: 'highfive', label: 'High Five', short: 'High Five!' },
  { type: 'coffee', label: 'Coffee Boost', short: 'Coffee Boost' },
  { type: 'spark', label: 'Brain Spark', short: 'Sharp Focus!' },
  { type: 'clap', label: 'Applause', short: 'Keep Going!' },
];

export function getTodayDayKey(): DayKey {
  const jsDay = new Date().getDay();
  const map: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[jsDay] ?? 'mon';
}

export function formatDurationClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const mins = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
