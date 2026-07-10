import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import StatCard from '../../components/StatCard'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const SOCIAL_COLORS = {
  linkedin: '#0077B5',
  twitter: '#1DA1F2',
  instagram: '#E4405F',
  facebook: '#1877F2',
}

const PIE_COLORS = ['#2563EB', '#059669', '#7C3AED', '#F59E0B', '#EF4444', '#06B6D4']

const PERIODS = [
  { label: 'Bu Hafta', key: 'week' },
  { label: 'Bu Ay', key: 'month' },
  { label: 'Son 3 Ay', key: '3months' },
  { label: 'Son 1 Yil', key: 'year' },
]

function getDateRange(key) {
  const to = new Date()
  const from = new Date()
  if (key === 'week') from.setDate(to.getDate() - 7)
  else if (key === 'month') from.setMonth(to.getMonth() - 1)
  else if (key === '3months') from.setMonth(to.getMonth() - 3)
  else if (key === 'year') from.setFullYear(to.getFullYear() - 1)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export default function Analytics() {
  const [period, setPeriod] = useState('month')
  const [overview, setOverview] = useState(null)
  const [emailTrend, setEmailTrend] = useState([])
  const [socialStats, setSocialStats] = useState([])
  const [pipelineStats, setPipelineStats] = useState([])
  const [contentTrend, setContentTrend] = useState([])
  const [topOutreach, setTopOutreach] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { from, to } = getDateRange(period)
    setLoading(true)

    Promise.all([
      api.get(`/analytics/overview?from=${from}&to=${to}`),
      api.get(`/analytics/email-trend?from=${from}&to=${to}`),
      api.get('/analytics/social-stats'),
      api.get('/analytics/pipeline-stats'),
      api.get(`/analytics/content-trend?from=${from}&to=${to}`),
      api.get('/analytics/top-outreach?limit=10'),
    ])
      .then(([ov, et, ss, ps, ct, to_]) => {
        setOverview(ov)
        setEmailTrend(et.data || [])
        setSocialStats(ss.data || [])
        setPipelineStats(ps.data || [])
        setContentTrend(ct.data || [])
        setTopOutreach(to_.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const openRate = overview
    ? (overview.open_rate ?? 0) + '%'
    : '—'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-semibold text-[#111827]">Analitik</h1>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                period === p.key
                  ? 'bg-[#2563EB] text-white border-[#2563EB]'
                  : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#2563EB] hover:text-[#2563EB]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-[#9CA3AF] py-8 text-center">Yukleniyor...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-5">
            <StatCard label="Toplam Lead" value={overview?.total_companies ?? '—'} />
            <StatCard label="Gonderilen Email" value={overview?.sent_emails ?? '—'} />
            <StatCard label="Acilma Orani (%)" value={openRate} />
            <StatCard label="Donusum" value={overview?.total_companies ?? '—'} />
            <StatCard label="Yanit" value={overview?.reply_count ?? '—'} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              <div className="text-sm font-semibold text-[#111827] mb-4">Email Gonderim Trendi</div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={emailTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#2563EB" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              <div className="text-sm font-semibold text-[#111827] mb-4">Sosyal Medya Dagilimi</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={socialStats}>
                  <XAxis dataKey="platform" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {socialStats.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={SOCIAL_COLORS[entry.platform?.toLowerCase()] || '#6B7280'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              <div className="text-sm font-semibold text-[#111827] mb-4">Pipeline Dagilimi</div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pipelineStats}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, count }) => `${name}: ${count}`}
                  >
                    {pipelineStats.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              <div className="text-sm font-semibold text-[#111827] mb-4">Icerik Uretim Trendi</div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={contentTrend}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="seo" stroke="#2563EB" dot={false} name="SEO" />
                  <Line type="monotone" dataKey="social" stroke="#059669" dot={false} name="Sosyal" />
                  <Line type="monotone" dataKey="newsletter" stroke="#7C3AED" dot={false} name="Newsletter" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <h2 className="text-xs font-semibold text-[#374151]">Top Outreach</h2>
            </div>
            {!topOutreach.length ? (
              <div className="text-xs text-[#9CA3AF] text-center py-8">Henuz email bulunmuyor.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Firma</th>
                    <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Konu</th>
                    <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Acildi</th>
                    <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {topOutreach.map((email) => (
                    <tr key={email.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                      <td className="px-4 py-2.5 text-xs text-[#6B7280]">{email.company_name || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-[#111827]">{email.subject || '(konu yok)'}</td>
                      <td className="px-4 py-2.5">
                        {email.opened ? (
                          <span className="text-xs font-medium text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded">
                            Acildi
                          </span>
                        ) : (
                          <span className="text-xs text-[#9CA3AF]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#9CA3AF]">
                        {email.created_at
                          ? new Date(email.created_at).toLocaleDateString('tr-TR')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
