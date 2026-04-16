import {
  Instagram,
  Music2,
  Youtube,
  Facebook,
  Twitter,
  Linkedin,
  Globe,
  type LucideIcon,
} from 'lucide-react';

export interface SocialPlatform {
  key: string;
  label: string;
  icon: LucideIcon;
  placeholder: string;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@...' },
  { key: 'apple_music', label: 'Apple Music', icon: Music2, placeholder: 'https://music.apple.com/artist/...' },
  { key: 'soundcloud', label: 'SoundCloud', icon: Music2, placeholder: 'https://soundcloud.com/...' },
  { key: 'bandcamp', label: 'Bandcamp', icon: Music2, placeholder: 'https://...bandcamp.com' },
  { key: 'twitter', label: 'X / Twitter', icon: Twitter, placeholder: 'https://x.com/...' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/...' },
  { key: 'threads', label: 'Threads', icon: Instagram, placeholder: 'https://threads.net/@...' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/...' },
  { key: 'website', label: 'Web / Otro', icon: Globe, placeholder: 'https://...' },
];

export const getSocialPlatform = (key: string): SocialPlatform =>
  SOCIAL_PLATFORMS.find((p) => p.key === key) ?? {
    key,
    label: key,
    icon: Globe,
    placeholder: 'https://...',
  };

export interface SocialLink {
  platform: string;
  url: string;
}
