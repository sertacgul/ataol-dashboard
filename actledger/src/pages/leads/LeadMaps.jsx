import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

export default function LeadMaps() {
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

  async function handleSaveLead() {
    if (!selected) return
    setSavingLead(true)
    try {
      const data = await api.post('/leads', {
        name: selected.name,
        website: selected.website || null,
        country: selected.address || null,
        source: 'maps',
        notes: sentiment || null,
      })
      navigate(`/app/leads/${data.id}`)
    } catch (err) {
      setError(err.message)
      setSavingLead(false)
    }
  }

  return (
    <div>
      <h1 className="text-base font-semibold text-[#111827] mb-4">Maps'ten Firma Bul</h1>

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
          {searching ? 'Aranıyor...' : 'Ara'}
        </button>
      </form>

      {error && (
        <div className="text-xs text-[#EF4444] mb-3">{error}</div>
      )}

      <div className="flex gap-4">
        {/* Sol: Sonuçlar */}
        <div className="w-1/2 flex flex-col gap-2">
          {results.length === 0 && !searching && (
            <div className="text-xs text-[#9CA3AF]">Arama yapın.</div>
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
                  {place.rating} / 5 — {place.user_ratings_total || 0} yorum
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Sağ: Detay */}
        <div className="w-1/2">
          {loadingDetails && (
            <div className="text-xs text-[#9CA3AF]">Yükleniyor...</div>
          )}
          {selected && !loadingDetails && (
            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="text-sm font-semibold text-[#111827]">{selected.name}</div>
                <button
                  onClick={handleSaveLead}
                  disabled={savingLead}
                  className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5 flex-shrink-0 disabled:opacity-50"
                >
                  {savingLead ? 'Kaydediliyor...' : 'Lead Olarak Kaydet'}
                </button>
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
                  {selected.rating} / 5 — {selected.user_ratings_total || 0} yorum
                </div>
              )}

              {selected.reviews?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-[#374151] mb-2">Yorumlar</div>
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
                    {loadingSentiment ? 'Analiz ediliyor...' : 'Sentiment Analizi'}
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
