# AskDesk Phase 2 — İçerik Modülleri Tasarım Spesifikasyonu

**Tarih:** 2026-07-11
**Durum:** Onaylandı
**Bağımlılık:** Phase 1 (canlı — askdesk.app)

---

## 1. Genel Bakış

Phase 2, AskDesk'e 6 modül ekler: Firma Profili (onboarding), SEO İçerik üretimi, Sosyal Medya paylaşımı, Newsletter oluşturma, Template Library ve Content Calendar. Tüm modüller mevcut Cloudflare Pages + Workers + D1 altyapısı üzerine inşa edilir.

## 2. Modüller

### 2.0 Firma Profili (Onboarding)

Register sonrası zorunlu adım. Kullanıcı firmasını tanıtır, bu bilgiler tüm AI içerik üretimlerinde context olarak kullanılır.

**Akıllı Profil Oluşturma:**
1. Kullanıcı firma websitesini girer
2. AI (Gemini) websiteyi analiz eder → otomatik profil taslağı oluşturur
3. Kullanıcı taslağı düzenler, eksikleri tamamlar, onaylar

**Manuel Ekleme:** Website yoksa veya AI sonucu yetersizse tüm alanlar elle doldurulabilir.

**Profil Alanları:**

| Alan | Tip | Açıklama |
|------|-----|----------|
| company_name | TEXT | Firma adı |
| website | TEXT | Firma websitesi |
| sector | TEXT | Sektör |
| description | TEXT | Firma ne iş yapıyor (2-3 cümle) |
| value_proposition | TEXT | Değer önerisi — müşteriye sunulan fayda |
| target_audience | TEXT | Hedef kitle tanımı |
| products_services | TEXT | Ürün/hizmet listesi (JSON array) |
| competitors | TEXT | Rakipler (JSON array) |
| usps | TEXT | Benzersiz satış noktaları — USP'ler (JSON array) |
| tone | TEXT | İçerik tonu: 'formal', 'friendly', 'technical', 'casual' |
| sample_content | TEXT | Örnek içerikler — mevcut websiteden veya elle (isteğe bağlı) |

**Sayfalar:**
- `/app/onboarding` — register sonrası zorunlu yönlendirme (profil dolana kadar diğer sayfalara erişim engellenir)
- `/app/settings/profile` — profili sonradan düzenleme

**AI Context Kullanımı:** Tüm içerik modüllerinde (SEO, Sosyal Medya, Newsletter, Outreach) Gemini'ye gönderilen prompt'lara firma profili otomatik olarak eklenir:
```
Firma Bilgileri:
- Ad: {company_name}
- Sektör: {sector}
- Ne Yapar: {description}
- Değer Önerisi: {value_proposition}
- Hedef Kitle: {target_audience}
- Ürün/Hizmetler: {products_services}
- Ton: {tone}

Bu firma için [istek] oluştur.
```

### 2.1 SEO İçerik

6 aşamalı workflow ile blog/makale üretimi:

| Aşama | Açıklama |
|-------|----------|
| 1. Trend Araştırması | Gemini ile sektör/konu bazlı trend analizi, 3-5 konu önerisi |
| 2. Konu Seçimi | AI önerilerinden seçim veya özel konu girişi |
| 3. TR İçerik Üretimi | 2000-5000 kelime makale, SEO meta (title, description, keywords), anahtar kelime yoğunluğu hesaplama |
| 4. EN Çeviri | Türkçe içeriğin profesyonel İngilizce çevirisi |
| 5. SEO Kontrol | AEO checklist (H2 sorular, direct answer, FAQ, sayısal veri), readability skoru |
| 6. Yayın | Blog platformlarına yönlendirme, içeriği kopyala/indir (markdown/HTML) |

**Sayfalar:**
- `/app/seo` — makale listesi (durum filtresi: taslak, üretiliyor, tamamlandı)
- `/app/seo/new` — yeni makale wizard (6 aşama, step indicator)
- `/app/seo/:id` — makale detay/düzenleme

**Yasaklı AI Kalıpları:** "Yapay zeka çağında", "devrim niteliğinde", "paradigma değişimi" gibi klişe ifadeler AI prompt'unda yasaklanır.

### 2.2 Sosyal Medya

4 platform desteği: LinkedIn, Twitter/X, Instagram, Facebook

Her platform için:
- AI ile platform-optimized içerik üretimi (LinkedIn: uzun profesyonel, Twitter: kısa/punch, Instagram: hashtag ağırlıklı, Facebook: samimi/paylaşılabilir)
- Karakter/uzunluk limiti kontrolü ve uyarı
- Platform tarzında önizleme mockup'ı
- Kopyala butonu
- Hashtag önerisi

**Sayfalar:**
- `/app/social` — post listesi (platform filtresi)
- `/app/social/new` — yeni post oluştur (platform seçimi → AI üretim → düzenleme → kaydet)

### 2.3 Newsletter

Email formatında bülten oluşturma:
- AI destekli içerik üretimi (konu → giriş → ana içerik → CTA)
- Poster üretimi (html2canvas — 1200x627px görsel, indirilebilir PNG)
- PDF export (tarayıcı print API ile)
- Yayın log'u (hangi platformda, ne zaman yayınlandı)

**Sayfalar:**
- `/app/newsletter` — bülten listesi
- `/app/newsletter/new` — yeni bülten oluştur
- `/app/newsletter/:id` — bülten detay/önizleme/export

### 2.4 Template Library

Tüm içerik türleri için şablon yönetimi:

**Kategoriler:** Email, Sosyal Medya (alt: LinkedIn/Twitter/Instagram/Facebook), SEO Makale, Newsletter

**Özellikler:**
- Mevcut içerikten şablon kaydet ("Şablon Olarak Kaydet" butonu her içerik modülünde)
- Sıfırdan şablon oluştur
- Şablon listele, kategori/tag filtresi, arama
- Şablondan yeni içerik oluştur (ilgili modülün /new sayfasına yönlendir, şablon içeriği prefill)

**Sayfalar:**
- `/app/templates` — şablon listesi (kategori filtresi)
- `/app/templates/new` — yeni şablon oluştur

### 2.5 Content Calendar

Tüm içerik türlerini takvimde planlama ve takip:

**Görünüm:** Aylık grid takvim
- Her gün hücresinde planlanan içerikler küçük etiketler olarak gösterilir
- Renk kodları: SEO=mavi (#2563EB), Sosyal Medya=yeşil (#059669), Newsletter=mor (#7C3AED), Outreach=turuncu (#D97706)
- Sürükle-bırak ile tarih değiştirme
- Gün hücresine tıklayarak yeni içerik oluşturma (tür seçimi modal)
- Ay navigasyonu (önceki/sonraki ay butonları)

**Sidebar:** Yaklaşan 7 gün içerik listesi

**Sayfalar:**
- `/app/calendar` — takvim görünümü

## 3. Veritabanı Şeması (Yeni Tablolar)

### company_profiles
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT UNIQUE | FK → users.id (1 kullanıcı = 1 profil) |
| company_name | TEXT | Firma adı |
| website | TEXT | Firma websitesi |
| sector | TEXT | Sektör |
| description | TEXT | Firma ne iş yapıyor |
| value_proposition | TEXT | Değer önerisi |
| target_audience | TEXT | Hedef kitle |
| products_services | TEXT | JSON array — ürün/hizmetler |
| competitors | TEXT | JSON array — rakipler |
| usps | TEXT | JSON array — benzersiz satış noktaları |
| tone | TEXT | 'formal', 'friendly', 'technical', 'casual' |
| sample_content | TEXT | Örnek içerikler |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### seo_articles
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK → users.id |
| title | TEXT | Makale başlığı |
| topic | TEXT | Seçilen konu |
| body_tr | TEXT | Türkçe içerik |
| body_en | TEXT | İngilizce içerik |
| meta_title | TEXT | SEO title |
| meta_description | TEXT | SEO description |
| keywords | TEXT | JSON array — anahtar kelimeler |
| keyword_density | REAL | Anahtar kelime yoğunluğu % |
| seo_score | REAL | SEO kontrol puanı (0-100) |
| step | INTEGER | Mevcut aşama (1-6) |
| status | TEXT | 'draft', 'in_progress', 'completed' |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### social_posts
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK → users.id |
| platform | TEXT | 'linkedin', 'twitter', 'instagram', 'facebook' |
| content | TEXT | Post içeriği |
| hashtags | TEXT | JSON array |
| status | TEXT | 'draft', 'scheduled', 'published' |
| scheduled_at | TEXT | Planlanan yayın tarihi |
| created_at | TEXT | ISO timestamp |

### newsletters
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK → users.id |
| title | TEXT | Bülten başlığı |
| body | TEXT | Bülten içeriği |
| poster_html | TEXT | Poster HTML (html2canvas için) |
| status | TEXT | 'draft', 'completed' |
| published_platforms | TEXT | JSON array — yayınlanan platformlar |
| created_at | TEXT | ISO timestamp |

### templates
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK → users.id |
| category | TEXT | 'email', 'social', 'seo', 'newsletter' |
| platform | TEXT | Sosyal medya için: 'linkedin', 'twitter', vb. (nullable) |
| name | TEXT | Şablon adı |
| content | TEXT | Şablon içeriği |
| tags | TEXT | JSON array — etiketler |
| created_at | TEXT | ISO timestamp |

### calendar_items
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK → users.id |
| title | TEXT | İçerik başlığı |
| type | TEXT | 'seo', 'social', 'newsletter', 'outreach' |
| reference_id | TEXT | İlgili içeriğin ID'si (nullable) |
| scheduled_date | TEXT | YYYY-MM-DD formatında |
| status | TEXT | 'planned', 'in_progress', 'completed' |
| notes | TEXT | Ek notlar |
| created_at | TEXT | ISO timestamp |

## 4. API Endpoint'leri

### Firma Profili (/profile)
- `GET /profile` — mevcut kullanıcının firma profilini getir
- `POST /profile` — profil oluştur (onboarding)
- `PUT /profile` — profil güncelle
- `POST /profile/analyze` — website URL'ini AI ile analiz et, profil taslağı döndür (Gemini proxy)

### SEO (/seo)
- `GET /seo` — makale listesi (filtreleme: status)
- `POST /seo` — yeni makale oluştur
- `GET /seo/:id` — makale detay
- `PUT /seo/:id` — makale güncelle (step ilerletme dahil)
- `DELETE /seo/:id` — makale sil
- `POST /seo/:id/translate` — EN çeviri (Gemini proxy)
- `POST /seo/:id/check` — SEO kontrol (Gemini proxy)

### Sosyal Medya (/social)
- `GET /social` — post listesi (filtreleme: platform, status)
- `POST /social` — yeni post oluştur
- `GET /social/:id` — post detay
- `PUT /social/:id` — post güncelle
- `DELETE /social/:id` — post sil

### Newsletter (/newsletter)
- `GET /newsletter` — bülten listesi
- `POST /newsletter` — yeni bülten oluştur
- `GET /newsletter/:id` — bülten detay
- `PUT /newsletter/:id` — bülten güncelle
- `DELETE /newsletter/:id` — bülten sil

### Templates (/templates)
- `GET /templates` — şablon listesi (filtreleme: category, platform)
- `POST /templates` — yeni şablon
- `GET /templates/:id` — şablon detay
- `PUT /templates/:id` — şablon güncelle
- `DELETE /templates/:id` — şablon sil

### Calendar (/calendar)
- `GET /calendar?month=YYYY-MM` — belirli ay için tüm içerik planları
- `POST /calendar` — yeni plan ekle
- `PUT /calendar/:id` — plan güncelle (tarih değiştirme dahil)
- `DELETE /calendar/:id` — plan sil

## 5. AI Prompt Kuralları

Mevcut `/ai/generate` endpoint'i kullanılır. Her modül kendi prompt template'ini gönderir.

**Yasaklı ifadeler (tüm içerik türlerinde):**
- "Yapay zeka çağında", "dijital dönüşüm çağında"
- "Devrim niteliğinde", "paradigma değişimi"
- "Oyun değiştirici", "game-changer"
- "Benzersiz", "eşsiz" (kanıtsız kullanım)
- Aşırı klişe açılışlar ("Günümüzde...", "Bildiğiniz gibi...")

**İçerik kalite kuralları:**
- Somut veri ve örnekler kullanılmalı
- Kısa paragraflar (3-4 cümle max)
- Aktif ses tercih edilmeli
- CTA net ve ölçülebilir olmalı

## 6. Sidebar Güncellemesi

Mevcut nav itemlardan sonra, separator ile ayrılmış 5 yeni item:

```
Dashboard
Outreach
Leads
Pipeline
───────────
Maps
Ayarlar
───────────  (yeni separator)
SEO İçerik
Sosyal Medya
Newsletter
Şablonlar
Takvim
```

## 7. Bağımlılıklar ve Kısıtlamalar

- Mevcut Phase 1 modüllerine dokunulmaz (auth, dashboard, leads, outreach, pipeline, maps)
- html2canvas kütüphanesi frontend'e eklenir (poster üretimi için)
- Tüm yeni tablolar `user_id` ile izole
- Gemini API proxy mevcut `/ai/generate` endpoint'i üzerinden kullanılır
- Türkçe arayüz metinlerinde doğru karakterler (ş, ç, ğ, ı, ö, ü)
- AskDesk Classic Blue tasarım dili korunur
