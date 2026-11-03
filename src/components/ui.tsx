import type { ReactNode } from "react"

type IconName = "home" | "activity" | "plan" | "wallet" | "user" | "plus" | "bell" | "search" | "chevron" | "sun" | "moon" | "close" | "edit" | "trash" | "sparkle" | "eye" | "check" | "more" | "upload" | "download" | "chart" | "target" | "file"

const paths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M3 11 12 3l9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  activity: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="10" cy="18" r="2" />
    </>
  ),
  plan: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 15v-3M12 15V8M16 15v-5" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7a3 3 0 0 1 3-3h11v16H6a2 2 0 0 1-2-2Z" />
      <path d="M4 8h14M14 13h4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </>
  ),
  moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  edit: (
    <>
      <path d="m14 5 5 5L9 20H4v-5Z" />
      <path d="m12 7 5 5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" />
    </>
  ),
  sparkle: (
    <>
      <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4Z" />
      <path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8Z" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M5 14v5h14v-5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="m15 9 5-5M16 4h4v4" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
}

interface IconProps {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-mark">
        <i />
        <i />
      </span>
      {!compact && <span>Entre</span>}
    </div>
  )
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost"
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Progress({
  value,
  tone = "green",
}: {
  value: number
  tone?: "green" | "amber" | "red"
}) {
  return (
    <div className="progress">
      <span
        className={`progress-fill ${tone}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

export function AvatarPair() {
  return (
    <div className="avatar-pair">
      <span className="avatar avatar-m">M</span>
      <span className="avatar avatar-s">S</span>
    </div>
  )
}

export function EmptyState({
  title,
  detail,
}: {
  title: string
  detail: string
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="search" />
      </span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}

const categoryIcons: Record<string, string> = {
  "Alimentação individual": "fi-rr-utensils",
  "Alimentação conjunto": "fi-rr-shopping-basket",
  "Lazer (música/desporto)": "fi-rr-gamepad",
  "Viagens individual": "fi-rr-car-side",
  "Viagens conjunto": "fi-rr-bus",
  "Saídas individual": "fi-rr-restaurant",
  "Saídas conjunto": "fi-rr-utensils",
  "Prendas (natal/aniv)": "fi-rr-gift",
  "Despesas família": "fi-rr-users-alt",
  Rendimentos: "fi-rr-money-bill-wave",
  Supermercado: "fi-rr-shopping-basket",
  Alimentação: "fi-rr-utensils",
  Restaurantes: "fi-rr-restaurant",
  Habitação: "fi-rr-house-chimney",
  Transportes: "fi-rr-car-side",
  Combustível: "fi-rr-gas-pump",
  Saúde: "fi-rr-heart",
  Compras: "fi-rr-shopping-bag",
  Lazer: "fi-rr-film",
  Subscrições: "fi-rr-receipt",
  Seguros: "fi-rr-shield",
  Educação: "fi-rr-graduation-cap",
  Salário: "fi-rr-money-bill-wave",
  Poupança: "fi-rr-piggy-bank",
  Transferência: "fi-rr-money-check",
  Outros: "fi-rr-interrogation",
}

export function CategoryIcon({
  category,
  className = "",
}: {
  category: string
  className?: string
}) {
  return (
    <i
      className={`category-glyph ${categoryIcons[category] || categoryIcons.Outros} ${className}`}
      aria-hidden="true"
    />
  )
}
