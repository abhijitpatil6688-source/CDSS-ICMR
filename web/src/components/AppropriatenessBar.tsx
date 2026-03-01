import type { Appropriateness, RadiationLevel } from '../types/radiology'
import { clsx } from 'clsx'

const LABEL: Record<Appropriateness, string> = {
  usually_appropriate: 'Usually Appropriate',
  may_be_appropriate: 'May Be Appropriate',
  usually_not_appropriate: 'Usually Not Appropriate',
}

const APP_COLOR: Record<Appropriateness, string> = {
  usually_appropriate: 'bg-green-500',
  may_be_appropriate: 'bg-yellow-400',
  usually_not_appropriate: 'bg-red-500',
}

const APP_TEXT: Record<Appropriateness, string> = {
  usually_appropriate: 'text-green-700',
  may_be_appropriate: 'text-yellow-700',
  usually_not_appropriate: 'text-red-700',
}

const APP_BG: Record<Appropriateness, string> = {
  usually_appropriate: 'bg-green-50 border-green-200',
  may_be_appropriate: 'bg-yellow-50 border-yellow-200',
  usually_not_appropriate: 'bg-red-50 border-red-200',
}

const RL_LABEL: Record<RadiationLevel, string> = {
  none: 'No Radiation',
  minimal: 'Minimal (<0.1 mSv)',
  low: 'Low (0.1–1 mSv)',
  moderate: 'Moderate (1–10 mSv)',
  high: 'High (>10 mSv)',
}

const RL_COLOR: Record<RadiationLevel, string> = {
  none: 'text-green-700 bg-green-100',
  minimal: 'text-blue-700 bg-blue-100',
  low: 'text-blue-700 bg-blue-100',
  moderate: 'text-orange-700 bg-orange-100',
  high: 'text-red-700 bg-red-100',
}

interface Props {
  rating: number
  appropriateness: Appropriateness
  radiationLevel: RadiationLevel
}

export default function AppropriatenessBar({ rating, appropriateness, radiationLevel }: Props) {
  const barWidth = `${(rating / 9) * 100}%`

  return (
    <div className="space-y-2">
      {/* Rating bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-200 rounded-full h-2.5">
          <div
            className={clsx('h-2.5 rounded-full transition-all', APP_COLOR[appropriateness])}
            style={{ width: barWidth }}
          />
        </div>
        <span className={clsx('text-sm font-bold min-w-[2rem] text-right', APP_TEXT[appropriateness])}>
          {rating}/9
        </span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full border', APP_BG[appropriateness], APP_TEXT[appropriateness])}>
          {LABEL[appropriateness]}
        </span>
        <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full', RL_COLOR[radiationLevel])}>
          ☢ {RL_LABEL[radiationLevel]}
        </span>
      </div>
    </div>
  )
}
