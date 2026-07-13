# Universal Credit Model + Landing Improvements — Design

**Tarih:** 2026-07-13
**Durum:** Onay bekliyor (kapsam gözden geçirilecek)
**Kapsam:** (A) Tüm planları tek "kredi" birimine standartlaştırmak, (B) landing fiyat gösterimini krediye çevirmek, (C) landing de-slop iyileştirmeleri.

Mevcut gerçek: Sadece **reveal** krediyle ölçülüyor (`user_credits`). AI email, SEO, lead/Maps kodda limitsiz (plan farkları pazarlama). Kredi helper'ları `email-finder.js` içinde local. Frontend'de bakiye yalnızca Email Bulucu'da.

---

## A. Evrensel kredi sistemi

**Tek kredi havuzu:** `user_credits` (monthly_limit = aylık kredi hakkı, used_this_month). Zaten var; reveal düşüyor.

**Kredi menüsü — HER AI/üretim işleminde kredi düşer (kullanıcı kararı):**
| Endpoint | Kredi |
|---|---|
| `email-finder /reveal`, `/bulk-reveal` (kişi başına) | 1 (mevcut) |
| `email-finder /compose` | 1 |
| `email-finder /auto-outreach` | 1 |
| `ai /generate` | 1 |
| `ai /research` | 1 |
| `seo POST /` (makale oluştur) | 5 |
| `seo /:id/translate` | 1 |
| `seo /:id/check` (SEO skor) | 1 |
| `competitors /:id/analyze` | 2 |
| `maps /search` (lead arama) | 1 |
| `maps /details` | 1 |
| `maps /sentiment` (yorum analizi) | 1 |
| `profile /analyze` | 1 |

Uygulama deseni: her endpoint başında `getOrCreateCredits` → yetersizse `402 { error: 'Yetersiz kredi...' }`, işlem başarılıysa sonunda `deductCredit(db, userId, amount)`. Reveal zaten böyle.

**Plan aylık kredi hakları** (fiyatlar sabit): free 25 · pro 250 · growth 600 · team 600/kişi. (PLAN_LIMITS sayıları aynı; artık "reveal" değil "kredi".)

**Backend değişiklikleri:**
- Yeni `lib/credits.js`: `getOrCreateCredits`, `deductCredit(db, userId, amount=1)`, `getNextResetDate`, `PLAN_LIMITS`, `hasCredits(credits, amount)`. `email-finder.js`'ten taşınır + import edilir. `deductCredit` artık miktar parametresi alır.
- Kredi düşümü + yetersizlik kontrolü eklenir:
  - `email-finder.js` `/compose` ve `/auto-outreach` → 1 kredi (email üretiminden önce kontrol, sonra düş).
  - `seo.js` makale üreten endpoint → 5 kredi.
  - `maps.js` lead ekleme endpoint → 1 kredi (lead başına).
  - Yetersiz kredi → `402`/`403` `{ error: 'Yetersiz kredi. Paketinizi yükseltin.' }`.
- Reveal düşümü aynı kalır (1 kredi).

**Frontend — bakiyeyi tutarlı göster:**
- Sidebar footer'a veya Dashboard başına küçük "**X / Y kredi**" göstergesi (mevcut `GET /email-finder/credits` yeniden kullanılır; endpoint jenerik olduğu için isim değişmez ama credits.js'e dayanır). Böylece bakiye sadece Email Bulucu'da değil her yerde.

---

## B. Landing fiyat gösterimi (kredi)

- 4 plan kartının özellik listeleri **"X kredi/ay"** ile başlar, sonra ana özellikler (karışık birim yok):
  - Starter: `25 kredi/ay`, `CRM Pipeline`, `1 kullanıcı`
  - Pro: `250 kredi/ay`, `Email Finder`, `Rakip Analizi`, `Sınırsız pipeline`
  - Growth: `600 kredi/ay`, `API erişimi`, `Öncelikli destek`, `Tüm Pro`
  - Team: `600 kredi/kullanıcı/ay`, `Ekip işbirliği`, `Yönetici paneli`, `Rol bazlı erişim`
- Kartların altına küçük **kredi lejantı**: "1 reveal = 1 kredi · 1 AI email = 1 kredi · 1 SEO makale = 5 kredi · 1 lead = 1 kredi".
- Pay-as-you-go kartı zaten kredi — aynen kalır.

---

## C. Landing de-slop (renk/animasyon KORUNUR)

- **Orta sayfadaki büyük mavi gradyan blok** (sadece logo + "POWERED BY ATAOL AI TECHS"): kaldırılır veya daha anlamlı bir bant yapılır. → Öneri: kaldır (dolgu hissi).
- **STATS**: "28 Dil Desteği" tutarsız (landing 2 dil) → değiştir. Yeni STATS önerisi: `14+ Entegre Modül` · `Doğrulanmış Email` (MX yerine) · `1-Click Otomatik Outreach` · `6 Adımlı SEO`. ("28 dil" çıkar.)
- **Hero başlığı**: biraz daha spesifik/benefit odaklı bir alternatif önerilir (kesin metin spec review'da netleşir; marka sesi korunur).
- Dekoratif uçuşan ikonlar, gradyanlar, animasyonlar, renk paleti **aynen** kalır.

---

## Kapsam notu (gözden geçir)
En büyük iş **A'daki backend kredi düşümü** (4 route). "Model first, payment later" ilkesiyle istersen A'yı ikiye bölebiliriz:
- **A1 (kesin):** kredi helper'larını `lib/credits.js`'e taşı + landing/model kredi gösterimi (B) + bakiye UI.
- **A2 (opsiyonel/ertelenebilir):** AI/SEO/Maps'e gerçek kredi düşümü.
Ücretli kullanıcı ve tahsilat henüz yokken A2'nin aciliyeti düşük. Ama "tam tutarlılık" için A2 de yapılır. Kararı spec review'da ver.
