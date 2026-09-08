import type { SVGProps } from 'react';

/**
 * Inline SVG icon set.
 *
 * Inlined rather than pulled from an icon package for three reasons: no extra
 * dependency, no extra network request, and — relevant here — no third-party
 * script or sprite host to allow through the Content-Security-Policy.
 *
 * All icons share a 24x24 viewBox, `currentColor` strokes and `aria-hidden`,
 * because every one of them sits next to a real text label.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Все материалы включены — painter's palette. */
export function PaletteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3a9 9 0 1 0 0 18c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.1-4-7.6-9-7.6Z" />
      <circle cx="7.5" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="17.8" cy="11.6" r="1.1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** Профессиональные педагоги — brush. */
export function BrushIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.6 3.6 20.4 9.4a1.4 1.4 0 0 1 0 2L13 18.8a3 3 0 0 1-2.1.9H8.3" />
      <path d="M12.6 5.6 18.4 11.4" />
      <path d="M8.3 19.7c0-1.6-1.3-2.9-2.9-2.9-1 0-1.9.5-2.4 1.3.9 0 1.6.7 1.6 1.6 0 .5-.2.9-.5 1.2.5.3 1.1.5 1.7.5 1.4 0 2.5-1.1 2.5-1.7Z" />
    </Icon>
  );
}

/** Для начинающих и опытных — ascending steps. */
export function LevelsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 20h4v-5H3z" />
      <path d="M10 20h4V10h-4z" />
      <path d="M17 20h4V5h-4z" />
    </Icon>
  );
}

/** Небольшие группы — small cluster of people. */
export function GroupIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <circle cx="17.5" cy="9.5" r="2.2" />
      <path d="M16.2 15.2A4.6 4.6 0 0 1 21 19.7" />
    </Icon>
  );
}

/** Системная программа — structured checklist. */
export function ProgramIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8 8.5h8M8 12.5h8M8 16.5h5" />
    </Icon>
  );
}

/** Участие в выставках — framed picture on a wall. */
export function ExhibitionIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="4" width="17" height="13" rx="2" />
      <path d="M6.5 14 10 10.2l2.6 2.8 2.2-2.6L17.5 14" />
      <circle cx="9" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <path d="M12 17v3M9.5 20h5" />
    </Icon>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 3.5h2.2l1.5 3.7-1.8 1.4a11.5 11.5 0 0 0 5.2 5.2l1.4-1.8 3.7 1.5v2.2c0 1.2-1 2.2-2.2 2.1A16.2 16.2 0 0 1 4.4 5.7 2.1 2.1 0 0 1 6.5 3.5Z" />
    </Icon>
  );
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.24h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm0 18.16h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.1.81.83-3.02-.2-.31a8.16 8.16 0 0 1-1.25-4.35c0-4.55 3.7-8.25 8.26-8.25a8.25 8.25 0 0 1 0 16.45Zm4.52-6.16c-.25-.13-1.46-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.79.97-.14.16-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.44.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="m4.5 12.5 4.5 4.5L19.5 6.5" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2} {...props}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </Icon>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 13.6 9l5.5 1.6-5.5 1.6L12 17.7l-1.6-5.5L4.9 10.6 10.4 9 12 3.5Z" />
      <path d="M18.5 16.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

/** Maps the string keys used in `content/site.ts` to real components. */
export const ADVANTAGE_ICONS = {
  palette: PaletteIcon,
  teacher: BrushIcon,
  levels: LevelsIcon,
  group: GroupIcon,
  program: ProgramIcon,
  exhibition: ExhibitionIcon,
} as const;

export type AdvantageIconName = keyof typeof ADVANTAGE_ICONS;
