# Email Finder — Prospeo Yedek Sağlayıcı (Faz 2)

**Tarih:** 2026-07-29
**Durum:** Onaylandı, implementasyona hazır
**Kapsam:** Hunter.io ücretsiz kotası (aylık 50 arama) bittiğinde mail bulucu kalitesinin zayıf scrape+pattern motoruna çökmemesi için, waterfall'a güçlü bir ikinci katman (Prospeo) eklemek.

---

## 1. Amaç ve Non-Goals

### Amaç
Bugün waterfall `Hunter → free` şeklinde. Hunter'ın ücretsiz kotası bitince her arama `catch` ile zayıf `free` motoruna düşüyor; kişi listesi ve mail kalitesi çöküyor. Araya kendi ücretsiz katmanı olan güçlü bir sağlayıcı (Prospeo) koyarak hem kaliteyi koruyoruz hem de toplam ücretsiz kapasiteyi büyütüyoruz (Hunter 50 + Prospeo 75 kredi/ay).

### Bu fazda YAPILACAK
- `PROSPEO_API_KEY` secret varsa Prospeo'yu waterfall'ın **ikinci katmanı** olarak bağlamak (`Hunter → Prospeo → free`).
- Prospeo'nun **iki adımlı** yeni API'sini AskDesk'in mevcut "ara → tek tek reveal et" akışına oturtmak:
  - `search-person` → `domainSearch` (kişi listesi, mailsiz).
  - `enrich-person` → `/reveal` ve `/bulk-reveal` (kişi başına gerçek doğrulanmış mail).
- Kullanıcının sağlayıcıyı hiç görmemesi (OperIQ AI markası korunur).
- Birim testleri + deploy sonrası canlı probe.

### Bu fazda YAPILMAYACAK
- Firmalar arası çapraz arama ("İstanbul'daki fintech Satış Direktörleri"). Bu, hafızadaki *orijinal* Faz 2; ayrı ve büyük bir özellik, bu spec kapsamında değil.
- Hunter'ı ücretli plana geçirmek (ayrı, kod-dışı karar).
- Prospeo'yu birincil doğrulayıcı yapmak. Doğrulama zinciri `MillionVerifier → Hunter → free` aynen kalır; Prospeo `enrich-person` zaten doğrulanmış mail döndürdüğü için reveal'da ek doğrulama gerekmez.

### Bilinen kısıt
Prospeo eski `domain-search`/`email-finder` endpoint'lerini **1 Mart'ta kaldırıyor**. Bu yüzden en baştan yeni API (`search-person` + `enrich-person`) üzerine kuruyoruz; deprecated uçlara hiç dokunmuyoruz.

---

## 2. Prospeo Yeni API — Referans

Tüm çağrılar: `POST`, header `X-KEY: <api_key>` + `Content-Type: application/json`. Yanıt daima `{ error: boolean, ... }`. Kodlar: 200 ok, 400 hata, 401 geçersiz anahtar, 429 rate limit.

### `POST https://api.prospeo.io/search-person` (1 kredi/arama)
Firmadaki kişileri filtreyle döndürür. **Mail DÖNDÜRMEZ.**

İstek:
```json
{ "page": 1, "filters": { "company": { "websites": { "include": ["deloitte.com"] } } } }
```
Yanıt:
```json
{
  "error": false,
  "results": [ { "person": { ...Person }, "company": { ...Company } } ],
  "pagination": { "current_page": 1, "per_page": 25, "total_page": 11, "total_count": 271 }
}
```
`Person` (mail/mobil hariç): `person_id`, `first_name`, `last_name`, `full_name`, `linkedin_url`, `headline`, `current_job_title`, `job_history[]` (her biri: `title`, `company_name`, `current`, `seniority`, `departments[]`).

### `POST https://api.prospeo.io/enrich-person` (1 kredi/eşleşme; mobil istenirse 10)
Tek kişiyi zenginleştirir, **doğrulanmış** mail açar.

İstek (person_id ile — search'ten gelir):
```json
{ "data": { "person_id": "..." }, "only_verified_email": true }
```
İstek (isim + domain ile — auto-outreach yolu):
```json
{ "data": { "first_name": "Eva", "last_name": "Kiegler", "company_website": "intercom.com" }, "only_verified_email": true }
```
Yanıt:
```json
{
  "error": false,
  "person": {
    "full_name": "Eoghan Mccabe",
    "current_job_title": "CEO...",
    "email": { "status": "VERIFIED", "revealed": true, "email": "eoghan@intercom.com" }
  },
  "company": { "name": "Intercom", "website": "https://intercom.com" }
}
```
`email.status` ∈ { `VERIFIED`, `UNAVAILABLE` }.

> **Canlı probe ile teyit edilecek (dokümanlar örnekte maili maskeliyor):**
> 1. Kredi harcanınca `email.email` **tam** adresi mi döndürüyor (yoksa hep maskeli mi).
> 2. `only_verified_email: true` doğrulanmış mail yoksa kredi yakmıyor / `UNAVAILABLE` mı dönüyor.
> 3. `job_history[].seniority` sözlüğü (`C-Suite`/`VP`/`Director`/`Manager`/...) — `mapSeniority` haritasını buna göre kesinleştir.

---

## 3. Mimari

```
Worker route (routes/email-finder.js)
  │  /search → domainSearch      /reveal, /bulk-reveal → revealProviderEmail | findVerifiedEmail
  ▼
Provider Orchestrator (index.js, waterfall)
  ├── HunterProvider    (HUNTER_API_KEY)      birincil
  ├── ProspeoProvider   (PROSPEO_API_KEY)     ikincil  ← YENİ
  └── FreeProvider      (fallback: scrape + Gemini + pattern)
```

Sağlayıcı sırası her metod için: **Hunter → Prospeo → free**. Bir sağlayıcı boş/hata dönerse sonrakine geçilir.

---

## 4. Bileşenler

### 4.1 `enrichment/prospeo.js` (YENİ) — `hunter.js` deseninde
`createProspeoProvider(apiKey, { classifySeniority, classifyDepartment })` şu arayüzü döndürür:

- `async domainSearch(domain, { limit } = {})`
  `POST /search-person`, `filters.company.websites.include:[domain]`, `page:1`. `results[]` → kişi listesi:
  ```
  {
    first_name, last_name, name (full_name),
    title: current_job_title,
    seniority: mapSeniority(current job_history seniority, classifySeniority(title)),
    department: mapDepartment(current job_history departments[0], classifyDepartment(title)),
    email: null,            // Prospeo search mail vermez
    email_type: 'personal',
    confidence: 0,
    linkedin: linkedin_url,
    prospeo_person_id: person_id,   // reveal için taşınır
    source: 'prospeo',
  }
  ```
  `company`: `results[0].company` → `{ name, domain, sector: industry, location, ... }`.
  Dönüş: `{ company, people }`. (Boş `results` → `{ company, people: [] }`; orchestrator free'ye düşer.)

- `async revealEmail(person)`
  `POST /enrich-person`, `{ data: { person_id: person.prospeo_person_id }, only_verified_email: true }`.
  `email.status === 'VERIFIED'` ve mail varsa → `{ email, verification_status: 'verified', confidence: 90, source: 'prospeo' }`; yoksa `null`.

- `async findEmail(firstName, lastName, domain)`
  `POST /enrich-person`, `{ data: { first_name, last_name, company_website: domain }, only_verified_email: true }` → `{ email, confidence, source: 'prospeo' }` veya `null`. (auto-outreach waterfall'ı için.)

- HTTP !ok → `err.status` set edilip `throw` (orchestrator `catch` ile bir sonraki sağlayıcıya düşer). 429/401 dahil.

### 4.2 `enrichment/index.js` (orchestrator) değişiklikleri
- `const prospeo = env.PROSPEO_API_KEY ? createProspeoProvider(env.PROSPEO_API_KEY, helpers) : null`
- `domainSearch`: Hunter denemesinden sonra, free'den önce Prospeo denemesi (`people.length` varsa `sortPeople` + `provider:'prospeo'`).
- `findEmail`: Hunter'dan sonra, free'den önce Prospeo denemesi.
- **Yeni metod** `async revealProviderEmail(person)`:
  ```
  if (person?.source === 'prospeo' && prospeo && person.prospeo_person_id) {
    try { return await prospeo.revealEmail(person) } catch { /* düş */ }
  }
  return null
  ```
- `verifyEmail` **değişmez** (`MillionVerifier → Hunter → free`).

### 4.3 `routes/email-finder.js` değişiklikleri
- **`/reveal`**, `else if (!email)` dalı: önce sağlayıcı reveal'ı dene, sonra pattern fallback:
  ```
  let found = null
  if (person.source === 'prospeo') found = await enrichment.revealProviderEmail(person).catch(() => null)
  if (!found?.email) found = await enrichment.findVerifiedEmail(person.name, domain, c.env.DB)
  ```
  Gerisi mevcut mantık (email set, verification_status, saveLearnedPattern, kredi düşümü) aynen.
- **`/bulk-reveal`**: bugün `!person.email` olan kişileri atlıyor (satır ~286). Prospeo kişilerinin maili sonradan açıldığı için, bu filtreyi Prospeo kişilerini **dahil edecek** şekilde güncelle: `person_id` taşıyan Prospeo kişileri de `toReveal`'a girer; her biri için reveal anında `revealProviderEmail` → başarısızsa `findVerifiedEmail`. Kredi **yalnızca mail başarıyla açılınca** düşer (başarısız enrich atlanır, ücretlendirilmez). Ön kredi kontrolü `toReveal.length` üzerinden kalır (üst sınır tahmini; gerçek düşüm başarılı açılış sayısıdır).

### 4.4 Cache — şema değişikliği YOK
`domain_cache.people` kişilerin tam JSON'unu tuttuğu için `prospeo_person_id` ve `source:'prospeo'` otomatik saklanır ve reveal'da geri okunur. `emails_raw` Prospeo domainlerinde boş olur (mailsiz) — sorun değil.

---

## 5. Veri Akışı (Hunter kotası dolu senaryosu)

1. `/search domain` → cache miss → orchestrator `domainSearch`: Hunter throw (kota) → Prospeo `search-person` (1 kredi) → 25 kişi (mailsiz, `person_id`+`source:'prospeo'`) → `sortPeople` → cache'e yazılır.
2. UI maskeli kişileri gösterir (mail yok, "reveal" bekliyor).
3. Kullanıcı bir kişiye `/reveal` → `person.source==='prospeo'` → `revealProviderEmail` → `enrich-person` (1 kredi) → doğrulanmış mail → `email_reveals`'a yaz + 1 AskDesk kredisi düş.
4. Prospeo enrich başarısızsa → `findVerifiedEmail` (pattern+MillionVerifier) fallback.
5. Prospeo `search-person` de boş/hata → free motor (graceful degradation).

---

## 6. Test Stratejisi

- **`enrichment/prospeo.test.js`** (vitest, `hunter.test.js` deseni; `fetch` mock):
  - `search-person` mapping: kişi çıkarımı, `email:null`, `prospeo_person_id`, seniority/department normalize, company mapping.
  - `revealEmail`: `VERIFIED` → mail döner; `UNAVAILABLE`/mailsiz → `null`.
  - `findEmail`: mail döner / `null`.
  - Hata: 429/401 → `throw` (fallback tetiklenir).
- **`index.test.js`**: waterfall'da Prospeo katmanı — Hunter throw + Prospeo dolu → `provider:'prospeo'`; Hunter+Prospeo boş → free.
- **Deploy sonrası canlı probe**: gerçek `PROSPEO_API_KEY` ile bilinen bir domainde `search-person` kişi getiriyor mu + `enrich-person` gerçek (maskesiz) mail açıyor mu; Bölüm 2'deki 3 teyit noktası.

---

## 7. Deploy

1. `wrangler secret put PROSPEO_API_KEY` (Sertac anahtarı verir).
2. `cd workers/askdesk-api && npx wrangler deploy`.
3. Canlı probe (Bölüm 6).
4. İsteğe bağlı: bug-dönemi bayat kayıtlar için `DELETE FROM domain_cache WHERE provider='free'` — Prospeo'nun yeniden doldurması için (7 gün TTL beklemeden).

---

## 8. Riskler

| Risk | Etki | Önlem |
|---|---|---|
| `enrich-person` tam mail yerine maskeli dönerse | Reveal işe yaramaz | Canlı probe ilk iş; maskeliyse plan revize (only_verified + kredi davranışı netleşene dek deploy yok) |
| Prospeo seniority sözlüğü farklı | Sıralama/etiket yanlış | `mapSeniority` fallback zaten `classifySeniority(title)` ile telafi eder; probe'da doğrula |
| 75 kredi overflow için yetmezse | Prospeo de free'ye düşer | Zaten graceful degradation var; izlenir, gerekirse ücretli plan (kod-dışı) |
| `search-person` firma domainini tanımazsa boş döner | O domainde free'ye düşülür | Beklenen davranış; kayıp yok |
