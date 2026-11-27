type Props = { size?: number; className?: string; title?: string };

/** OS Journal logo: a stack of green cash with white wings, on black. */
export function Logo({ size = 34, className, title }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="200" height="200" rx="44" fill="#000000"/><ellipse cx="104" cy="170" rx="46" ry="6" fill="#1E2633"/><g transform="translate(10 10) scale(0.9)"><g stroke="#13213D" strokeWidth="3.5" strokeLinejoin="round"><path d="M60 70 L80 100 L80 140 L60 110 Z" fill="#23864A"/><path d="M80 100 L160 88 L160 128 L80 140 Z" fill="#2FA65A"/><path d="M60 70 L140 58 L160 88 L80 100 Z" fill="#3CC46D"/></g><g stroke="#13213D" strokeWidth="1.6" strokeLinecap="round" fill="none"><path d="M80 105.7 L160 93.7 M80 111.4 L160 99.4 M80 117.1 L160 105.1 M80 122.8 L160 110.8 M80 128.5 L160 116.5 M80 134.2 L160 122.2 M60 75.7 L80 105.7 M60 81.4 L80 111.4 M60 87.1 L80 117.1 M60 92.8 L80 122.8 M60 98.5 L80 128.5 M60 104.2 L80 134.2"/></g><ellipse cx="88" cy="82" rx="9" ry="5.5" fill="#86E6AC" transform="rotate(-8 88 82)"/><ellipse cx="133" cy="75" rx="9" ry="5.5" fill="#86E6AC" transform="rotate(-8 133 75)"/><g stroke="#13213D" strokeWidth="3" strokeLinejoin="round"><path d="M93.6 65 L106.4 63 L126.4 93 L113.6 95 Z" fill="#F4F7FB"/><path d="M113.6 95 L126.4 93 L126.4 133 L113.6 135 Z" fill="#D5E2F0"/></g><g stroke="#13213D" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"><path d="M64 94 C50 78 30 72 10 80 C16 85 22 88 27 90 C18 92 12 97 12 101 C21 102 28 101 35 100 C30 104 30 109 33 112 C45 110 56 105 64 100 Z" fill="#FFFFFF"/><path d="M156 94 C168 78 186 70 198 76 C194 82 190 86 184 89 C192 90 197 95 197 99 C189 101 182 101 175 101 C180 105 180 110 177 113 C165 111 160 106 156 102 Z" fill="#FFFFFF"/></g><g fill="#CFE3F7"><path d="M35 104 C44 104 54 102 62 100 C56 105 45 109 35 110 Z"/><path d="M177 104 C170 104 163 103 158 101 C162 105 168 108 176 110 Z"/></g><g stroke="#13213D" strokeWidth="1.8" strokeLinecap="round" fill="none"><path d="M27 90 C38 90 50 92 60 96 M35 100 C44 99 54 99 62 99 M184 89 C174 89 164 92 158 96 M175 101 C168 100 162 100 157 99"/></g></g>
    </svg>
  );
}
