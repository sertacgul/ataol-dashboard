import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useT } from '../../contexts/LanguageContext'

export default function LeadMaps() {
  const { t } = useT()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [sentiment, setSentiment] = useState('')
  const [searching, setSearching] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingSentiment, setLoadingSentiment] = useState(false)
  const [savingLead, setSavingLead] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setError('')
    setResults([])
    setSelected(null)
    setSentiment('')
    try {
      const data = await api.post('/maps/search', { query })
      setResults(data.places || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setSearching(false)
    }
  }

  async function handleSelect(place) {
    setLoadingDetails(true)
    setSelected(null)
    setSentiment('')
    try {
      const data = await api.post('/maps/details', { place_id: place.place_id })
      setSelected({ ...data, place_id: place.place_id })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingDetails(false)
    }
  }

  async function handleSentiment() {
    if (!selected?.reviews?.length) return
    setLoadingSentiment(true)
    try {
      const data = await api.post('/maps/sentiment', {
        reviews: selected.reviews,
        company_name: selected.name,
      })
      setSentiment(data.result || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingSentiment(false)
    }
  }

  function detectSector(place) {
    if (!place) return null
    const types = place.types || []
    if (types.includes('restaurant') || types.includes('food')) return 'Yiyecek & İçecek'
    if (types.includes('lodging') || types.includes('hotel')) return 'Konaklama'
    if (types.includes('health') || types.includes('hospital') || types.includes('pharmacy')) return 'Sağlık'
    if (types.includes('school') || types.includes('university')) return 'Eğitim'
    if (types.includes('store') || types.includes('shopping_mall')) return 'Perakende'
    if (types.includes('bank') || types.includes('finance')) return 'Finans'
    if (types.includes('gym') || types.includes('beauty_salon') || types.includes('spa')) return 'Güzellik & Sağlık'
    if (types.includes('car_dealer') || types.includes('car_repair')) return 'Otomotiv'
    if (types.includes('real_estate_agency')) return 'Gayrimenkul'
    if (types.includes('lawyer') || types.includes('accounting')) return 'Profesyonel Hizmetler'
    if (types.includes('travel_agency') || types.includes('tourist_attraction')) return 'Turizm'
    return null
  }

  async function buildLeadPayload() {
    const sector = detectSector(selected) || null
    return {
      name: selected.name,
      website: selected.website || null,
      country: selected.address || null,
      sector,
      source: 'maps',
      notes: sentiment || null,
    }
  }

  async function handleSaveLead() {
    if (!selected) return
    setSavingLead(true)
    try {
      const payload = await buildLeadPayload()
      const data = await api.post('/leads', payload)
      navigate(`/app/leads/${data.id}`)
    } catch (err) {
      setError(err.message)
      setSavingLead(false)
    }
  }

  async function handleSaveAndEmail() {
    if (!selected) return
    setSavingLead(true)
    try {
      const payload = await buildLeadPayload()
      const data = await api.post('/leads', payload)
      navigate(`/app/outreach/new?company=${data.id}`)
    } catch (err) {
      setError(err.message)
      setSavingLead(false)
    }
  }

  return (
    <div>
      <h1 className="text-base font-semibold text-[#111827] mb-4">{t("Maps'ten Firma Bul")}</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Örn: yazılım şirketleri İstanbul"
          className="flex-1 text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]"
        />
        <button
          type="submit"
          disabled={searching}
          className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5 disabled:opacity-50"
        >
          {searching ? t('Aranıyor...') : t('Ara')}
        </button>
      </form>

      {error && (
        <div className="text-xs text-[#EF4444] mb-3">{error}</div>
      )}

      <div className="flex gap-4">
        {/* Sol: Sonuçlar */}
        <div className="w-1/2 flex flex-col gap-2">
          {results.length === 0 && !searching && (
            <div className="text-xs text-[#9CA3AF]">{t('Arama yapın.')}</div>
          )}
          {results.map(place => (
            <button
              key={place.place_id}
              onClick={() => handleSelect(place)}
              className="text-left bg-white border border-[#E5E7EB] rounded-md p-3 hover:border-[#2563EB] focus:outline-none"
            >
              <div className="text-xs font-semibold text-[#111827]">{place.name}</div>
              <div className="text-xs text-[#6B7280] mt-0.5">{place.address}</div>
              {place.rating && (
                <div className="text-xs text-[#9CA3AF] mt-0.5">
                  {place.rating} / 5 - {place.user_ratings_total || 0} {t('yorum')}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Sağ: Detay */}
        <div className="w-1/2">
          {loadingDetails && (
            <div className="text-xs text-[#9CA3AF]">{t('Yükleniyor...')}</div>
          )}
          {selected && !loadingDetails && (
            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="text-sm font-semibold text-[#111827]">{selected.name}</div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={handleSaveLead}
                    disabled={savingLead}
                    className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5 disabled:opacity-50"
                  >
                    {savingLead ? t('Kaydediliyor...') : t('Lead Olarak Kaydet')}
                  </button>
                  <button
                    onClick={handleSaveAndEmail}
                    disabled={savingLead}
                    className="text-xs font-medium text-[#2563EB] border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-md px-3 py-1.5 disabled:opacity-50"
                  >
                    {savingLead ? t('Kaydediliyor...') : t('Kaydet ve Email Oluştur')}
                  </button>
                </div>
              </div>

              {selected.website && (
                <a
                  href={selected.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#2563EB] hover:underline block mb-1"
                >
                  {selected.website}
                </a>
              )}
              {selected.phone && (
                <div className="text-xs text-[#6B7280] mb-1">{selected.phone}</div>
              )}
              {selected.rating && (
                <div className="text-xs text-[#9CA3AF] mb-3">
                  {selected.rating} / 5 - {selected.user_ratings_total || 0} {t('yorum')}
                </div>
              )}

              {selected.reviews?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-[#374151] mb-2">{t('Yorumlar')}</div>
                  <div className="flex flex-col gap-2 mb-3">
                    {selected.reviews.map((rv, i) => (
                      <div key={i} className="border border-[#E5E7EB] rounded-md p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-[#111827]">{rv.author}</span>
                          <span className="text-xs text-[#9CA3AF]">{rv.rating}/5</span>
                          <span className="text-xs text-[#9CA3AF]">{rv.time}</span>
                        </div>
                        <div className="text-xs text-[#6B7280] line-clamp-3">{rv.text}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSentiment}
                    disabled={loadingSentiment}
                    className="text-xs text-[#6B7280] border border-[#E5E7EB] rounded-md px-3 py-1.5 hover:bg-[#F9FAFB] disabled:opacity-50 mb-2"
                  >
                    {loadingSentiment ? t('Analiz ediliyor...') : t('Sentiment Analizi')}
                  </button>

                  {sentiment && (
                    <div className="bg-[#F3F4F6] rounded-md p-3 text-xs text-[#374151]">
                      {sentiment}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
