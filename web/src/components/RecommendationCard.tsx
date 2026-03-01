import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, Info, MapPin } from 'lucide-react'
import { clsx } from 'clsx'
import type { ModalityRecommendation } from '../types/radiology'
import AppropriatenessBar from './AppropriatenessBar'

const BORDER_COLOR: Record<string, string> = {
  usually_appropriate: 'border-l-green-500',
  may_be_appropriate: 'border-l-yellow-400',
  usually_not_appropriate: 'border-l-red-400',
}

interface Props {
  rec: ModalityRecommendation
  rank: number
}

export default function RecommendationCard({ rec, rank }: Props) {
  const [expanded, setExpanded] = useState(rank === 0)

  return (
    <div
      className={clsx(
        'border border-gray-200 rounded-xl bg-white shadow-sm border-l-4 overflow-hidden',
        BORDER_COLOR[rec.appropriateness],
      )}
    >
      {/* Header */}
      <button
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-sm font-bold flex items-center justify-center">
          {rank + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{rec.modality}</p>
          <p className="text-xs text-gray-400 font-mono">{rec.code}</p>
        </div>
        <div className="flex-shrink-0 w-40">
          <AppropriatenessBar
            rating={rec.rating}
            appropriateness={rec.appropriateness}
            radiationLevel={rec.radiation_level}
          />
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">
          {/* Special notes / warnings */}
          {rec.special_notes && (
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{rec.special_notes}</p>
            </div>
          )}

          {/* Rationale */}
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Rationale</p>
              <p className="text-sm text-gray-700">{rec.rationale}</p>
            </div>
          </div>

          {/* India context */}
          <div className="flex gap-2">
            <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">India Context</p>
              <p className="text-sm text-gray-700">{rec.india_context}</p>
            </div>
          </div>

          {/* Radiation detail */}
          <div className="text-xs text-gray-500 flex gap-4">
            <span>Effective dose: <strong>{rec.radiation_msv_range}</strong></span>
          </div>

          {/* Contraindications */}
          {rec.contraindicated_if.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-red-700 uppercase mb-1">Contraindicated in</p>
              <ul className="list-disc list-inside space-y-0.5">
                {rec.contraindicated_if.map(c => (
                  <li key={c} className="text-sm text-red-700">{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
