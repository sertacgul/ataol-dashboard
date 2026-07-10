# AskDesk — Tasarım Spesifikasyonu

**Tarih:** 2026-07-10
**Durum:** Onaylandı
**Domain:** askdesk.app

---

## 1. Vizyon

AskDesk, startup'ların müşteri bulma, büyüme, SEO içeriği ve sosyal medya paylaşım süreçlerini tek platformda yöneten bir SaaS uygulamasıdır. Mevcut ATAOL AI Techs Outreach Dashboard'unun konseptinden ilham alarak, tamamen bağımsız ve premium bir ürün olarak askdesk.app adresinde yayınlanacaktır.

## 2. Hedef Kitle

- Yeni müşteri arayan startup'lar
- Büyüme odaklı küçük-orta ölçekli firmalar
- SEO yazısı ve LinkedIn/sosyal medya içeriği üreten ekipler

## 3. Kullanıcı Modeli

- **SaaS modeli** — her startup kendi hesabını oluşturur, kendi verilerini görür
- **Super Admin** (Sertac Gul) — tüm verilere erişim, platform yönetimi
- **Kullanıcı rolleri:** `superadmin`, `admin`, `member`

## 4. Teknik Mimari

### 4.1 Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Hosting (Frontend) | Cloudflare Pages |
| API | Cloudflare Workers |
| Veritabanı | Cloudflare D1 (SQLite) |
| AI Proxy | Cloudflare Worker (Gemini API key sunucuda) |
| Auth | Custom JWT (HttpOnly cookie) |

### 4.2 Mimari Diyagram

```
askdesk.app (Cloudflare Pages)
├── React SPA (Vite + Tailwind)
└── API calls ──→ workers.askdesk.app (Cloudflare Workers)
                   ├── /auth/*        → JWT login/register/session
                   ├── /outreach/*    → email oluştur/gönder/takip
                   ├── /leads/*       → lead CRUD + arama
                   ├── /maps/*        → Google Maps firma + sentiment
                   ├── /pipeline/*    → CRM kanban CRUD
                   └── /ai/*          → Gemini proxy (API key burada)
                         │
                   Cloudflare D1 (SQLite)
                   ├── users          → hesaplar + roller
                   ├── companies      → firmalar (lead'ler)
                   ├── contacts       → firma kişileri
                   ├── emails         → outreach emailler + durum
                   ├── pipeline_stages → kanban aşamaları
                   └── pipeline_items  → lead-aşama ilişkisi
```

### 4.3 Güvenlik Prensipleri

- Gemini API key asla frontend'e açılmaz — tüm AI çağrıları `/ai/*` Workers endpoint'i üzerinden geçer
- Google Maps API key de Workers'ta tutulur — frontend doğrudan Google API'ye çağrı yapmaz
- JWT token HttpOnly cookie ile taşınır (localStorage değil)
- D1'de her tablo `user_id` ile izole — bir startup başkasının verisini göremez
- Super Admin (`role: 'superadmin'`) tüm verilere erişir
- Mevcut Cloudflare projelerine (ActLedger, StrategyThrust, ATAOL AI Techs) kesinlikle dokunulmaz

### 4.4 Cloudflare Kaynak Adları

| Kaynak | Ad |
|--------|----|
| Pages projesi | `askdesk-app` |
| Workers | `askdesk-api` |
| D1 veritabanı | `askdesk-db` |

## 5. Sayfa Yapısı ve Navigasyon

```
/ (landing - public)          → askdesk.app ana sayfa, pricing, features
/login                        → giriş
/register                     → kayıt

/app (authenticated)
├── /app/dashboard            → ana panel, özet metrikler
├── /app/outreach             → email outreach listesi
│   ├── /app/outreach/new     → yeni outreach oluştur
│   └── /app/outreach/:id     → detay/önizleme
├── /app/leads                → lead listesi + arama
│   ├── /app/leads/new        → manuel firma ekle
│   ├── /app/leads/maps       → Google Maps'ten firma bul
│   └── /app/leads/:id        → firma detay
├── /app/pipeline             → CRM kanban board
└── /app/settings             → hesap, API ayarları, profil

/admin (superadmin only)
├── /admin/users              → tüm kullanıcılar
├── /admin/analytics          → platform geneli metrikler
└── /admin/settings           → sistem ayarları
```

**Navigasyon:** Sol sidebar (collapse edilebilir), üstte breadcrumb. Mobilde sidebar drawer olarak açılır.

## 6. Görsel Kimlik

### 6.1 Renk Paleti — Classic Blue

| Rol | Renk | Hex |
|-----|------|-----|
| Primary (vurgu) | Mavi | `#2563EB` |
| Primary hover | Koyu mavi | `#1D4ED8` |
| Background | Beyaz | `#FFFFFF` |
| Surface | Açık gri | `#F9FAFB` |
| Border | Gri | `#E5E7EB` |
| Text primary | Koyu | `#111827` |
| Text secondary | Gri | `#6B7280` |
| Text muted | Açık gri | `#9CA3AF` |
| Success | Yeşil | `#059669` |
| Warning | Amber | `#D97706` |
| Error | Kırmızı | `#DC2626` |
| Info / Accent | Açık mavi | `#93C5FD` |

### 6.2 Tasarım Prensipleri

- **Yapay zeka üretimi görünümünden kaçınma** — jenerik gradient yok, aşırı yuvarlak köşe yok, gereksiz gölge yok
- Border-radius: `6px` (kartlar, butonlar, inputlar)
- Gölge: yok veya minimum (`0 1px 2px rgba(0,0,0,0.05)`)
- Tipografi: sistem fontları (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- Renk sadece semantik yerlerde (başarı=yeşil, hata=kırmızı, uyarı=amber, vurgu=mavi)
- Beyaz kartlar, ince border (`1px solid #E5E7EB`), temiz boşluklar
- Badge'ler: küçük, pill şeklinde, semantik renkli arka plan

### 6.3 Logo — K2 (Globe + Bold A + Send Arrow)

- Mavi kare ikon (`#2563EB`, rx=10) üzerinde:
  - Yarı saydam dünya çizgileri (arka plan)
  - Kalın beyaz "A" harfi (dominant, stroke-width: 3)
  - Sağ üstten fırlayan ok (`#93C5FD`) — outreach sembolü
- Varyantlar: light bg, dark bg, sidebar, favicon (32px/16px)
- Dosyalar: `public/assets/logo.svg`, `public/assets/favicon.svg`, `public/assets/logo-dark.svg`
- PNG export: `public/assets/export-png.html`

## 7. Modüller ve Phase Planı

### Phase 1 — Çekirdek (MVP)

| Modül | Açıklama |
|-------|----------|
| **Auth** | Register, login, JWT session, rol yönetimi, Super Admin |
| **Dashboard** | Özet metrikler (toplam lead, gönderilen email, açılma oranı, dönüşüm) |
| **Outreach (Email)** | Firma araştır, Gemini ile AI email oluştur, onayla/reddet, gönder, açılma takibi |
| **Lead Generation** | Sektör/ülke/kıdem bazlı firma ve karar verici arama |
| **Google Maps Firma Bulma** | Harita üzerinden firma keşfi, yorum sentiment analizi |
| **Manuel Firma Ekleme** | "+ Yeni" ile elle firma ve iletişim bilgisi girişi |
| **CRM Pipeline** | Kanban board — İletişim Kuruldu → Yanıt Geldi → Toplantı → Anlaşma |

### Phase 2 — İçerik

| Modül | Açıklama |
|-------|----------|
| **SEO İçerik** | Blog yazısı/makale üretimi (TR/EN), anahtar kelime analizi, AEO kontrol |
| **Sosyal Medya** | LinkedIn post, Twitter/X içerik üretimi |
| **Newsletter** | Haber bülteni oluşturma, poster üretimi (html2canvas) |
| **Template Library** | Başarılı email/post şablonlarını kaydet ve yeniden kullan |
| **Content Calendar** | SEO yazıları, newsletter, sosyal medya postlarını takvimde planla |

### Phase 3 — Analitik

| Modül | Açıklama |
|-------|----------|
| **Analytics Dashboard** | Gönderim/açılma/dönüşüm metrikleri, grafikler, trendler |
| **Finansal Simülatör** | Gelir/gider sürücüleri, EBITDA, başabaş analizi |
| **İş Modeli Kanvası** | 9 bölümlü BMC kartları |
| **Competitor Analysis** | Rakip firma SEO ve sosyal medya varlığı analizi |

## 8. Veritabanı Şeması (Phase 1)

### users
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| email | TEXT | Unique, login |
| password_hash | TEXT | bcrypt hash |
| name | TEXT | Kullanıcı adı |
| company_name | TEXT | Firma adı |
| role | TEXT | 'superadmin', 'admin', 'member' |
| created_at | TEXT | ISO timestamp |

### companies
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK → users.id |
| name | TEXT | Firma adı |
| website | TEXT | Web sitesi |
| sector | TEXT | Sektör |
| country | TEXT | Ülke |
| source | TEXT | 'manual', 'maps', 'search' |
| notes | TEXT | Ek bilgi |
| created_at | TEXT | ISO timestamp |

### contacts
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| company_id | TEXT | FK → companies.id |
| user_id | TEXT | FK → users.id |
| name | TEXT | Kişi adı |
| email | TEXT | E-posta |
| title | TEXT | Ünvan |
| seniority | TEXT | 'c-level', 'vp', 'director', 'manager', 'senior', 'junior' |
| created_at | TEXT | ISO timestamp |

### emails
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK → users.id |
| company_id | TEXT | FK → companies.id |
| contact_id | TEXT | FK → contacts.id |
| subject | TEXT | E-posta konusu |
| body | TEXT | E-posta içeriği |
| status | TEXT | 'draft', 'pending', 'approved', 'sent', 'rejected' |
| opened | INTEGER | 0/1 |
| quality_score | REAL | AI kalite puanı |
| created_at | TEXT | ISO timestamp |
| sent_at | TEXT | ISO timestamp |

### pipeline_stages
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK → users.id |
| name | TEXT | Aşama adı |
| position | INTEGER | Sıralama |

### pipeline_items
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK → users.id |
| company_id | TEXT | FK → companies.id |
| stage_id | TEXT | FK → pipeline_stages.id |
| notes | TEXT | Not |
| updated_at | TEXT | ISO timestamp |

## 9. API Endpoint'leri (Phase 1)

### Auth
- `POST /auth/register` — kayıt
- `POST /auth/login` — giriş (JWT cookie set)
- `POST /auth/logout` — çıkış (cookie sil)
- `GET /auth/me` — mevcut kullanıcı bilgisi

### Leads (Companies + Contacts)
- `GET /leads` — lead listesi (filtreleme: sector, country, source)
- `POST /leads` — yeni firma + iletişim ekle
- `GET /leads/:id` — firma detay
- `PUT /leads/:id` — firma güncelle
- `DELETE /leads/:id` — firma sil

### Maps
- `POST /maps/search` — Google Maps'ten firma ara
- `POST /maps/sentiment` — yorum sentiment analizi (Gemini proxy)

### Outreach
- `GET /outreach` — email listesi (filtreleme: status)
- `POST /outreach` — yeni email oluştur
- `POST /outreach/:id/generate` — AI ile email içeriği üret (Gemini proxy)
- `PUT /outreach/:id` — email güncelle (onayla/reddet)
- `POST /outreach/:id/send` — email gönder
- `GET /outreach/:id/track` — açılma pixel

### Pipeline
- `GET /pipeline/stages` — aşamaları getir
- `POST /pipeline/stages` — yeni aşama
- `PUT /pipeline/stages/:id` — aşama güncelle/sırala
- `GET /pipeline/items` — tüm pipeline item'ları
- `POST /pipeline/items` — lead'i pipeline'a ekle
- `PUT /pipeline/items/:id` — aşama değiştir (drag & drop)

### AI Proxy
- `POST /ai/generate` — Gemini'ye prompt gönder, yanıt al
- `POST /ai/research` — firma hakkında araştırma yap

### Dashboard
- `GET /dashboard/stats` — özet metrikler

## 10. Bağımlılıklar ve Kısıtlamalar

- **Gemini API Key** asla frontend kodunda veya public dosyalarda bulunmaz
- **Mevcut Cloudflare projeleri** (ActLedger, StrategyThrust, ATAOL AI Techs, api.ataolai.tech) hiçbir şekilde etkilenmez
- Tüm Cloudflare kaynakları `askdesk-*` prefix'i ile oluşturulur
- Türkçe arayüz metinlerinde doğru Türkçe karakterler kullanılır (ş, ç, ğ, ı, ö, ü)
- Tasarım vibe-coding/low-code/no-code görünümünden uzak, premium ve editöryal olmalıdır
- Email gönderim servisi Phase 1 implementasyonunda belirlenecektir (Resend, Mailgun veya Cloudflare Email Workers seçenekleri)
