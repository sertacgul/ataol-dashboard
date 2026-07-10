import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const STORAGE_KEY = 'askdesk_simulator'

const DEFAULT_STATE = {
  projeSayisi: 0,
  projeGelir: 0,
  saasUye: 0,
  aylikUcret: 0,
  egitimSinif: 0,
  sinifGelir: 0,
  digerGelir: 0,
  altyapi: 0,
  apiGider: 0,
  pazarlama: 0,
  calisanSayisi: 0,
  ortMaas: 0,
  hukuk: 0,
  digerGider: 0,
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...DEFAULT_STATE, ...JSON.parse(saved) }
  } catch {
    // ignore
  }
  return { ...DEFAULT_STATE }
}

function NumberInput({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-[#6B7280] flex-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-32 text-xs border border-[#E5E7EB] rounded-md px-2 py-1.5 text-right text-[#111827] focus:outline-none focus:border-[#2563EB]"
      />
    </div>
  )
}

function InputRow({ label1, value1, onChange1, label2, value2, onChange2 }) {
  return (
    <div className="space-y-1.5">
      <NumberInput label={label1} value={value1} onChange={onChange1} />
      <NumberInput label={label2} value={value2} onChange={onChange2} />
    </div>
  )
}

function MetricCard({ label, value, color }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
      <div className="text-xs text-[#6B7280] mb-1">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>
        {value.toLocaleString('tr-TR')} TL
      </div>
    </div>
  )
}

export default function Simulator() {
  const [s, setS] = useState(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  }, [s])

  function update(field) {
    return (val) => setS(prev => ({ ...prev, [field]: val }))
  }

  const yillikGelir =
    (s.projeSayisi * s.projeGelir) +
    (s.saasUye * s.aylikUcret * 12) +
    (s.egitimSinif * s.sinifGelir) +
    s.digerGelir

  const yillikGider =
    (s.altyapi + s.apiGider + s.pazarlama + s.hukuk + s.digerGider) * 12 +
    (s.calisanSayisi * s.ortMaas * 12)

  const netKar = yillikGelir - yillikGider
  const ebitdaMarji = yillikGelir > 0 ? ((netKar / yillikGelir) * 100).toFixed(1) : 0

  const chartData = [
    { name: 'Gelir', value: yillikGelir },
    { name: 'Gider', value: yillikGider },
  ]

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-base font-semibold text-[#111827]">Finansal Simülatör</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Gelir ve gider sürücülerini girerek yıllık projeksiyonunuzu hesaplayın.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Left: Inputs */}
        <div className="space-y-4">
          {/* Gelir Surucüleri */}
          <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
            <div className="text-sm font-semibold text-[#111827] mb-3">Gelir Sürücüleri</div>
            <div className="space-y-3">
              <InputRow
                label1="Proje sayısı"
                value1={s.projeSayisi}
                onChange1={update('projeSayisi')}
                label2="Proje başına gelir (TL)"
                value2={s.projeGelir}
                onChange2={update('projeGelir')}
              />
              <div className="border-t border-[#F3F4F6]" />
              <InputRow
                label1="SaaS üye sayısı"
                value1={s.saasUye}
                onChange1={update('saasUye')}
                label2="Aylık üyelik ücreti (TL)"
                value2={s.aylikUcret}
                onChange2={update('aylikUcret')}
              />
              <div className="border-t border-[#F3F4F6]" />
              <InputRow
                label1="Eğitim sınıfı sayısı"
                value1={s.egitimSinif}
                onChange1={update('egitimSinif')}
                label2="Sınıf başına gelir (TL)"
                value2={s.sinifGelir}
                onChange2={update('sinifGelir')}
              />
              <div className="border-t border-[#F3F4F6]" />
              <NumberInput label="Diğer gelir (TL/yıl)" value={s.digerGelir} onChange={update('digerGelir')} />
            </div>
          </div>

          {/* Maliyet Surucüleri */}
          <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
            <div className="text-sm font-semibold text-[#111827] mb-3">Maliyet Sürücüleri</div>
            <div className="space-y-3">
              <NumberInput label="Altyapı maliyeti/ay (TL)" value={s.altyapi} onChange={update('altyapi')} />
              <NumberInput label="API giderleri/ay (TL)" value={s.apiGider} onChange={update('apiGider')} />
              <NumberInput label="Pazarlama bütçesi/ay (TL)" value={s.pazarlama} onChange={update('pazarlama')} />
              <div className="border-t border-[#F3F4F6]" />
              <InputRow
                label1="Çalışan sayısı"
                value1={s.calisanSayisi}
                onChange1={update('calisanSayisi')}
                label2="Ortalama maaş (TL/ay)"
                value2={s.ortMaas}
                onChange2={update('ortMaas')}
              />
              <div className="border-t border-[#F3F4F6]" />
              <NumberInput label="Hukuk-muhasebe/ay (TL)" value={s.hukuk} onChange={update('hukuk')} />
              <NumberInput label="Diğer giderler/ay (TL)" value={s.digerGider} onChange={update('digerGider')} />
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Yıllık Gelir" value={yillikGelir} color="text-[#2563EB]" />
            <MetricCard label="Yıllık Gider" value={yillikGider} color="text-[#6B7280]" />
            <MetricCard
              label="Net Kar"
              value={netKar}
              color={netKar >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}
            />
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
            <div className="text-xs text-[#6B7280] mb-0.5">EBITDA Marji</div>
            <div className={`text-2xl font-semibold ${netKar >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
              %{ebitdaMarji}
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
            <div className="text-sm font-semibold text-[#111827] mb-4">Gelir vs Gider (Yıllık)</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barSize={48}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v.toLocaleString('tr-TR')} />
                <Tooltip formatter={v => v.toLocaleString('tr-TR') + ' TL'} />
                <Bar dataKey="value">
                  <Cell fill="#2563EB" />
                  <Cell fill="#DC2626" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
