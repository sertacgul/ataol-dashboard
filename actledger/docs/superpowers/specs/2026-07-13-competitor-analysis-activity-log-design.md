# Rakip Analizi Derinleştirme + Evrensel Aktivite Logu — Design

**Tarih:** 2026-07-13
**Durum:** Onaylandı, implementasyona hazır
**Kapsam:** (A) Rakip Analizi (Harvey Ball + terminoloji + kendi firma karşılaştırması + gelişim alanları), (B) evrensel modül aktivite logu + "Geçmiş" sayfası, (C) email bulucu arama geçmişi. Google Maps API key zaten secret olarak eklendi (canlı).

---

## A. Rakip Analizi (derin)

**Backend — `competitors.js` `POST /:id/analyze`:** Gemini prompt'u zenginleştirilir (grounding ile). `company_profiles` (kendi firma) bağlamı dahil. Yeni JSON çıktısı:
```json
{
  "name": "...", "sector": "...", "description": "3-4 cümle", "target_market": "...",
  "strengths": ["..."], "weaknesses": ["..."], "opportunities": ["..."],
  "scores": {
    "competitor": { "product_quality": 0-4, "price_competitiveness": 0-4, "market_reach": 0-4, "brand_awareness": 0-4, "innovation": 0-4, "customer_experience": 0-4 },
    "own": { "product_quality": 0-4, ... }
  },
  "competitor_position": "Pazar Lideri|Meydan Okuyan|Takipçi|Niş Oyuncu",
  "own_position": "Pazar Lideri|Meydan Okuyan|Takipçi|Niş Oyuncu",
  "position_summary": "Kendi firmanın rakibe göre konumu (2-3 cümle)",
  "improvement_areas": ["Aksiyon alınabilir gelişim alanı 1", "..."]
}
```
Puanlar **0-4** (Harvey Ball 5 durumu: boş/çeyrek/yarım/üççeyrek/dolu = skor/4). Kendi firma puanı `company_profiles` yoksa AI en iyi tahminle veya "own" null döner (frontend graceful). Sonuç `competitors.analysis` (mevcut JSON string kolonu) içine yazılır — migration gerekmez.

**Frontend — `Competitors.jsx`:**
- Yeni `HarveyBall` bileşeni (SVG, `value` 0-4 → dolum). 6 boyut için rakip vs sen yan yana tablo (2 Harvey Ball sütunu + boyut adı).
- Terminoloji rozetleri: rakip konumu + senin konumun (renkli badge).
- "Konumun" özeti paragrafı + "Geliştirmen gereken alanlar" madde listesi.
- `strengths/weaknesses/opportunities` mevcut gösterim korunur/uyarlanır.

**Boyut etiketleri (TR):** Ürün/Hizmet Kalitesi · Fiyat Rekabetçiliği · Pazar Erişimi · Marka Bilinirliği · İnovasyon · Müşteri Deneyimi.

---

## B. Evrensel aktivite logu

**DB (`migration-activity-log.sql`):**
```sql
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  title TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id, created_at);
```

**Helper (`lib/activity.js`):** `export async function logActivity(db, userId, { module, action, title, detail })` — `detail` obje ise JSON.stringify. Hata durumunda sessizce geç (log yazımı ana işlemi bozmamalı; `.catch(()=>{})`).

**Kredi harcayan/önemli aksiyonlar loglanır** (module, action, title, detail):
| Endpoint | module | action | title |
|---|---|---|---|
| email-finder /search | email-finder | search | firma adı/domain |
| email-finder /reveal | email-finder | reveal | kişi adı @ firma |
| email-finder /compose, /auto-outreach | outreach | compose | alıcı/firma |
| ai /generate, /research | ai | generate/research | konu |
| seo /:id/translate, /check | seo | translate/check | makale başlığı |
| competitors /:id/analyze | competitors | analyze | rakip adı |
| maps /search | maps | search | sorgu |
| profile /analyze | profile | analyze | website |
`detail` alanına sonucun özeti/snapshot'ı (email bulucu için firma + kişiler).

**Yeni route (`activity.js`), `index.js`'e `app.route('/activity', ...)`:**
- `GET /activity?module=&page=&limit=` → sayfalı log (user'a scoped, created_at DESC).
- `GET /activity/:id` → tek kayıt detayı (user doğrulaması).
Auth middleware kullanır.

**Frontend — yeni "Geçmiş" sayfası + route `/app/history` + Sidebar nav öğesi:**
- Modül + tarih filtresi, sayfalı liste (modül ikonu, başlık, tarih).
- Bir kayda tıklayınca detay paneli (JSON'dan okunaklı gösterim). Email bulucu/rakip kayıtları için ilgili modüle "aç" bağlantısı.

---

## C. Email bulucu arama geçmişi

- B'nin özel hali: `/search` her aramada `activity_log`'a `module=email-finder, action=search, title=firma, detail={company, people snapshot}` yazar.
- `EmailFinder.jsx`'e **"Arama Geçmişi"** açılır paneli: `GET /activity?module=email-finder&action=search` ile aranan firmaları listeler; tıklayınca o domaini tekrar aratır (cache'ten anında gelir) → kullanıcı eski firma bilgisine tekrar bakar.
- Reveal'lar zaten `email_reveals`'ta; CSV export mevcut.

---

## Sıra
1. DB migration (activity_log) 2. `lib/activity.js` 3. activity route + index wiring 4. logActivity'yi tüm endpoint'lere bağla 5. Competitor analyze backend (zengin JSON) 6. HarveyBall + Competitors.jsx 7. Geçmiş sayfası + route + nav 8. Email bulucu arama geçmişi paneli.

## Deploy
- Remote D1: `migration-activity-log.sql`. Worker deploy. Frontend: `npm run build` + `wrangler pages deploy dist --project-name askdesk-app --branch main`.
