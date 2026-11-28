import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 22, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const HomeIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 10.5L12 4l8 6.5V20h-5v-6H9v6H4z" />
  </svg>
);
export const TradesIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base({ strokeWidth: 2.4, ...p })}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const PlaybookIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
    <path d="M5 17a3 3 0 0 1 3-3h11" />
  </svg>
);
export const StatsIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
export const LinkIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </svg>
);
export const SparkIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
    <path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </svg>
);
export const BackIcon = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base({ strokeWidth: 3, size: 14, ...p })}>
    <path d="M5 12l5 5L20 7" />
  </svg>
);
export const CrossIcon = (p: P) => (
  <svg {...base({ strokeWidth: 3, size: 14, ...p })}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const CameraIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="6" width="18" height="14" rx="3" />
    <circle cx="12" cy="13" r="3.5" />
    <path d="M8 6l1.5-2h5L16 6" />
  </svg>
);
export const MailIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
  </svg>
);
export const SettingsIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
