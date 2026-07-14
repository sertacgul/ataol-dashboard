import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { useT } from '../contexts/LanguageContext'

function money(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
      <div className="text-xs text-[#6B7280] mb-1">{label}</div>
      <div className={`text-xl font-semibold ${accent || 'text-[#111827]'}`}>{value}</div>
      {sub && <div className="text-xs text-[#9CA3AF] mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Admin() {
  const { t } = useT()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && user.role !== 'superadmin') { setLoading(false); return }
    api.get('/admin/overview')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [user])

  if (user && user.role !== 'superadmin') {
    return <div className="text-sm text-[#6B7280] py-12 text-center">{t('Bu sayfaya erişim yetkiniz yok.')}</div>
  }
  if (loading) return <div className="text-xs text-[#9CA3AF] py-8 text-center">{t('Yükleniyor...')}</div>
  if (error) return <div className="text-sm text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">{error}</div>
  if (!data) return null

  const { users, revenue, cost, margin, api: apis, orders } = data

  return (
    <div>
      <h1 className="text-base font-semibold text-[#111827] mb-4">{t('Super Admin')}</h1>

      {/* Ana metrikler */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label={t('Toplam Kullanıcı')} value={users.total} sub={`${users.last_30_days} ${t('son 30 gün')}`} />
        <Stat label={t('Ücretli Abone')} value={users.paid} sub={`${users.by_plan.free} ${t('ücretsiz')}`} />
        <Stat label={t('Aylık Gelir (MRR)')} value={money(revenue.mrr)} accent="text-[#059669]" />
        <Stat
          label={t('Kâr Marjı')}
          value={money(margin.amount)}
          sub={`%${margin.percent}`}
          accent={margin.amount >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}
        />
      </div>

      {/* API bakiyeleri */}
      <div className="text-xs font-semibold text-[#374151] mb-2">{t('API Bakiyeleri')}</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
          <div className="text-xs text-[#6B7280] mb-1">MillionVerifier</div>
          {apis.millionverifier.configured ? (
            apis.millionverifier.error
              ? <div className="text-sm text-[#DC2626]">{t('Bağlantı hatası')}</div>
              : <div className="text-xl font-semibold text-[#111827]">{apis.millionverifier.credits ?? '-'} <span className="text-xs font-normal text-[#9CA3AF]">{t('kredi')}</span></div>
          ) : <div className="text-sm text-[#9CA3AF]">{t('Yapılandırılmamış')}</div>}
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
          <div className="text-xs text-[#6B7280] mb-1">Hunter</div>
          {apis.hunter.configured ? (
            apis.hunter.error
              ? <div className="text-sm text-[#DC2626]">{t('Bağlantı hatası')}</div>
              : <div className="text-sm text-[#111827]">
                  <div><span className="font-semibold">{apis.hunter.searches_used ?? '-'}</span> / {apis.hunter.searches_available ?? '-'} <span className="text-xs text-[#9CA3AF]">{t('arama')}</span></div>
                  <div className="text-xs text-[#9CA3AF] mt-0.5">{apis.hunter.plan || ''}</div>
                </div>
          ) : <div className="text-sm text-[#9CA3AF]">{t('Yapılandırılmamış')}</div>}
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
          <div className="text-xs text-[#6B7280] mb-1">Resend</div>
          {apis.resend.configured
            ? <div className="text-sm text-[#059669]">{t('Aktif')} <span className="text-xs text-[#9CA3AF]">({t('kullanım API\'si yok')})</span></div>
            : <div className="text-sm text-[#9CA3AF]">{t('Yapılandırılmamış')}</div>}
        </div>
      </div>

      {/* Gelir / maliyet / marj detayı */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-6">
        <div className="text-xs font-semibold text-[#374151] mb-3">{t('Gelir & Maliyet (aylık, tahmini)')}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><div className="text-xs text-[#9CA3AF] mb-0.5">{t('Gelir (MRR)')}</div><div className="font-medium text-[#059669]">{money(revenue.mrr)}</div></div>
          <div><div className="text-xs text-[#9CA3AF] mb-0.5">{t('Değişken maliyet')}</div><div className="font-medium text-[#111827]">{money(cost.variable)}</div><div className="text-xs text-[#9CA3AF]">{cost.reveals_30d} reveal</div></div>
          <div><div className="text-xs text-[#9CA3AF] mb-0.5">{t('Sabit maliyet')}</div><div className="font-medium text-[#111827]">{money(cost.fixed)}</div></div>
          <div><div className="text-xs text-[#9CA3AF] mb-0.5">{t('Net marj')}</div><div className={`font-medium ${margin.amount >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>{money(margin.amount)} (%{margin.percent})</div></div>
        </div>
        <div className="text-xs text-[#9CA3AF] mt-3">{t('Tahmini değerler: reveal başına')} {money(cost.cost_per_reveal)}, {t('sabit gider kodda tanımlı')}.</div>
      </div>

      {/* Plan dağılımı */}
      <div className="text-xs font-semibold text-[#374151] mb-2">{t('Plan Dağılımı')}</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Free" value={users.by_plan.free} />
        <Stat label="Pro" value={users.by_plan.pro} />
        <Stat label="Growth" value={users.by_plan.growth} />
        <Stat label="Team" value={users.by_plan.team} />
      </div>

      {/* Satın alma geçmişi */}
      {orders && orders.length > 0 && (
        <>
          <div className="text-xs font-semibold text-[#374151] mb-2">{t('Satın Almalar')}</div>
          <div className="bg-white border border-[#E5E7EB] rounded-md overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Email')}</th>
                  <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Olay')}</th>
                  <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Plan/Paket')}</th>
                  <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Tutar')}</th>
                  <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Tarih')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-[#E5E7EB] last:border-0">
                    <td className="px-4 py-2 text-xs text-[#111827]">{o.email || '-'}</td>
                    <td className="px-4 py-2 text-xs text-[#6B7280]">{o.event}</td>
                    <td className="px-4 py-2 text-xs text-[#111827]">{o.plan || o.pack || '-'}</td>
                    <td className="px-4 py-2 text-xs text-[#111827]">{o.amount != null ? money(o.amount) : '-'}</td>
                    <td className="px-4 py-2 text-xs text-[#9CA3AF]">{o.created_at ? new Date(o.created_at).toLocaleDateString('tr-TR') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Kayıtlı kullanıcılar */}
      <div className="text-xs font-semibold text-[#374151] mb-2">{t('Kayıtlar')} ({users.list.length})</div>
      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Ad')}</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Email')}</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Firma')}</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Plan')}</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Kayıt')}</th>
            </tr>
          </thead>
          <tbody>
            {users.list.map(u => (
              <tr key={u.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                <td className="px-4 py-2 text-xs text-[#111827]">{u.name}{u.role === 'superadmin' ? ' ★' : ''}</td>
                <td className="px-4 py-2 text-xs text-[#6B7280]">{u.email}</td>
                <td className="px-4 py-2 text-xs text-[#6B7280]">{u.company_name || '-'}</td>
                <td className="px-4 py-2 text-xs text-[#111827]">{u.plan}</td>
                <td className="px-4 py-2 text-xs text-[#9CA3AF]">{u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
