# Pricing Model + Discount Code + Auth UX + Landing Polish — Design

**Tarih:** 2026-07-13
**Durum:** Onaylandı (konuşma içinde), implementasyona hazır
**Kapsam:** Dört bağımsız iyileştirme. Ödeme entegrasyonu YOK — fiyat/indirim şimdilik "model + gösterim + kullanıcı bayrağı", gerçek tahsilat sonraki iş.

---

## Madde 1 — İndirim kodu (%50, tek global kod, kullanıcı başına tek seferlik, 3 ay)

**Mekanik:** Tek global kod (`LAUNCH50`, config'te tek satır — değiştirilebilir). Kullanıcı kodu girince: %50 indirim, redemption tarihinden **3 ay** geçerli, **hesap başına bir kez** (tekrar giremez). Ödeme kurulunca faturaya uygulanır; o zamana kadar kayıtlı + gösterilir.

**DB (`migration-pricing-v1.sql`):**
```sql
ALTER TABLE users ADD COLUMN discount_percent INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN discount_expires_at TEXT;
ALTER TABLE users ADD COLUMN discount_code TEXT;
```

**Worker (`routes/auth.js`):**
- Config sabiti: `const DISCOUNT_CODES = { LAUNCH50: { percent: 50, months: 3 } }`.
- Yardımcı: `applyDiscount(code)` → geçerliyse `{ percent, expires_at }` (now + months), değilse null.
- `/register`: opsiyonel `discount_code` alır. Verilmiş ve geçerliyse INSERT'te discount sütunlarını doldurur. Verilmiş ama geçersizse `400 "Geçersiz indirim kodu"`. Boşsa normal kayıt.
- Yeni `POST /auth/redeem-code` (authed): mevcut kullanıcı Ayarlar'dan kod girer. `user.discount_code` zaten doluysa `409 "Bu hesap indirim kodunu zaten kullandı"`. Geçerli kod → sütunları güncelle, `{ discount_percent, discount_expires_at }` döner.
- `/auth/me`: yanıta `discount_percent, discount_expires_at, discount_code` eklenir.

**Frontend:**
- `AuthContext.register(email, password, name, company_name, discountCode)` — payload'a `discount_code` eklenir; context `user`'da discount alanlarını taşır (redeem/login sonrası `/me`'den).
- `Register.jsx`: opsiyonel "İndirim Kodu" input'u → register'a geçer.
- `Settings.jsx`: "İndirim Kodu" bölümü — input + "Uygula" butonu (`/auth/redeem-code`), ve aktifse durum: "%50 indirim aktif — GG.AA.YYYY'e kadar". Zaten kullanılmışsa input yerine durum gösterilir.

---

## Madde 2 — Landing de-slop (renk/animasyon KORUNUR, sadece düzeltme)

Landing metni zaten büyük ölçüde spesifik (gerçek modül sayıları, somut adımlar; uydurma kullanıcı sayısı yok). Cerrahi düzeltmeler:
- **`FEATURES[1]` (Kişi ve Email Bulucu)** — eskiyen iddia güncellenir (Hunter sonrası):
  - descTr: "...email, telefon. **MX doğrulama**, toplu reveal ve CSV dışa aktarma." → "...email, telefon. **Doğrulanmış email adresleri**, toplu reveal ve CSV dışa aktarma."
  - descEn: "...email, phone. **MX verification**, bulk reveal, and CSV export." → "...email, phone. **Verified email addresses**, bulk reveal, and CSV export."
- Fiyatlandırma bölümüne pay-as-you-go kartı eklenir (Madde 4).
- Pro/Growth/Team reveal sayıları güncellenir (Madde 4).
- Tüm animasyonlar, gradyanlar, floating ikonlar, renk paleti, layout **aynen** kalır. Geniş ton değişikliği yapılmaz (marka sesi korunur); ek ton önerileri gerekirse ayrı diff olarak sunulur.

---

## Madde 3 — Şifreyi göster + (şifre sıfırlama zaten çalışıyor)

Şifre sıfırlama e-postası (`ForgotPassword.jsx` + `/auth/forgot-password` + `/auth/reset-password` + Resend `passwordResetEmail`) **zaten kurulu ve Login'e bağlı** — dokunulmaz.

Eksik: **şifreyi göster/gizle** butonu. DRY için küçük bir bileşen:
- Yeni `src/components/PasswordInput.jsx`: `type=password` input + içinde göz ikonlu toggle (password ↔ text). Props: `value, onChange, ...rest`. Mevcut input stiliyle birebir aynı görünür.
- Kullanım: `Login.jsx` (şifre), `Register.jsx` (şifre), `ForgotPassword.jsx` (yeni şifre) — mevcut `<input type="password">` yerine `<PasswordInput>`.

---

## Madde 4 — Fiyat modeli (model + gösterim; tahsilat YOK)

**Abonelik reveal limitleri (marj-güvenli, fiyatlar aynı):**
- Worker `email-finder.js`: `PLAN_LIMITS = { free: 25, pro: 250, growth: 600, team: 600 }` (eski 25/300/1500/1000). Ücretli kullanıcı olmadığından anında güvenli.
- Landing kartlarında reveal sayıları: Pro "300→250", Growth "1.500→600", Team "1.000→600/kullanıcı" olarak güncellenir.

**Yeni Pay-as-you-go (kredi paketi, aylık ücret yok):**
- 1 kredi = 1 doğrulanmış reveal. Paketler: **50 kredi $12 · 200 kredi $40 · 1.000 kredi $150**. Krediler 12 ay geçerli. Hepsi ≥%80 EBITDA.
- Landing fiyatlandırma bölümünde 4 kartın ALTINA ayrı, tam genişlik bir "Kullandıkça Öde / Pay-as-you-go" bloğu (mevcut kart stiliyle, 3 paket yan yana). Checkout linki yok — CTA "Denemeye Başla"/kayıt.
- **Kârlılık notu (referans):** %50 indirimle bile pay-as-you-go ~%67-79 marj; abonelikler tipik kullanımda ~%74-85.

Not: gerçek kredi satın alma / payg plan enforcement ödeme entegrasyonuyla gelecek (bu fazda yok).

---

## Sıra ve bağımsızlık
Dört madde büyük ölçüde bağımsız. Önerilen uygulama sırası: 3 (PasswordInput) → 1 (indirim: DB+worker+frontend) → 4 (PLAN_LIMITS + landing pricing) → 2 (landing copy). Hepsi tek deploy'da gider.

## Deploy
- Remote D1'e `migration-pricing-v1.sql` (3 ALTER).
- Worker deploy (auth + PLAN_LIMITS).
- Frontend: master'a push (Pages).
- `DISCOUNT_CODES` config'te; `LAUNCH50` string'i istenirse değiştirilir.
