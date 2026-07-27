# Kampanya Kodları Modülü — Tasarım (Spec)

**Tarih:** 2026-07-27
**Proje:** AskDesk (`actledger` reposu = AskDesk frontend + `workers/askdesk-api`)
**Durum:** Onaylandı, implementation planı bekliyor

## Amaç

Super-admin'in (captsertacgul@gmail.com, `role='superadmin'`) firmalar için kampanya
indirim kodları ve ücretsiz kullanım voucher'ları tanımlayıp yönetebileceği bir modül.
`auth.js`'teki gömülü `DISCOUNT_CODES = { LAUNCH50: ... }` sabitinin yerini alır.

Üç kod tipi:
- **`percent`** — yüzde indirim (ör. %30)
- **`amount`** — sabit tutar indirim (ör. 50 USD)
- **`free_month`** — LAUNCH100 tarzı: N ay ücretsiz kullanım voucher'ı

Her kod: geçerlilik penceresi (başlangıç/bitiş tarihi), uygun planlar, toplam kullanım
limiti (opsiyonel), kullanıcı başına 1 kez kullanım.

## Mevcut mimari (değişmeden önce)

- **Planlar:** free / pro / growth / team (+ dahili unlimited). `PLAN_CREDITS` (`lib/credits.js`).
- **Kayıt:** `auth.js /register` 7 gün trial verir; `discount_code` alanını kabul eder.
- **Mevcut indirim:** `DISCOUNT_CODES = { LAUNCH50: { percent: 50, months: 3 } }` (gömülü).
  Kod kayıtta veya `POST /auth/redeem-code` ile girilir → `users.discount_percent`,
  `users.discount_expires_at`, `users.discount_code` yazılır.
- **Ödeme:** LemonSqueezy hosted checkout (`billing.js`). Planlar `VARIANTS`
  (`lib/billing-config.js`) ile LS variant_id'lerine bağlı. Checkout, kullanıcı uygun ise
  tek sabit `LS_DISCOUNT_CODE = 'LAUNCH50'` kodunu LS'ye geçer.
- **Super-admin paneli:** `routes/admin.js` (`role='superadmin'` gate'li) + frontend
  `src/pages/Admin.jsx` (overview + activity, 228 satır, sekmesiz tek sayfa).
- **Cron:** `wrangler.toml` `crons = ["*/15 * * * *"]` → `lib/trial-reminders.js`.

## Karar özeti (brainstorming'den)

1. **İndirim mekanizması:** Otomatik LemonSqueezy entegrasyonu. Modülde percent/amount kod
   tanımlanınca LS API ile LS'de indirim otomatik oluşturulur; checkout'ta uygulanır.
2. **Bedava ay modeli:** Hak biriktir + sonra aktive et. Kod girilince hesaba voucher
   tanımlanır; kullanıcı 3 ay (redeem penceresi) içinde istediği pakette aktive eder;
   1 aylık süre aktivasyon anında başlar.
3. **Ay sonu:** Tamamen dahili (LS'siz, kartsız). 1 ay sonunda otomatik `free` plana düşer.
4. **İndirim süresi:** Varsayılan `once` (ilk ödeme); kod bazında `forever` seçilebilir.
5. **Uygun planlar:** Varsayılan tüm ücretli planlar (pro/growth/team).
6. **Sabit tutar para birimi:** USD.

## Veri modeli

### Yeni migration: `src/db/migration-campaigns-v1.sql`

**`campaign_codes`**
```sql
CREATE TABLE IF NOT EXISTS campaign_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,           -- normalize: UPPERCASE, trim
  type TEXT NOT NULL,                  -- 'percent' | 'amount' | 'free_month'
  percent INTEGER,                     -- type=percent icin 1..100
  amount_cents INTEGER,                -- type=amount icin sabit indirim (USD cent)
  duration TEXT DEFAULT 'once',        -- indirim kodu icin: 'once' | 'forever'
  free_months INTEGER,                 -- type=free_month icin ( or. 1)
  redeem_window_days INTEGER,          -- type=free_month icin voucher aktivasyon penceresi (or. 90)
  eligible_plans TEXT DEFAULT 'all',   -- 'all' | JSON dizi (or. ["pro","growth"])
  starts_at TEXT,                      -- kampanya aktif pencere basi (null = hemen)
  ends_at TEXT,                        -- kampanya aktif pencere sonu (null = suresiz)
  max_redemptions INTEGER,             -- toplam kullanim limiti (null = limitsiz)
  redemptions_count INTEGER NOT NULL DEFAULT 0,
  ls_discount_id TEXT,                 -- LemonSqueezy discount id (percent/amount auto-create)
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**`campaign_redemptions`**
```sql
CREATE TABLE IF NOT EXISTS campaign_redemptions (
  id TEXT PRIMARY KEY,
  code_id TEXT NOT NULL,
  code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,                  -- kod tipinin snapshot'i
  status TEXT NOT NULL DEFAULT 'redeemed', -- 'redeemed' | 'activated' | 'expired'
  redeem_expires_at TEXT,             -- free_month voucher: bu tarihe kadar aktive edilmeli
  activated_at TEXT,                  -- bedava ay basladigi an
  plan_granted TEXT,                  -- bedava ay icin secilen plan
  free_until TEXT,                    -- bedava ay bitisi
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(code_id, user_id)            -- kullanici basina 1 kullanim
);
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_user ON campaign_redemptions(user_id);
```

**`users` ek kolonları**
```sql
ALTER TABLE users ADD COLUMN plan_expires_at TEXT;  -- kampanya bedava ay bitisi
ALTER TABLE users ADD COLUMN plan_source TEXT;      -- 'campaign' iken cron free'ye dondurur
```

**Seed** (migration sonunda):
- `LAUNCH100`: type=free_month, free_months=1, redeem_window_days=90, eligible_plans='all', active=1.
- `LAUNCH50`: type=percent, percent=50, duration='once', eligible_plans='all', ls_discount_id=(mevcut LS discount 1058288), active=1.

## Bileşenler ve akışlar

### A. Yeni lib: `src/lib/campaigns.js`
Tek sorumluluk: kampanya kodu doğrulama + redemption mantığı. Fonksiyonlar:
- `normalizeCode(code)` → UPPERCASE + trim.
- `getActiveCode(db, code)` → kodu bul; `active=1`, `starts_at<=now`, `ends_at>=now|null`,
  `max_redemptions` aşılmamış ise döndür, yoksa null.
- `redeemForUser(db, codeRow, userId)` → `campaign_redemptions` satırı oluşturur, tipe göre:
  - percent/amount: `users.discount_percent/expires_at/code` yazar (checkout uyumu için;
    expires_at = now + (ends_at veya 1 yıl)), redemption status='redeemed'.
  - free_month: redemption status='redeemed', redeem_expires_at = now + redeem_window_days.
  - `redemptions_count` +1 (UNIQUE ihlalinde tekrar sayma). Zaten kullanmışsa hata.
- `activateVoucher(db, userId, plan)` → kullanıcının aktif free_month voucher'ını bul
  (status='redeemed', redeem_expires_at>now); plan uygun mu kontrol; `setPlanAndReset(db,userId,plan)`
  benzeri dahili grant + `users.plan_expires_at = now + free_months`, `plan_source='campaign'`;
  redemption status='activated', activated_at, plan_granted, free_until.

### B. Yeni lib: `src/lib/lemonsqueezy-discounts.js`
Tek sorumluluk: LS discount API sarmalayıcısı.
- `createDiscount(env, { code, type, percent, amount_cents, starts_at, ends_at, max_redemptions, variant_ids })`
  → `POST {LS_API}/discounts`. `amount_type`: percent→'percent', amount→'fixed'.
  `test_mode` = `env.LEMONSQUEEZY_LIVE !== 'true'`. Uygun planlar → variant_ids (VARIANTS'tan
  plan→variant eşlemesi; boşsa mağaza geneli). Dönen discount id'yi döndürür.
- `deactivateDiscount(env, ls_discount_id)` → `PATCH {LS_API}/discounts/{id}` (status disabled)
  veya `DELETE`. Soft-delete için tercihen disable.

### C. `routes/auth.js` değişiklikleri
- `computeDiscount` ve gömülü `DISCOUNT_CODES` kaldırılır.
- `/register`: `discount_code` verilmişse `campaigns.getActiveCode` + `redeemForUser`.
  Geçersiz/expired/limit dolu → 400 uygun mesaj. Kayıt kullanıcısı henüz login değil;
  redemption user oluşturulduktan sonra yapılır.
- `/redeem-code`: aynı DB mantığı; hem indirim hem voucher tipini işler. Yanıt tipe göre
  farklı (indirim → discount bilgisi; free_month → voucher + redeem_expires_at).
- `/me`: yanıta kullanıcının aktif voucher durumunu ekler (var mı, redeem_expires_at,
  plan_expires_at) — frontend'in "voucher'ını aktive et" ve "kampanya planın X tarihine
  kadar" göstermesi için.

### D. `routes/billing.js` değişiklikleri
- `/checkout`: sabit `LS_DISCOUNT_CODE` yerine `users.discount_code`'u (varsa ve
  `discount_expires_at>now`) LS'ye `checkout_data.discount_code` olarak geçer.
- Yeni `POST /billing/activate-voucher` (authed): `{ plan }` alır; `campaigns.activateVoucher`
  çağırır; yeni plan + free_until döndürür.

### E. `routes/admin.js` değişiklikleri (super-admin CRUD)
- `GET /admin/campaigns` — tüm kodlar + `redemptions_count` + kalan limit.
- `POST /admin/campaigns` — doğrula (tip alanları tutarlı mı), kod unique mi;
  percent/amount ise `lemonsqueezy-discounts.createDiscount` çağır, dönen id'yi sakla; satırı yaz.
- `PATCH /admin/campaigns/:id` — `active`, `starts_at`, `ends_at`, `max_redemptions` düzenleme.
  Değer (percent/amount) değişimi desteklenmez (LS discount immutable sayılır); değer için
  kodu pasifleştir + yeni kod öner.
- `DELETE /admin/campaigns/:id` — soft-delete: `active=0` + LS discount disable.

### F. Cron değişikliği: `src/lib/trial-reminders.js` (veya yeni `campaign-expiry.js`)
15 dakikalık cron'a ekle:
- `plan_source='campaign' AND plan_expires_at IS NOT NULL AND plan_expires_at<=now`
  → `setPlanAndReset(db, userId, 'free')` + `plan_expires_at=NULL, plan_source=NULL`;
  ilgili redemption status='expired'.
- `campaign_redemptions status='redeemed' AND type='free_month' AND redeem_expires_at<=now`
  → status='expired' (aktive edilmemiş voucher süresi doldu).

### G. Frontend: `src/pages/Admin.jsx`
Yeni "Kampanya Kodları" bölümü (mevcut overview/activity altında):
- **Tablo:** kod, tip, değer (%/tutar/ay), pencere (başlangıç–bitiş), kullanım/limit,
  aktif toggle, sil.
- **"Yeni Kod" formu:** kod input; tip dropdown (Yüzde / Tutar / Ücretsiz Ay) → koşullu alanlar
  (percent | amount_cents | free_months+redeem_window_days); duration (once/forever) sadece
  indirim tiplerinde; eligible_plans çoklu seçim (varsayılan tümü); starts_at/ends_at tarih
  inputları; max_redemptions opsiyonel.
- Stil: mevcut `text-sm/xs`, cyan marka, `api.get/post/patch/delete`. **Emoji yok, düzgün
  Türkçe (ş,ç,ğ,ı,ö,ü), tire (kısa/uzun) yok** — feedback kurallarına uygun.

### H. Frontend: kullanıcı tarafı (voucher aktivasyonu)
Ayarlar/Faturalandırma sayfasında (billing UI neredeyse): kullanıcının aktif `free_month`
voucher'ı varsa "1 ay ücretsiz hakkın var — paket seç ve başlat" kutusu; plan seçince
`POST /billing/activate-voucher`. Aktif kampanya planı varsa "Kampanya planın {free_until}
tarihine kadar ücretsiz" bilgisi. (Bu ekranın tam yeri implementation planında netleşir.)

## Hata yönetimi
- Geçersiz/expired/limit-dolu kod → 400 açık Türkçe mesaj.
- Kullanıcı kodu zaten kullanmış → 409.
- Voucher yok/expired iken aktivasyon → 400.
- Uygun olmayan plan ile aktivasyon → 400.
- LS discount create hatası (admin) → 500, kod DB'ye yazılmaz (atomiklik: önce LS, başarılıysa DB).
- Webhook/cron downstream hataları asla isteği düşürmez (mevcut desen).

## Test
- `campaigns.test.js`: normalizeCode, getActiveCode (pencere/limit/aktif kombinasyonları),
  redeemForUser (her tip + tekrar kullanım engeli), activateVoucher (uygun/uygunsuz plan,
  expired voucher).
- `lemonsqueezy-discounts.test.js`: createDiscount payload (percent vs fixed, test_mode,
  variant kısıtı) — fetch mock.
- Mevcut billing/auth testleri kırılmamalı.

## Geri uyumluluk
- `users.discount_*` kolonları ve checkout'un kod-geçme mantığı korunur; sadece sabit kod
  yerine kullanıcının gerçek kodu geçer. LAUNCH50 seed ile aynı davranış sürer.
- Migration idempotent (`IF NOT EXISTS`, `ALTER ... ADD COLUMN` bir kez).

## Kapsam dışı (YAGNI)
- Kod başına kullanıcı-segmenti hedefleme, A/B, çok para birimli tutar, kısmi ay iadesi,
  voucher devri/hediye. İhtiyaç olursa ayrı spec.
