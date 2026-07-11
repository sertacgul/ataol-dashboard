import { useT } from '../contexts/LanguageContext'

export default function StatCard({ label, value, change, negative }) {
  const { t } = useT()
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">{t(label)}</div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-2xl font-semibold tracking-tight text-[#111827]">{value}</span>
        {change && (
          <span className={`text-xs font-medium ${negative ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  )
}
