import { useState, useRef, useEffect, useMemo, KeyboardEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Search, Stethoscope, Brain, Zap, ChevronDown, ChevronUp,
  AlertCircle, BookOpen, Loader2, X, Info, Lightbulb,
} from 'lucide-react'
import { clsx } from 'clsx'
import { radiologyApi } from '../services/api'
import type { BodySystem, RadiologyRequest, RadiologyResponse, GuidelineScenario } from '../types/radiology'
import RecommendationCard from '../components/RecommendationCard'

const SYSTEMS: { value: BodySystem; label: string; icon: string }[] = [
  { value: 'chest', label: 'Chest', icon: '🫁' },
  { value: 'abdomen', label: 'Abdomen', icon: '🫃' },
  { value: 'neuro', label: 'Neuro / Head', icon: '🧠' },
  { value: 'musculoskeletal', label: 'MSK / Spine', icon: '🦴' },
  { value: 'cardiovascular', label: 'Cardiac', icon: '❤️' },
  { value: 'urinary', label: 'Urinary', icon: '🫘' },
  { value: 'gynaecology', label: 'Gynaecology', icon: '🩺' },
]

const COMMON_COMORBIDITIES = [
  'Contrast allergy', 'Renal failure / CKD', 'Diabetes', 'Hypertension',
  'Pacemaker', 'Coagulopathy', 'Previous TB',
]

// Quick-fill example queries
const EXAMPLES = [
  { label: 'Pulmonary TB', symptoms: ['cough', 'haemoptysis', 'weight loss', 'night sweats'], diagnosis: 'pulmonary tuberculosis', system: 'chest' as BodySystem },
  { label: 'Appendicitis', symptoms: ['right iliac fossa pain', 'fever', 'nausea', 'rebound tenderness'], diagnosis: 'acute appendicitis', system: 'abdomen' as BodySystem },
  { label: 'Acute Stroke', symptoms: ['sudden facial droop', 'arm weakness', 'speech difficulty'], diagnosis: 'acute stroke', system: 'neuro' as BodySystem },
  { label: 'Knee Injury', symptoms: ['knee pain after injury', 'swelling', 'giving way'], diagnosis: 'acl tear', system: 'musculoskeletal' as BodySystem },
  { label: 'Chest Pain / ACS', symptoms: ['chest pain', 'chest tightness', 'radiation to arm', 'diaphoresis'], diagnosis: 'acute coronary syndrome', system: 'cardiovascular' as BodySystem },
  { label: 'Ectopic Pregnancy', symptoms: ['amenorrhoea', 'lower abdominal pain', 'vaginal bleeding', 'positive pregnancy test'], diagnosis: 'ectopic pregnancy', system: 'gynaecology' as BodySystem },
  { label: 'Renal Calculi', symptoms: ['loin to groin pain', 'haematuria', 'nausea', 'vomiting'], diagnosis: 'renal calculi', system: 'urinary' as BodySystem },
  { label: 'Aortic Dissection', symptoms: ['sudden tearing chest pain', 'back pain', 'asymmetric blood pressure'], diagnosis: 'aortic dissection', system: 'cardiovascular' as BodySystem },
]

// ─── Scenario result panel ────────────────────────────────────────────────────

function ScenarioPanel({ scenario, index }: { scenario: GuidelineScenario; index: number }) {
  const [open, setOpen] = useState(index === 0)
  const isLowConfidence = scenario.match_score < 0.1

  return (
    <div className={clsx(
      'bg-white rounded-2xl shadow-sm border overflow-hidden',
      isLowConfidence ? 'border-gray-200 opacity-80' : 'border-gray-200',
    )}>
      <button
        className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{scenario.id}</span>
            <span className={clsx(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              scenario.match_score >= 0.5 ? 'bg-green-100 text-green-700' :
              scenario.match_score >= 0.15 ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-500'
            )}>
              {scenario.match_score >= 0.5 ? 'Strong match' :
               scenario.match_score >= 0.15 ? 'Possible match' : 'Low confidence'}
              {' '}· {Math.round(scenario.match_score * 100)}%
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">{scenario.title}</h3>
        </div>
        {open
          ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="border-t border-gray-100 px-6 py-4 space-y-3">
          {isLowConfidence && (
            <div className="flex gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5">
              <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">Low confidence match — please verify the clinical scenario matches before acting on these recommendations.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {scenario.tags.map(tag => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>

          <div className="space-y-3">
            {scenario.recommendations.map((rec, i) => (
              <RecommendationCard key={rec.code} rec={rec} rank={i} />
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase">References</span>
            </div>
            <ul className="space-y-0.5">
              {scenario.references.map(ref => (
                <li key={ref} className="text-xs text-gray-500">• {ref}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tag input ────────────────────────────────────────────────────────────────

interface TagInputProps {
  label: string; placeholder: string
  tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void
  suggestions?: string[]
}

function TagInput({ label, placeholder, tags, onAdd, onRemove, suggestions = [] }: TagInputProps) {
  const [input, setInput] = useState('')
  const [showSug, setShowSug] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const filtered = input.length > 1
    ? suggestions.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)).slice(0, 6)
    : []

  const add = (v: string) => {
    const t = v.trim()
    if (t && !tags.includes(t)) onAdd(t)
    setInput(''); setShowSug(false); ref.current?.focus()
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) { e.preventDefault(); add(input) }
    if (e.key === 'Backspace' && !input && tags.length) onRemove(tags[tags.length - 1])
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div
        className="min-h-[2.5rem] px-3 py-2 border border-gray-300 rounded-lg flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white cursor-text"
        onClick={() => ref.current?.focus()}
      >
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-2 py-0.5 rounded-full">
            {tag}
            <button type="button" onClick={() => onRemove(tag)}><X className="w-3 h-3" /></button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[8rem]">
          <input
            ref={ref} value={input}
            onChange={e => { setInput(e.target.value); setShowSug(true) }}
            onKeyDown={handleKey}
            onBlur={() => setTimeout(() => setShowSug(false), 150)}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="w-full outline-none text-sm bg-transparent"
          />
          {showSug && filtered.length > 0 && (
            <div className="absolute z-10 top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {filtered.map(s => (
                <button key={s} type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-gray-700"
                  onMouseDown={() => add(s)}>{s}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1">Type and press Enter or comma to add each symptom</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RadiologyAdvisor() {
  const [mode, setMode] = useState<'structured' | 'freetext'>('structured')
  const [selectedSystem, setSelectedSystem] = useState<BodySystem | ''>('')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [diagnosis, setDiagnosis] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<'male' | 'female' | 'other' | ''>('')
  const [isPregnant, setIsPregnant] = useState(false)
  const [comorbidities, setComorbidities] = useState<string[]>([])
  const [result, setResult] = useState<RadiologyResponse | null>(null)
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)
  const [screatinine, setScreatinine] = useState('')
  const [crUnit, setCrUnit] = useState<'mgdl' | 'umol'>('mgdl')
  const clinicalInputRef = useRef<HTMLDivElement>(null)

  // CKD-EPI 2021 (race-free) eGFR
  const egfrResult = useMemo(() => {
    const scr = parseFloat(screatinine)
    const ageNum = parseInt(age)
    if (!scr || scr <= 0 || !ageNum || ageNum <= 0 || !sex || sex === 'other') return null
    const scrMgdl = crUnit === 'umol' ? scr / 88.4 : scr
    const isFemale = sex === 'female'
    const k = isFemale ? 0.7 : 0.9
    const a = isFemale ? -0.241 : -0.302
    const ratio = scrMgdl / k
    const val = Math.round(
      142 * Math.pow(Math.min(ratio, 1), a) * Math.pow(Math.max(ratio, 1), -1.2) *
      Math.pow(0.9938, ageNum) * (isFemale ? 1.012 : 1.0)
    )
    if (val >= 90)  return { val, stage: 'G1 — Normal',            ckd: 1 }
    if (val >= 60)  return { val, stage: 'G2 — Mildly decreased',  ckd: 2 }
    if (val >= 45)  return { val, stage: 'G3a — Mild–moderate',    ckd: 3 }
    if (val >= 30)  return { val, stage: 'G3b — Mod–severe',       ckd: 3 }
    if (val >= 15)  return { val, stage: 'G4 — Severely decreased',ckd: 4 }
    return            { val, stage: 'G5 — Kidney failure',         ckd: 5 }
  }, [screatinine, crUnit, age, sex])

  // Check if AI is available on mount
  useEffect(() => {
        radiologyApi.getHealth().then(d => setAiAvailable(d.ai_available)).catch(() => setAiAvailable(false))
  }, [])
  
  const { data: symptomsData } = useQuery({ queryKey: ['symptoms'], queryFn: radiologyApi.getSymptoms })
  const { data: conditionsData } = useQuery({ queryKey: ['conditions'], queryFn: radiologyApi.getConditions })

  const mutation = useMutation({
    mutationFn: (req: RadiologyRequest) => radiologyApi.recommend(req),
    onSuccess: data => setResult(data),
  })

  // Fill form with an example
  const fillExample = (ex: typeof EXAMPLES[0]) => {
    setSymptoms(ex.symptoms)
    setDiagnosis(ex.diagnosis)
    setSelectedSystem(ex.system)
    setMode('structured')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      body_system: selectedSystem || undefined,
      symptoms,
      suspected_diagnosis: diagnosis || undefined,
      clinical_notes: clinicalNotes || undefined,
      patient: {
        age: age ? parseInt(age) : undefined,
        sex: sex || undefined,
        is_pregnant: isPregnant,
        comorbidities,
      },
      use_ai_parsing: true,
    })
  }

  const reset = () => {
    setResult(null); setSymptoms([]); setDiagnosis(''); setClinicalNotes(''); mutation.reset()
  }

  const canSubmit = mode === 'structured'
    ? symptoms.length > 0 || diagnosis.trim().length > 0
    : clinicalNotes.trim().length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-tight">ICMR CDSS</h1>
            <p className="text-xs text-gray-500">Radiology Appropriateness Advisor</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
              ICMR + ACR Guidelines
            </span>
            {aiAvailable !== null && (
              <span className={clsx(
                'text-xs px-2.5 py-1 rounded-full font-medium',
                aiAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              )}>
                {aiAvailable ? '✦ AI On' : 'AI Off'}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {!result ? (
          /* ─── INPUT FORM ────────────────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* AI status banner */}
              {aiAvailable === false && mode === 'freetext' && (
                <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">AI mode running without Claude API key</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Keywords will be extracted from your notes automatically.
                      For best results add your <code className="bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> to <code className="bg-amber-100 px-1 rounded">backend/.env</code>
                    </p>
                  </div>
                </div>
              )}

              {/* Mode toggle */}
              <div className="bg-white rounded-2xl border border-gray-200 p-1 flex">
                {(['structured', 'freetext'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    className={clsx(
                      'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
                      mode === m ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900',
                    )}
                  >
                    {m === 'structured' ? <><Search className="w-4 h-4" />Structured Input</> : <><Brain className="w-4 h-4" />AI Free-text</>}
                  </button>
                ))}
              </div>

              {/* Quick examples */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-semibold text-gray-700">Quick examples — click to fill</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map(ex => (
                    <button key={ex.label} type="button" onClick={() => fillExample(ex)}
                      className="text-sm px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Body System */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h2 className="font-semibold text-gray-900 mb-1">Body System <span className="text-xs font-normal text-gray-400">(optional — narrows results)</span></h2>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {SYSTEMS.map(sys => (
                      <button key={sys.value} type="button"
                        onClick={() => {
                          setSelectedSystem(s => {
                            const next = s === sys.value ? '' : sys.value
                            if (next) setTimeout(() => clinicalInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
                            return next
                          })
                        }}
                        className={clsx(
                          'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-sm font-medium transition-all',
                          selectedSystem === sys.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                        )}
                      >
                        <span className="text-xl">{sys.icon}</span>
                        <span>{sys.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clinical Input */}
                <div ref={clinicalInputRef} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                  <h2 className="font-semibold text-gray-900">Clinical Information</h2>

                  {mode === 'structured' ? (
                    <>
                      <TagInput
                        label="Presenting Symptoms"
                        placeholder="e.g. cough, fever, weight loss — type & press Enter"
                        tags={symptoms}
                        onAdd={s => setSymptoms(p => [...p, s])}
                        onRemove={s => setSymptoms(p => p.filter(x => x !== s))}
                        suggestions={symptomsData?.symptoms ?? []}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Suspected Diagnosis / Working Diagnosis
                          <span className="text-xs font-normal text-gray-400 ml-2">Start typing for suggestions</span>
                        </label>
                        <input type="text" value={diagnosis}
                          onChange={e => setDiagnosis(e.target.value)}
                          placeholder="e.g. Pulmonary TB, Appendicitis, Acute Stroke, Renal Colic..."
                          list="conditions-list"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <datalist id="conditions-list">
                          {conditionsData?.conditions.map(c => <option key={c} value={c} />)}
                        </datalist>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Clinical Notes
                        <span className="text-xs font-normal text-blue-600 ml-2">
                          {aiAvailable ? 'Claude AI will extract structured information' : 'Keywords will be auto-extracted'}
                        </span>
                      </label>
                      <textarea value={clinicalNotes}
                        onChange={e => setClinicalNotes(e.target.value)}
                        rows={6}
                        placeholder="e.g. 45 year old male, 3 weeks cough with haemoptysis, evening fever and night sweats, weight loss of 5 kg, known contact with TB patient, sputum AFB pending..."
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button type="submit" disabled={mutation.isPending || !canSubmit}
                  className="w-full py-3.5 bg-blue-900 text-white rounded-xl font-semibold text-sm hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {mutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Analysing...</>
                    : <><Zap className="w-4 h-4" />Get Imaging Recommendations</>
                  }
                </button>

                {mutation.isError && (
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Could not reach the backend. Make sure it is running on port 8000.
                  </div>
                )}
              </form>
            </div>

            {/* Sidebar: Patient Context + eGFR */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 sticky top-20">
                <h2 className="font-semibold text-gray-900">Patient Context</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Age (years)</label>
                    <input type="number" value={age} onChange={e => setAge(e.target.value)}
                      placeholder="e.g. 35" min={0} max={120}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sex</label>
                    <select value={sex} onChange={e => setSex(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                      <option value="">—</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {sex === 'female' && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={isPregnant} onChange={e => setIsPregnant(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-gray-700">Pregnant / possibly pregnant</span>
                  </label>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Comorbidities / Flags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_COMORBIDITIES.map(c => (
                      <button key={c} type="button"
                        onClick={() => setComorbidities(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                        className={clsx(
                          'text-xs px-2.5 py-1 rounded-full border transition-all',
                          comorbidities.includes(c)
                            ? 'bg-red-100 border-red-300 text-red-700'
                            : 'bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-300',
                        )}
                      >
                        {comorbidities.includes(c) ? '✓ ' : ''}{c}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 leading-relaxed">
                  Patient context adjusts recommendations — avoids radiation in pregnancy, excludes contrast in renal failure.
                </p>
              </div>

              {/* eGFR Calculator */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🧪</span>
                  <h2 className="font-semibold text-gray-900 text-sm">eGFR Calculator</h2>
                  <span className="text-xs text-gray-400 ml-auto">CKD-EPI 2021</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Serum Creatinine</label>
                  <div className="flex gap-2">
                    <input
                      type="number" value={screatinine}
                      onChange={e => setScreatinine(e.target.value)}
                      placeholder={crUnit === 'mgdl' ? 'e.g. 1.2' : 'e.g. 106'}
                      min={0} step="0.01"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <select value={crUnit} onChange={e => setCrUnit(e.target.value as 'mgdl' | 'umol')}
                      className="px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                      <option value="mgdl">mg/dL</option>
                      <option value="umol">μmol/L</option>
                    </select>
                  </div>
                </div>

                {(!age || !sex || sex === 'other') ? (
                  <p className="text-xs text-gray-400 italic">Enter age & sex above to calculate eGFR.</p>
                ) : !screatinine ? (
                  <p className="text-xs text-gray-400 italic">Enter serum creatinine to calculate.</p>
                ) : egfrResult && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-end gap-1.5">
                      <span className={clsx(
                        'text-3xl font-bold tabular-nums',
                        egfrResult.ckd <= 2 ? 'text-green-600' :
                        egfrResult.ckd === 3 ? 'text-yellow-600' : 'text-red-600'
                      )}>{egfrResult.val}</span>
                      <span className="text-xs text-gray-500 pb-1">mL/min/1.73m²</span>
                    </div>

                    <span className={clsx(
                      'inline-block text-xs font-medium px-2.5 py-0.5 rounded-full',
                      egfrResult.ckd <= 2 ? 'bg-green-100 text-green-700' :
                      egfrResult.ckd === 3 ? 'bg-yellow-100 text-yellow-700' :
                      egfrResult.ckd === 4 ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    )}>{egfrResult.stage}</span>

                    {/* Contrast guidance */}
                    <div className={clsx(
                      'text-xs rounded-lg px-3 py-2.5 leading-snug',
                      egfrResult.val >= 60 ? 'bg-green-50 border border-green-100 text-green-800' :
                      egfrResult.val >= 45 ? 'bg-yellow-50 border border-yellow-100 text-yellow-800' :
                      egfrResult.val >= 30 ? 'bg-orange-50 border border-orange-100 text-orange-800' :
                      'bg-red-50 border border-red-100 text-red-800'
                    )}>
                      <span className="font-semibold block mb-0.5">Contrast Media Safety</span>
                      {egfrResult.val >= 60 && '✓ IV contrast safe at standard dose'}
                      {egfrResult.val >= 45 && egfrResult.val < 60 && '⚠ Caution — pre-hydrate, use low-osmolar agent, minimum dose'}
                      {egfrResult.val >= 30 && egfrResult.val < 45 && '⚠ High risk — avoid unless essential; nephrology consult; pre-hydrate'}
                      {egfrResult.val >= 15 && egfrResult.val < 30 && '✕ Very high risk — avoid iodinated contrast; consider MRI/USG'}
                      {egfrResult.val < 15 && '✕ Contraindicated — use non-contrast or MRI/USG alternatives'}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-400">Uses CKD-EPI 2021 race-free equation. Not a substitute for clinical judgement.</p>
              </div>
            </div>
          </div>
        ) : (
          /* ─── RESULTS ───────────────────────────────────────────────────── */
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Imaging Recommendations</h2>
                <p className="text-sm text-gray-500">
                  {result.matched_scenarios.length > 0
                    ? `${result.matched_scenarios.length} guideline scenario${result.matched_scenarios.length !== 1 ? 's' : ''} matched`
                    : 'No scenarios matched — try different symptoms or diagnosis'}
                </p>
              </div>
              <button onClick={reset}
                className="text-sm text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1">
                ← New query
              </button>
            </div>

            {/* No results help */}
            {result.matched_scenarios.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-3">
                <p className="text-gray-500 text-sm">No guideline scenarios matched your input.</p>
                <p className="text-gray-400 text-xs">Try using more specific symptoms or a recognised diagnosis name.</p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {EXAMPLES.map(ex => (
                    <button key={ex.label} onClick={() => { reset(); fillExample(ex) }}
                      className="text-sm px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
                      Try: {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insight */}
            {result.ai_insight && (
              <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4" />
                  <span className="text-sm font-semibold">AI Clinical Analysis</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-1">Claude</span>
                </div>
                <p className="text-sm text-blue-100 mb-3">{result.ai_insight.clinical_summary}</p>
                {result.ai_insight.red_flags.length > 0 && (
                  <div className="bg-red-500/30 rounded-lg px-4 py-3 mb-3">
                    <p className="text-xs font-semibold text-red-200 uppercase mb-1">Red Flags</p>
                    {result.ai_insight.red_flags.map(f => <p key={f} className="text-sm text-red-100">⚠ {f}</p>)}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {result.ai_insight.extracted_symptoms.map(s => (
                    <span key={s} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Patient notes */}
            {result.patient_specific_notes.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1.5">
                <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />Patient-Specific Adjustments
                </p>
                {result.patient_specific_notes.map((n, i) => (
                  <p key={i} className="text-sm text-amber-700">{n}</p>
                ))}
              </div>
            )}

            {/* Scenarios */}
            <div className="space-y-4">
              {result.matched_scenarios.map((sc, i) => (
                <ScenarioPanel key={sc.id} scenario={sc} index={i} />
              ))}
            </div>

            <p className="text-xs text-gray-400 text-center px-4">{result.disclaimer}</p>
          </div>
        )}
      </main>
    </div>
  )
}
