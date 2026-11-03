import { Icon } from "./ui"

export type PeriodPreset = "all" | "month" | "30days" | "3months" | "year" | "custom"

export interface PeriodRange {
  start: string
  end: string
}

interface PeriodBarProps {
  preset: PeriodPreset
  start: string
  end: string
  range: PeriodRange
  count: number
  onPreset: (preset: PeriodPreset) => void
  onStart: (date: string) => void
  onEnd: (date: string) => void
}

export default function PeriodBar({
  preset,
  start,
  end,
  range,
  count,
  onPreset,
  onStart,
  onEnd,
}: PeriodBarProps) {
  const shortDate = (date: string) =>
    new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    }).format(new Date(`${date}T12:00:00`))

  return (
    <div className="period-bar">
      <div className="period-main">
        <span className="period-icon">
          <Icon name="plan" size={17} />
        </span>
        <label>
          <span>Período</span>
          <select
            value={preset}
            onChange={(event) => onPreset(event.target.value as PeriodPreset)}
          >
            <option value="all">Todo o período</option>
            <option value="month">Mês mais recente</option>
            <option value="30days">Últimos 30 dias</option>
            <option value="3months">Últimos 3 meses</option>
            <option value="year">Ano mais recente</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>
        <span className="period-summary">
          <strong>{count}</strong>
          <small>
            {shortDate(range.start)} – {shortDate(range.end)}
          </small>
        </span>
      </div>
      {preset === "custom" && (
        <div className="custom-period">
          <label>
            <span>Desde</span>
            <input
              type="date"
              value={start}
              max={end || undefined}
              onChange={(event) => onStart(event.target.value)}
            />
          </label>
          <label>
            <span>Até</span>
            <input
              type="date"
              value={end}
              min={start || undefined}
              onChange={(event) => onEnd(event.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  )
}
