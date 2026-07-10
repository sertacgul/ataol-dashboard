import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { api } from '../../lib/api'

const STORAGE_KEY = 'askdesk_simulator_v2'

const SCENARIO_KEYS = ['iyimser', 'gercekci', 'kotumser']
const SCENARIO_LABELS = { iyimser: 'Iyimser', gercekci: 'Gercekci', kotumser: 'Kotumser' }

const DEFAULT_INPUTS = {
  projeSayisi: 0,
  projeGelir: 0,
  saasUye: 0,
  aylikUcret: 0,
  egitimSinif: 0,
  sinifGelir: 0,
  danismanlikSaat: 0,
  saatlikUcret: 0,
  whiteLabelSayisi: 0,
  lisansUcret: 0,
  digerGelir: 0,
  altyapi: 0,
  apiGider: 0,
  pazarlama: 0,
  calisanSayisi: 0,
  ortMaas: 0,
  ofisKira: 0,
  hukuk: 0,
  digerGider: 0,
  cac: 0,
  ltv: 0,
  churnRate: 5,
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // ignore
  }
  return {
    iyimser: { ...DEFAULT_INPUTS },
    gercekci: { ...DEFAULT_INPUTS },
    kotumser: { ...DEFAULT_INPUTS },
  }
}

function calcMetrics(s) {
  const mrr = s.saasUye * s.aylikUcret
  const arr = mrr * 12
  const yillikGelir =
    (s.projeSayisi * s.projeGelir) +
    arr +
    (s.egitimSinif * s.sinifGelir) +
    (s.danismanlikSaat * s.saatlikUcret * 12) +
    (s.whiteLabelSayisi * s.lisansUcret * 12) +
    s.digerGelir

  const yillikGider =
    (s.altyapi + s.apiGider + s.pazarlama + s.ofisKira + s.hukuk + s.digerGider) * 12 +
    (s.calisanSayisi * s.ortMaas * 12)

  const netKar = yillikGelir - yillikGider
  const ebitdaMarji = yillikGelir > 0 ? ((netKar / yillikGelir) * 100).toFixed(1) : 0
  const ltvCacRatio = s.cac > 0 ? (s.ltv / s.cac).toFixed(2) : 0

  // 12-ay projeksiyon (churn uygula SaaS gelirine)
  const monthlyFixed =
    (s.altyapi + s.apiGider + s.pazarlama + s.ofisKira + s.hukuk + s.digerGider) +
    (s.calisanSayisi * s.ortMaas)

  let saasUye = s.saasUye
  const months = []
  let cumulative = 0
  for (let i = 1; i <= 12; i++) {
    const saasGelir = saasUye * s.aylikUcret
    const aylikGelir =
      (s.projeSayisi * s.projeGelir) / 12 +
      saasGelir +
      (s.egitimSinif * s.sinifGelir) / 12 +
      (s.danismanlikSaat * s.saatlikUcret) +
      (s.whiteLabelSayisi * s.lisansUcret) +
      s.digerGelir / 12
    const aylikGider = monthlyFixed
    const net = aylikGelir - aylikGider
    cumulative += net
    months.push({ ay: i, gelir: Math.round(aylikGelir), gider: Math.round(aylikGider), net: Math.round(net), kumulatif: Math.round(cumulative) })
    saasUye = saasUye * (1 - s.churnRate / 100)
  }

  return { yillikGelir, yillikGider, netKar, ebitdaMarji, mrr, arr, ltvCacRatio, months }
}

function NumberInput({ label, value, onChange, suffix }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-[#6B7280] flex-1 leading-tight">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-28 text-xs border border-[#E5E7EB] rounded-md px-2 py-1.5 text-right text-[#111827] focus:outline-none focus:border-[#2563EB]"
        />
        {suffix && <span className="text-[10px] text-[#9CA3AF]">{suffix}</span>}
      </div>
    </div>
  )
}

function InputRow({ label1, value1, onChange1, label2, value2, onChange2, suffix1, suffix2 }) {
  return (
    <div className="space-y-1.5">
      <NumberInput label={label1} value={value1} onChange={onChange1} suffix={suffix1} />
      <NumberInput label={label2} value={value2} onChange={onChange2} suffix={suffix2} />
    </div>
  )
}

function MetricCard({ label, value, color, sub }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-md p-3">
      <div className="text-[10px] text-[#6B7280] mb-1">{label}</div>
      <div className={`text-base font-semibold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-[#9CA3AF] mt-0.5">{sub}</div>}
    </div>
  )
}

const fmt = (n) => Math.round(n).toLocaleString('tr-TR') + ' TL'
const fmtShort = (n) => n >= 1_000_000
  ? (n / 1_000_000).toFixed(1) + 'M TL'
  : n >= 1000
    ? (n / 1000).toFixed(0) + 'K TL'
    : Math.round(n).toLocaleString('tr-TR') + ' TL'

export default function Simulator() {
  const [state, setState] = useState(loadState)
  const [activeScenario, setActiveScenario] = useState('gercekci')
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const s = state[activeScenario]
  const metrics = calcMetrics(s)

  function update(field) {
    return (val) => setState(prev => ({
      ...prev,
      [activeScenario]: { ...prev[activeScenario], [field]: val },
    }))
  }

  const breakEvenMonth = metrics.months.findIndex(m => m.kumulatif >= 0)

  async function handleAiAnalysis() {
    setAiLoading(true)
    setAiAnalysis('')
    try {
      let profileSector = ''
      try {
        const prof = await api.get('/profile')
        profileSector = prof?.profile?.sector || ''
      } catch {
        // ignore
      }
      const prompt = `Sen bir finansal analist ve sektör uzmanisın. ${profileSector ? `Sektör: ${profileSector}.` : ''} Bir SaaS/teknoloji startupı için sektör karsilastirmasi yap.

Mevcut metrikler:
- MRR: ${fmt(metrics.mrr)}
- Yillik Gelir: ${fmt(metrics.yillikGelir)}
- Yillik Gider: ${fmt(metrics.yillikGider)}
- Net Kar: ${fmt(metrics.netKar)}
- EBITDA Marji: %${metrics.ebitdaMarji}
- LTV/CAC: ${metrics.ltvCacRatio}
- Aylik Churn: %${s.churnRate}

Sektör ortalamalarıyla karsilastir ve gelistirme onerileri sun. Cevabi Türkçe ver, 150-200 kelime, madde isaretleri kullan.`

      const data = await api.post('/ai/generate', { prompt })
      setAiAnalysis(data.text || '')
    } catch (e) {
      setAiAnalysis('Analiz yapilirken hata olustu: ' + (e.message || ''))
    } finally {
      setAiLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  // Senaryo karsilastirma verisi
  const scenarioComparison = SCENARIO_KEYS.map(key => {
    const m = calcMetrics(state[key])
    return {
      name: SCENARIO_LABELS[key],
      gelir: Math.round(m.yillikGelir),
      gider: Math.round(m.yillikGider),
      net: Math.round(m.netKar),
    }
  })

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; }
        }
        .print-header { display: none; }
      `}</style>

      <div className="print-header text-lg font-semibold text-[#111827] mb-4">Finansal Simulasyon Raporu</div>

      <div className="mb-4 flex items-center justify-between no-print">
        <div>
          <h1 className="text-base font-semibold text-[#111827]">Finansal Simulatör</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">3 senaryo ile 12 aylik projeksiyon ve birim ekonomi analizi.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="text-xs px-3 py-1.5 border border-[#E5E7EB] rounded-md text-[#374151] hover:bg-[#F3F4F6]">
            Rapor Indir (PDF)
          </button>
          <button
            onClick={handleAiAnalysis}
            disabled={aiLoading}
            className="text-xs px-3 py-1.5 bg-[#2563EB] text-white rounded-md hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            {aiLoading ? 'Analiz ediliyor...' : 'OperIQ Sektör Analizi'}
          </button>
        </div>
      </div>

      {/* Scenario Tabs */}
      <div className="flex gap-1 mb-4 no-print">
        {SCENARIO_KEYS.map(key => (
          <button
            key={key}
            onClick={() => setActiveScenario(key)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              activeScenario === key
                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#2563EB] hover:text-[#2563EB]'
            }`}
          >
            {SCENARIO_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 no-print">
        {/* Card 1: Gelir Suruculeri */}
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
          <div className="text-xs font-semibold text-[#111827] mb-3">Gelir Suruculeri</div>
          <div className="space-y-3">
            <InputRow
              label1="Proje sayisi"
              value1={s.projeSayisi} onChange1={update('projeSayisi')}
              label2="Proje basina gelir"
              value2={s.projeGelir} onChange2={update('projeGelir')} suffix2="TL"
            />
            <div className="border-t border-[#F3F4F6]" />
            <InputRow
              label1="SaaS uye sayisi"
              value1={s.saasUye} onChange1={update('saasUye')}
              label2="Aylik uyelik ucreti"
              value2={s.aylikUcret} onChange2={update('aylikUcret')} suffix2="TL"
            />
            <div className="border-t border-[#F3F4F6]" />
            <InputRow
              label1="Egitim sinifi sayisi"
              value1={s.egitimSinif} onChange1={update('egitimSinif')}
              label2="Sinif basina gelir"
              value2={s.sinifGelir} onChange2={update('sinifGelir')} suffix2="TL"
            />
            <div className="border-t border-[#F3F4F6]" />
            <InputRow
              label1="Danismanlik (saat/ay)"
              value1={s.danismanlikSaat} onChange1={update('danismanlikSaat')}
              label2="Saatlik ucret"
              value2={s.saatlikUcret} onChange2={update('saatlikUcret')} suffix2="TL"
            />
            <div className="border-t border-[#F3F4F6]" />
            <InputRow
              label1="White-label lisans sayisi"
              value1={s.whiteLabelSayisi} onChange1={update('whiteLabelSayisi')}
              label2="Lisans ucreti/ay"
              value2={s.lisansUcret} onChange2={update('lisansUcret')} suffix2="TL"
            />
            <div className="border-t border-[#F3F4F6]" />
            <NumberInput label="Diger gelir (yillik)" value={s.digerGelir} onChange={update('digerGelir')} suffix="TL" />
          </div>
        </div>

        {/* Card 2: Maliyet Suruculeri */}
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
          <div className="text-xs font-semibold text-[#111827] mb-3">Maliyet Suruculeri</div>
          <div className="space-y-3">
            <NumberInput label="Altyapi maliyeti/ay" value={s.altyapi} onChange={update('altyapi')} suffix="TL" />
            <NumberInput label="API giderleri/ay" value={s.apiGider} onChange={update('apiGider')} suffix="TL" />
            <NumberInput label="Pazarlama butcesi/ay" value={s.pazarlama} onChange={update('pazarlama')} suffix="TL" />
            <div className="border-t border-[#F3F4F6]" />
            <InputRow
              label1="Calisan sayisi"
              value1={s.calisanSayisi} onChange1={update('calisanSayisi')}
              label2="Ortalama maas/ay"
              value2={s.ortMaas} onChange2={update('ortMaas')} suffix2="TL"
            />
            <div className="border-t border-[#F3F4F6]" />
            <NumberInput label="Ofis/kira/ay" value={s.ofisKira} onChange={update('ofisKira')} suffix="TL" />
            <NumberInput label="Hukuk-muhasebe/ay" value={s.hukuk} onChange={update('hukuk')} suffix="TL" />
            <NumberInput label="Diger giderler/ay" value={s.digerGider} onChange={update('digerGider')} suffix="TL" />
          </div>
        </div>

        {/* Card 3: Birim Ekonomi */}
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
          <div className="text-xs font-semibold text-[#111827] mb-3">Birim Ekonomi</div>
          <div className="space-y-3">
            <NumberInput label="CAC (Musteri Edinme Maliyeti)" value={s.cac} onChange={update('cac')} suffix="TL" />
            <NumberInput label="LTV (Yasam Boyu Degeri)" value={s.ltv} onChange={update('ltv')} suffix="TL" />
            <NumberInput label="Churn Rate (aylik)" value={s.churnRate} onChange={update('churnRate')} suffix="%" />
            <div className="border-t border-[#F3F4F6] pt-2">
              <div className="text-[10px] text-[#9CA3AF] mb-1">MRR (otomatik hesap)</div>
              <div className="text-sm font-semibold text-[#2563EB]">{fmtShort(metrics.mrr)}</div>
            </div>
            <div className="border-t border-[#F3F4F6] pt-2">
              <div className="text-[10px] text-[#9CA3AF] mb-1">ARR (otomatik hesap)</div>
              <div className="text-sm font-semibold text-[#059669]">{fmtShort(metrics.arr)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* OperIQ Analysis */}
      {aiAnalysis && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-md p-4 mb-6">
          <div className="text-xs font-semibold text-[#1E40AF] mb-2">OperIQ Sektör Analizi</div>
          <div className="text-xs text-[#1E3A5F] whitespace-pre-line leading-relaxed">{aiAnalysis}</div>
        </div>
      )}

      {/* Results Row 1: 4 metric cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard
          label="Yillik Gelir"
          value={fmtShort(metrics.yillikGelir)}
          color="text-[#2563EB]"
        />
        <MetricCard
          label="Yillik Gider"
          value={fmtShort(metrics.yillikGider)}
          color="text-[#6B7280]"
        />
        <MetricCard
          label="Net Kar"
          value={fmtShort(metrics.netKar)}
          color={metrics.netKar >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}
        />
        <MetricCard
          label="EBITDA Marji"
          value={`%${metrics.ebitdaMarji}`}
          color={metrics.netKar >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}
        />
      </div>

      {/* Results Row 2: Birim Ekonomi cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard
          label="LTV/CAC Orani"
          value={`${metrics.ltvCacRatio}x`}
          color={metrics.ltvCacRatio >= 3 ? 'text-[#059669]' : 'text-[#D97706]'}
          sub={metrics.ltvCacRatio >= 3 ? 'Saglikli' : 'Gelistirilmeli'}
        />
        <MetricCard
          label="Aylik Churn"
          value={`%${s.churnRate}`}
          color={s.churnRate <= 5 ? 'text-[#059669]' : 'text-[#DC2626]'}
          sub={s.churnRate <= 5 ? 'Kabul edilebilir' : 'Yuksek'}
        />
        <MetricCard
          label="MRR"
          value={fmtShort(metrics.mrr)}
          color="text-[#2563EB]"
        />
        <MetricCard
          label="ARR"
          value={fmtShort(metrics.arr)}
          color="text-[#7C3AED]"
        />
      </div>

      {/* Results Row 3: 12-ay projeksiyon tablosu */}
      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <span className="text-xs font-semibold text-[#374151]">12 Aylik Projeksiyon</span>
          {breakEvenMonth >= 0 && (
            <span className="ml-3 text-xs text-[#059669]">
              Kara gecis: {breakEvenMonth + 1}. ay
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left font-medium text-[#6B7280] px-4 py-2">Ay</th>
                <th className="text-right font-medium text-[#6B7280] px-4 py-2">Gelir</th>
                <th className="text-right font-medium text-[#6B7280] px-4 py-2">Gider</th>
                <th className="text-right font-medium text-[#6B7280] px-4 py-2">Net</th>
                <th className="text-right font-medium text-[#6B7280] px-4 py-2">Kumulatif</th>
              </tr>
            </thead>
            <tbody>
              {metrics.months.map((m) => {
                const isBreakeven = breakEvenMonth >= 0 && m.ay === breakEvenMonth + 1
                return (
                  <tr
                    key={m.ay}
                    className={`border-b border-[#E5E7EB] last:border-0 ${isBreakeven ? 'bg-[#F0FDF4]' : 'hover:bg-[#F9FAFB]'}`}
                  >
                    <td className="px-4 py-2 text-[#374151] font-medium">{m.ay}. Ay {isBreakeven && <span className="text-[#059669] ml-1">(Kara gecis)</span>}</td>
                    <td className="px-4 py-2 text-right text-[#374151]">{m.gelir.toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-2 text-right text-[#6B7280]">{m.gider.toLocaleString('tr-TR')}</td>
                    <td className={`px-4 py-2 text-right font-medium ${m.net >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                      {m.net.toLocaleString('tr-TR')}
                    </td>
                    <td className={`px-4 py-2 text-right font-medium ${m.kumulatif >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                      {m.kumulatif.toLocaleString('tr-TR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Row 4: Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
          <div className="text-xs font-semibold text-[#111827] mb-3">Nakit Akis Grafigi (12 Ay)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.months}>
              <XAxis dataKey="ay" tick={{ fontSize: 10 }} tickFormatter={v => `${v}.Ay`} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmtShort(v)} />
              <Tooltip formatter={(v) => fmtShort(v)} labelFormatter={l => `${l}. Ay`} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="gelir" stroke="#2563EB" dot={false} strokeWidth={1.5} name="Gelir" />
              <Line type="monotone" dataKey="gider" stroke="#DC2626" dot={false} strokeWidth={1.5} name="Gider" />
              <Line type="monotone" dataKey="net" stroke="#059669" dot={false} strokeWidth={1.5} name="Net" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
          <div className="text-xs font-semibold text-[#111827] mb-3">Senaryo Karsilastirmasi (Yillik)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scenarioComparison} barSize={20}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmtShort(v)} />
              <Tooltip formatter={(v) => fmtShort(v)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="gelir" fill="#2563EB" name="Gelir" />
              <Bar dataKey="gider" fill="#9CA3AF" name="Gider" />
              <Bar dataKey="net" fill="#059669" name="Net" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
