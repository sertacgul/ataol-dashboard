# Email Finder — Hunter.io Entegrasyonu (Faz 1)

**Tarih:** 2026-07-12
**Durum:** Onaylandı, implementasyona hazır
**Kapsam:** AskDesk mail bulucunun başarı oranını Apollo.io seviyesine yaklaştırmak — Faz 1: ücretsiz motor revizyonu + Hunter.io birincil sağlayıcı.

---

## 1. Amaç ve Non-Goals

### Amaç
Mevcut mail bulucu (tek firma tara → scrape + Gemini + `first.last` pattern tahmini → MX/catch-all "tahmini" doğrulama) yerine, gerçek veriyle çalışan, doğrulanmış email döndüren bir motor.

### Bu fazda YAPILACAK
- Hunter.io'yu birincil veri + doğrulama sağlayıcısı olarak bağlamak.
- Ücretsiz motoru (scrape/LLM/pattern) Hunter'ın gerisinde bir **fallback** olarak korumak ve güçlendirmek (pattern öğrenme + Gemini grounding).
- Sağlayıcıları soyutlayan **waterfall** arayüzü (ileride ikinci sağlayıcı eklenebilir).
- Maliyet kontrolü (cache + mevcut kredi sistemi).

### Bu fazda YAPILMAYACAK (Faz 2 — ayrı spec)
- **Firmalar arası arama** ("İstanbul'daki fintech Satış Direktörleri" gibi çapraz sorgu). Apollo'nun asıl özü; birikimli veritabanı veya Hunter Discover gerektirir. Faz 1 bittikten sonra.
- Kullanıcının kendi API anahtarını girmesi.

### Bilinen teknik kısıt
Cloudflare Workers 25. porta (SMTP) giden bağlantıyı engeller. Gerçek SMTP doğrulaması Worker içinden yapılamaz; bu yüzden gerçek "verified" durumu Hunter'ın (itibarı yönetilen altyapısı) üzerinden gelir. Ücretsiz fallback doğrulaması heuristik kalır.

---

## 2. Mimari Genel Bakış

```
UI (EmailFinder.jsx)
  │  POST /email-finder/search, /reveal, /bulk-reveal, /verify
  ▼
Worker route (routes/email-finder.js)
  │
  ▼
Provider Orchestrator (waterfall)
  ├── HunterProvider   (HUNTER_API_KEY varsa birincil)
  └── FreeProvider     (fallback: scrape + Gemini grounding + pattern)
        │
        ▼
  Normalized Person[]  →  domain_cache / domain_patterns / email_reveals (D1)
```

Sağlayıcı seçimi: `HUNTER_API_KEY` secret **varsa** Hunter birincil, yoksa doğrudan Free. Hunter çağrısı hata verir veya boş dönerse Free'ye düşülür. Kullanıcıya sağlayıcı adı **asla** gösterilmez (hata mesajları dahil) — tümü "OperIQ AI".

---

## 3. Provider Arayüzü

Her sağlayıcı aynı üç fonksiyonu uygular ve **normalize** veri döner:

```
domainSearch(domain, { limit }) -> { company, people: NormalizedPerson[] }
findEmail(firstName, lastName, domain) -> { email, confidence, source } | null
verifyEmail(email) -> { status, confidence, source }
```

### NormalizedPerson (tek doğruluk kaynağı — cache + UI aynı şekli görür)
```
{
  first_name, last_name, name,
  title,                // position
  department,           // AskDesk etiketleri (bkz. 6.2)
  seniority,            // AskDesk etiketleri (bkz. 6.2)
  email,                // null olabilir
  email_type,           // "personal" | "generic"
  confidence,           // 0-100
  phone,                // null olabilir
  linkedin,             // null olabilir
  sources,              // URL[] (opsiyonel)
  verification_status,  // "verified" | "likely" | "risky" | "unknown"
  source,               // "hunter" | "website" | "pattern"
}
```

---

## 4. Akışlar

### 4.1 /search
1. Domain çözümle (mevcut mantık — input/company_id/query→Gemini).
2. `domain_cache`'e bak; taze (≤7 gün) ise dön.
3. Taze değilse **paralel**:
   - `provider.domainSearch(domain)` → gerçek kişiler (Hunter) veya scrape+LLM (Free).
   - Ücretsiz `scrapeWebsite(domain)` → firma açıklaması/sektör + Hunter'ın kaçırdığı email/telefon.
4. **Merge + dedupe** (email küçük harf, yoksa isim bazlı). Hunter kaydı website kaydını ezer. Company info: Hunter organization + scrape açıklaması birleşimi.
5. `domain_cache`'e yaz (`provider` alanıyla).
6. Kullanıcının mevcut reveal'larını işaretle, maskeli döndür (mevcut maskeleme korunur).

### 4.2 /reveal ve /bulk-reveal
- Email zaten `domainSearch`'ten geldi. Reveal: maskeyi aç + kredi düş + `email_reveals`'a yaz (`verification_status`, `confidence`, `source` normalize alanlardan).
- Emailsiz kişi (email=null) reveal edilirse: `provider.findEmail(first, last, domain)` çağrılır; bulunamazsa hata ("Bu kişi için email bulunamadı"), **kredi düşülmez**.
- Kredi kontrolü, "already revealed" ve idx mantığı mevcut haliyle korunur.

### 4.3 /verify
- **Karar #2:** Hunter kaynaklı email'ler reveal anında zaten `verification_status` taşır; ayrı doğrulama gerektirmez.
- Manuel "Doğrula" butonu **sadece** `source !== "hunter"` (fallback) emailleri için görünür.
- Butona basılınca `provider.verifyEmail(email)` → Hunter Email Verifier (anahtar varsa) veya heuristik. Sonuç `email_reveals`'a yazılır.
- **Karar #1:** "+5 kredi ödülü" mekaniği **kaldırılır** (verify artık gerçek maliyetli). `/verify` yalnızca durumu günceller, kredi vermez.

---

## 5. Ücretsiz Motor İyileştirmeleri

### 5.1 Pattern öğrenme (`domain_patterns` tablosu)
- Bir domainde gerçek, doğrulanmış bir personal email görülünce (Hunter personal veya scrape'te siteye eşleşen), kalıbı çöz: `first.last`, `firstlast`, `f.last`, `first`, `first_last`, `flast`...
- En sık görülen kalıbı `domain_patterns`'a yaz (confidence + örnek email).
- Free `findEmail`: `first.last` varsayımı yerine öğrenilen kalıbı kullanır. Ayrıca Hunter'a gitmeden ucuz tahmin sağlar.

### 5.2 Gemini Google Search grounding
- FreeProvider'daki Gemini `generateContent` çağrılarına `tools: [{ google_search: {} }]` eklenir (gemini-2.5-flash destekler).
- Sonuç: eğitim bilgisiyle bayat/hallüsinasyon yerine güncel, gerçek kişiler. Prompt "yalnızca emin olduğun kişiler" kısıtı korunur.

---

## 6. Hunter Alan Eşlemeleri

### 6.1 Endpoint'ler
- Domain Search: `GET https://api.hunter.io/v2/domain-search?domain=&api_key=&limit=100`
- Email Finder: `GET /v2/email-finder?domain=&first_name=&last_name=&api_key=`
- Email Verifier: `GET /v2/email-verifier?email=&api_key=`
- Kredi: Domain Search en az 1 sonuç dönerse 1 sorgu sayılır; Email Finder bulamazsa ücretsiz; Verifier her çağrıda ücretli. Rate limit: 15 req/s (verifier 10).

### 6.2 Eşleme tabloları
**Seniority** (Hunter → AskDesk): `executive`→`C-Level`, `senior`→`Manager`, `junior`→`Staff`. Ek olarak `classifySeniority(position)` çalıştırılır; Staff dışı daha spesifik sonuç verirse o tercih edilir.

**Department** (Hunter → AskDesk): `executive`→`Other`, `it`→`Engineering`, `finance`→`Finance`, `management`→`Operations`, `sales`→`Sales`, `hr`→`HR`, `marketing`→`Marketing`, `operations`→`Operations`, `support`→`Operations`, `communication`→`Marketing`, `legal`→`Legal`. Eşleşmezse `classifyDepartment(position)`.

**Verification status** (Hunter → rozet):
- `verification.status = valid` → `verified`
- `confidence ≥ 90` (status yoksa) → `verified`
- `confidence 50–89` → `likely`
- `accept_all` / `disposable` → `risky`
- `confidence < 50` / `invalid` → `risky`
- `webmail` (gmail vb. personal) → `likely`
- `unknown` / `pending` / veri yok → `unknown`

`confidence` (0-100) doğrudan `confidence_score` olarak saklanır.

---

## 7. Veritabanı Değişiklikleri (`migration-email-finder-v3.sql`)

```sql
-- Öğrenilen email kalıpları (domain başına)
CREATE TABLE IF NOT EXISTS domain_patterns (
  domain TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,            -- ör. "first.last"
  confidence INTEGER NOT NULL DEFAULT 0,
  sample_email TEXT,
  learned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- domain_cache: hangi sağlayıcıdan geldiğini bilmek için
ALTER TABLE domain_cache ADD COLUMN provider TEXT DEFAULT 'free';
```

`domain_cache.people` zaten JSON; zenginleştirilmiş NormalizedPerson şeması ek sütun gerektirmeden sığar. Cache TTL 24s → **7 gün** (kodda sabit `CACHE_TTL_HOURS`).

`email_reveals` şeması değişmez (`verification_status`, `confidence_score`, `source` mevcut).

---

## 8. Konfigürasyon ve Güvenlik
- `HUNTER_API_KEY` — Worker secret (`wrangler secret put HUNTER_API_KEY`). Yoksa sistem otomatik Free moda düşer (bozulmaz).
- API anahtarı ve "Hunter" adı UI'da, ağ yanıtlarında veya hata mesajlarında **asla** görünmez. Tüm hatalar jenerik + OperIQ AI tonunda.
- Hunter yanıtındaki `sources` URL'leri opsiyonel; UI'da gösterilirse dış domain olarak işaretlenir (şimdilik gösterilmeyecek).

---

## 9. Maliyet Kontrolü
- Domain Search sonucu domain başına 7 gün cache → aynı domain için tekrar ödeme yok.
- Verifier sonucu `email_reveals`'ta saklanır; 30 gün içinde tekrar doğrulama yapılmaz.
- Reveal başına 1 uygulama kredisi (`user_credits`) — Hunter maliyetini monetize eder (**Karar #3**: maliyeti SaaS karşılar).
- Bulk-reveal'de Hunter emailleri zaten cache'te olduğundan ek Hunter çağrısı yok; yalnızca emailsiz kişiler `findEmail` tetikler.

---

## 10. Hata Yönetimi
- Hunter 401/403 (anahtar geçersiz) → logla, Free'ye düş, kullanıcıya normal sonuç.
- Hunter 429 (rate limit) → kısa retry (1x), sonra Free fallback.
- Hunter boş sonuç → Free fallback (yine boşsa mevcut "fonksiyonel email" davranışı: info@, sales@...).
- Gemini hatası → mevcut try/catch davranışı korunur.
- `findEmail` bulamazsa reveal'da kredi düşülmez.

---

## 11. Test / Doğrulama
- Provider orchestrator birim testi: anahtar var/yok, Hunter boş, Hunter hata → doğru fallback.
- Alan eşleme testleri (seniority/department/verification map).
- Pattern öğrenme testi: bilinen email → doğru kalıp çıkarımı.
- Manuel: gerçek bir domainle `/search` → `/reveal` → doğrulama durumu; UI'da sağlayıcı sızıntısı olmadığının kontrolü.
- Free mod (anahtar silinmiş) uçtan uca çalışmalı (regresyon yok).

---

## 12. Faz 1 Bileşen Listesi (implementasyon planına girdi)
1. `lib/enrichment/` altında: `normalize.js` (şema + eşlemeler), `hunter.js`, `free.js`, `index.js` (orchestrator).
2. `routes/email-finder.js` — `/search`, `/reveal`, `/bulk-reveal`, `/verify` orchestrator'ı kullanacak şekilde refactor.
3. `migration-email-finder-v3.sql` + apply.
4. Pattern öğrenme + `domain_patterns` yaz/oku.
5. Gemini grounding ekle (FreeProvider).
6. `EmailFinder.jsx` — Verify butonu koşulu (`source !== 'hunter'`), "+5 kredi" metinlerinin kaldırılması, doğrulama durumunun reveal'da anında gösterimi.
7. `HUNTER_API_KEY` secret + README/deploy notu.
