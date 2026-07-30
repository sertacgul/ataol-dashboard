import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { useT } from '../contexts/LanguageContext'

function money(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const ACTION_LABELS = {
  'auth/login': 'Giriş yaptı',
  'email-finder/search': 'Firma aradı',
  'email-finder/reveal': 'E-posta açtı',
  'email-finder/auto-outreach': 'Otomatik outreach',
  'outreach/compose': 'Mail oluşturdu',
  'maps/search': 'Google Maps araması',
  'ataol/compose': 'ATAOL mail oluşturdu',
  'ai/generate': 'AI içerik üretti',
  'competitors/analyze': 'Rakip analizi',
  'seo/generate': 'SEO içerik',
  'social/generate': 'Sosyal medya içeriği',
}
function actionLabel(module, action) {
  return ACTION_LABELS[`${module}/${action}`] || `${module} · ${action}`
}
function whenText(iso) {
  if (!iso) return '-'
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'))
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
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
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [campaigns, setCampaigns] = useState([])
  const emptyForm = { code: '', type: 'percent', percent: 30, amount_cents: 5000, free_months: 1, redeem_window_days: 90, duration: 'once', eligible_plans: [], starts_at: '', ends_at: '', max_redemptions: '' }
  const [cForm, setCForm] = useState(emptyForm)
  const [cErr, setCErr] = useState('')
  const [cBusy, setCBusy] = useState(false)

  useEffect(() => {
    if (user && user.role !== 'superadmin') { setLoading(false); return }
    api.get('/admin/overview')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
    api.get('/admin/activity')
      .then(d => setActivity(d.activity || []))
      .catch(() => {})
    api.get('/admin/campaigns').then(d => setCampaigns(d.campaigns || [])).catch(() => {})
  }, [user])

  if (user && user.role !== 'superadmin') {
    return <div className="text-sm text-[#6B7280] py-12 text-center">{t('Bu sayfaya erişim yetkiniz yok.')}</div>
  }
  if (loading) return <div className="text-xs text-[#9CA3AF] py-8 text-center">{t('Yükleniyor...')}</div>
  if (error) return <div className="text-sm text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">{error}</div>
  if (!data) return null

  const { users, revenue, cost, margin, api: apis, orders } = data

  async function createCampaign(e) {
    e.preventDefault()
    setCErr(''); setCBusy(true)
    try {
      const body = {
        code: cForm.code, type: cForm.type,
        eligible_plans: cForm.eligible_plans,
        starts_at: cForm.starts_at || null, ends_at: cForm.ends_at || null,
        max_redemptions: cForm.max_redemptions ? Number(cForm.max_redemptions) : null,
      }
      if (cForm.type === 'percent') body.percent = Number(cForm.percent)
      if (cForm.type === 'amount') body.amount_cents = Math.round(Number(cForm.amount_cents))
      if (cForm.type !== 'free_month') body.duration = cForm.duration
      if (cForm.type === 'free_month') { body.free_months = Number(cForm.free_months); body.redeem_window_days = Number(cForm.redeem_window_days) }
      await api.post('/admin/campaigns', body)
      setCForm(emptyForm)
      const d = await api.get('/admin/campaigns'); setCampaigns(d.campaigns || [])
    } catch (err) { setCErr(err.message) } finally { setCBusy(false) }
  }
  async function toggleCampaign(id, active) {
    await api.patch(`/admin/campaigns/${id}`, { active: active ? 0 : 1 })
    const d = await api.get('/admin/campaigns'); setCampaigns(d.campaigns || [])
  }
  async function deleteCampaign(id) {
    await api.del(`/admin/campaigns/${id}`)
    const d = await api.get('/admin/campaigns'); setCampaigns(d.campaigns || [])
  }
  function cValue(c) {
    if (c.type === 'percent') return `%${c.percent}`
    if (c.type === 'amount') return '$' + (c.amount_cents / 100)
    return `${c.free_months} ay ücretsiz`
  }

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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
          <div className="text-xs text-[#6B7280] mb-1">Prospeo</div>
          {apis.prospeo?.configured ? (
            apis.prospeo.error
              ? <div className="text-sm text-[#DC2626]">{t('Bağlantı hatası')}</div>
              : <div className="text-sm text-[#111827]">
                  <div><span className="font-semibold">{apis.prospeo.credits_used ?? '-'}</span> / {apis.prospeo.credits_used != null && apis.prospeo.credits_remaining != null ? apis.prospeo.credits_used + apis.prospeo.credits_remaining : '-'} <span className="text-xs text-[#9CA3AF]">{t('kredi')}</span></div>
                  <div className="text-xs text-[#9CA3AF] mt-0.5">{apis.prospeo.plan || ''}{apis.prospeo.renews_in_days != null ? ` · ${apis.prospeo.renews_in_days} ${t('gün')}` : ''}</div>
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

      {/* Kampanya kodları */}
      <div className="text-xs font-semibold text-[#374151] mb-2">{t('Kampanya Kodları')}</div>
      <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-3">
        <form onSubmit={createCampaign} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
          <label className="text-xs text-[#6B7280]">Kod
            <input value={cForm.code} onChange={e => setCForm({ ...cForm, code: e.target.value.toUpperCase() })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm uppercase" placeholder="LAUNCH100" />
          </label>
          <label className="text-xs text-[#6B7280]">Tip
            <select value={cForm.type} onChange={e => setCForm({ ...cForm, type: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm">
              <option value="percent">Yüzde indirim</option>
              <option value="amount">Tutar indirim</option>
              <option value="free_month">Ücretsiz ay</option>
            </select>
          </label>
          {cForm.type === 'percent' && (
            <label className="text-xs text-[#6B7280]">Yüzde
              <input type="number" min="1" max="100" value={cForm.percent} onChange={e => setCForm({ ...cForm, percent: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" />
            </label>
          )}
          {cForm.type === 'amount' && (
            <label className="text-xs text-[#6B7280]">Tutar (cent, USD)
              <input type="number" min="1" value={cForm.amount_cents} onChange={e => setCForm({ ...cForm, amount_cents: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" />
            </label>
          )}
          {cForm.type === 'free_month' && (
            <>
              <label className="text-xs text-[#6B7280]">Ay
                <input type="number" min="1" value={cForm.free_months} onChange={e => setCForm({ ...cForm, free_months: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs text-[#6B7280]">Aktivasyon penceresi (gün)
                <input type="number" min="1" value={cForm.redeem_window_days} onChange={e => setCForm({ ...cForm, redeem_window_days: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" />
              </label>
            </>
          )}
          {cForm.type !== 'free_month' && (
            <label className="text-xs text-[#6B7280]">Süre
              <select value={cForm.duration} onChange={e => setCForm({ ...cForm, duration: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm">
                <option value="once">Tek seferlik (ilk ödeme)</option>
                <option value="forever">Her ödeme</option>
              </select>
            </label>
          )}
          <label className="text-xs text-[#6B7280]">Başlangıç
            <input type="date" value={cForm.starts_at} onChange={e => setCForm({ ...cForm, starts_at: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-[#6B7280]">Bitiş
            <input type="date" value={cForm.ends_at} onChange={e => setCForm({ ...cForm, ends_at: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-[#6B7280]">Kullanım limiti
            <input type="number" min="1" value={cForm.max_redemptions} onChange={e => setCForm({ ...cForm, max_redemptions: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" placeholder="Sınırsız" />
          </label>
          <button type="submit" disabled={cBusy || !cForm.code.trim()} className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-2">
            {cBusy ? 'Ekleniyor...' : 'Kod Ekle'}
          </button>
        </form>
        {cErr && <div className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2 mt-2">{cErr}</div>}
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Kod</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Tip</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Değer</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Pencere</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Kullanım</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Durum</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr><td colSpan="7" className="text-xs text-[#9CA3AF] text-center py-6">Henüz kampanya kodu yok.</td></tr>
            ) : campaigns.map(c => (
              <tr key={c.id} className="border-b border-[#E5E7EB] last:border-0">
                <td className="px-4 py-2 text-xs font-medium text-[#111827]">{c.code}</td>
                <td className="px-4 py-2 text-xs text-[#6B7280]">{c.type}</td>
                <td className="px-4 py-2 text-xs text-[#111827]">{cValue(c)}</td>
                <td className="px-4 py-2 text-xs text-[#9CA3AF]">{(c.starts_at || '-')} / {(c.ends_at || '-')}</td>
                <td className="px-4 py-2 text-xs text-[#6B7280]">{c.redemptions_count}{c.max_redemptions ? ` / ${c.max_redemptions}` : ''}</td>
                <td className="px-4 py-2 text-xs">
                  <button onClick={() => toggleCampaign(c.id, c.active)} className={c.active ? 'text-[#059669]' : 'text-[#9CA3AF]'}>{c.active ? 'Aktif' : 'Pasif'}</button>
                </td>
                <td className="px-4 py-2 text-xs"><button onClick={() => deleteCampaign(c.id)} className="text-[#DC2626]">Sil</button></td>
              </tr>
            ))}
          </tbody>
        </table>
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

      {/* Kullanıcı hareketleri */}
      <div className="text-xs font-semibold text-[#374151] mb-2">{t('Kullanıcı Hareketleri')} ({activity.length})</div>
      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden mb-6">
        {activity.length === 0 ? (
          <div className="text-xs text-[#9CA3AF] text-center py-6">{t('Henüz hareket kaydı yok.')}</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#F9FAFB]">
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Kullanıcı')}</th>
                  <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('İşlem')}</th>
                  <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Detay')}</th>
                  <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Zaman')}</th>
                </tr>
              </thead>
              <tbody>
                {activity.map(a => (
                  <tr key={a.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                    <td className="px-4 py-2 text-xs text-[#111827] whitespace-nowrap">{a.email}</td>
                    <td className="px-4 py-2 text-xs text-[#374151] whitespace-nowrap">{actionLabel(a.module, a.action)}</td>
                    <td className="px-4 py-2 text-xs text-[#9CA3AF] max-w-[220px] truncate" title={a.title || ''}>{a.title || '-'}</td>
                    <td className="px-4 py-2 text-xs text-[#9CA3AF] whitespace-nowrap">{whenText(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
