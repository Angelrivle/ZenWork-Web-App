type IconProps = {
  size?: number;
};

function Svg({
  size,
  children,
}: {
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function ChecklistIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </Svg>
  );
}

export function KanbanIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="10" y="3" width="5" height="12" rx="1" />
      <rect x="17" y="3" width="5" height="8" rx="1" />
    </Svg>
  );
}

export function DocumentIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </Svg>
  );
}

export function BuildingIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h1M15 6h1M8 10h1M15 10h1M8 14h1M15 14h1" />
    </Svg>
  );
}

export function WebhookIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M18 8a6 6 0 0 0-6-6 6 6 0 0 0-6 6c0 2-1 3-2 4a6 6 0 0 0 6 10c3 0 5-2 6-4" />
      <path d="M12 8l3 6M12 8L9 14M12 8l-4 3M12 8l4 3" />
      <circle cx="12" cy="14" r="2" />
    </Svg>
  );
}

export function BellIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}

export function LayersIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 2l10 5-10 5L2 7z" />
      <path d="M2 12l10 5 10-5" />
      <path d="M2 17l10 5 10-5" />
    </Svg>
  );
}

export function DatabaseIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 5v14c0 2-4 3-9 3s-9-1-9-3V5" />
      <path d="M21 12c0 2-4 3-9 3s-9-1-9-3" />
    </Svg>
  );
}

export function ShieldIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

export function LockIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

export function KeyIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M21 2l-9.6 9.6" />
      <path d="M15.5 7.5l3 3L22 7l-3-3" />
    </Svg>
  );
}

export function BadgeCheckIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 2l3 3h4v4l3 3-3 3v4h-4l-3 3-3-3H5v-4l-3-3 3-3V5h4z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

export function ScrollIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a2 2 0 1 0-4 0v2" />
      <path d="M20 8h-9" />
    </Svg>
  );
}