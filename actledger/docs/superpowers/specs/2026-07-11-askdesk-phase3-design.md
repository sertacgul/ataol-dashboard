# AskDesk Phase 3 - Analitik Modülleri Tasarım Spesifikasyonu

**Tarih:** 2026-07-11
**Durum:** Onaylandı
**Bağımlılık:** Phase 1 + Phase 2 (canlı)

---

## 1. Genel Bakış

Phase 3, AskDesk'e 4 analitik ve strateji modülü ekler: Analytics Dashboard (gelişmiş metrikler ve grafikler), Finansal Simülatör, İş Modeli Kanvası (BMC) ve Competitor Analysis. Grafik kütüphanesi olarak Recharts kullanılır.

## 2. Modüller

### 2.1 Analytics Dashboard

Mevcut basit dashboard'un gelişmiş versiyonu, detaylı metrikler ve görsel grafiklerle.

**Zaman filtreleri:** Bu hafta, bu ay, son 3 ay, son 1 yıl, özel tarih aralığı

**Metrik kartları (stat cards):**
- Toplam lead sayısı
- Gönderilen email sayısı
- Açılma oranı (%)
- Dönüşüm oranı (%)
- Yanıt oranı (%)

**Grafikler (Recharts):**
- Email gönderim trendi: çizgi grafik (LineChart), son 30 gün/haftalık
- Platform bazlı sosyal medya dağılımı: bar chart (BarChart), LinkedIn/Twitter/Instagram/Facebook
- Pipeline aşama dağılımı: donut/pie chart (PieChart)
- İçerik üretim trendi: çizgi grafik, SEO/sosyal/newsletter aylık

**Tablo:** En iyi performans gösteren outreach'ler (açılma + yanıt oranına göre sıralı)

**Sayfa:** `/app/analytics`

### 2.2 Finansal Simülatör

Tüm hesaplamalar frontend'de yapılır, API gerektirmez. Veriler localStorage'a kaydedilir.

**Gelir sürücüleri:**
- Proje sayısı + proje başına gelir
- SaaS üye sayısı + aylık üyelik ücreti
- Eğitim sınıfı sayısı + sınıf başına gelir
- Diğer gelir (white-label, danışmanlık vb.)

**Maliyet sürücüleri:**
- Altyapı maliyeti (aylık)
- API giderleri (aylık)
- Pazarlama bütçesi (aylık)
- Çalışan sayısı + ortalama maaş
- Hukuk/muhasebe giderleri (aylık)
- Diğer giderler

**Dinamik hesaplama:**
- Yıllık toplam gelir
- Yıllık toplam gider
- Net kar (EBITDA)
- EBITDA marjı (%)
- Başabaş noktası (kaç müşteri/proje ile karlılık)

**Görsel:** Gelir vs gider bar chart, kar/zarar göstergesi (yeşil/kırmızı)

**Sayfa:** `/app/simulator`

### 2.3 İş Modeli Kanvası (BMC)

9 bölümlü interaktif Business Model Canvas.

**Bölümler:**
1. Temel Ortaklar (Key Partners)
2. Temel Faaliyetler (Key Activities)
3. Temel Kaynaklar (Key Resources)
4. Değer Önerileri (Value Propositions)
5. Müşteri İlişkileri (Customer Relationships)
6. Kanallar (Channels)
7. Müşteri Segmentleri (Customer Segments)
8. Maliyet Yapısı (Cost Structure)
9. Gelir Akışları (Revenue Streams)

**Özellikler:**
- Her bölümde madde ekle/sil/düzenle (inline editing)
- "OperIQ ile Doldur" butonu: firma profilinden otomatik BMC önerileri
- BMC grid layout (klasik 3x3+2 canvas yapısı)
- Her bölüm renk kodlu üst border
- D1'de kaydedilir (kullanıcı bazlı, JSON formatında)
- Export: kopyala (text formatında) veya yazdır (print CSS)

**Sayfa:** `/app/bmc`

### 2.4 Competitor Analysis

Rakip firma analizi ve karşılaştırma.

**Özellikler:**
- Rakip firma URL'i gir
- "OperIQ ile Analiz Et": firma websitesini analiz et, güçlü/zayıf yönleri çıkar
- Analiz sonucu: firma adı, sektör, ne yaptığı, güçlü yönler, zayıf yönler, fırsatlar
- Karşılaştırma tablosu: sizin firma profili vs. rakip (yan yana)
- Birden fazla rakip eklenebilir, liste olarak gösterilir
- D1'de kaydedilir

**Sayfa:** `/app/competitors`

## 3. Veritabanı Şeması (Yeni Tablolar)

### bmc_items
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT UNIQUE | FK, users.id (1 kullanıcı = 1 BMC) |
| data | TEXT | JSON, tüm 9 bölümün içeriği |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### competitors
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK, users.id |
| name | TEXT | Rakip firma adı |
| website | TEXT | Rakip websitesi |
| analysis | TEXT | OperIQ analiz sonucu (JSON) |
| created_at | TEXT | ISO timestamp |

Not: Analytics ve Finansal Simülatör yeni tablo gerektirmez. Analytics mevcut tablolardan (emails, companies, social_posts, pipeline_items) aggregate sorgular yapar. Simülatör localStorage kullanır.

## 4. API Endpoint'leri

### Analytics (/analytics)
- `GET /analytics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD` - metrik kartları (leads, emails, rates)
- `GET /analytics/email-trend?from=&to=` - günlük/haftalık email gönderim sayıları
- `GET /analytics/social-stats` - platform bazlı sosyal medya post sayıları
- `GET /analytics/pipeline-stats` - pipeline aşama dağılımı
- `GET /analytics/content-trend?from=&to=` - içerik üretim trendi (seo, social, newsletter)
- `GET /analytics/top-outreach?limit=10` - en iyi performanslı outreach'ler

### BMC (/bmc)
- `GET /bmc` - kullanıcının BMC'sini getir (veya null)
- `POST /bmc` - BMC oluştur (data JSON)
- `PUT /bmc` - BMC güncelle

### Competitors (/competitors)
- `GET /competitors` - rakip listesi
- `POST /competitors` - rakip ekle (name, website)
- `POST /competitors/:id/analyze` - OperIQ ile rakibi analiz et
- `DELETE /competitors/:id` - rakip sil

### Finansal Simülatör
API endpoint gerektirmez. Tüm veri localStorage'da.

## 5. Grafik Kütüphanesi

Recharts kullanılır: `npm install recharts`

Kullanılacak chart tipleri:
- `LineChart` - email trendi, içerik trendi
- `BarChart` - sosyal medya dağılımı, gelir/gider karşılaştırma
- `PieChart` - pipeline dağılımı

Grafik renkleri AskDesk paletinden:
- Primary: #2563EB
- Success: #059669
- Warning: #D97706
- Error: #DC2626
- Info: #7C3AED

## 6. Sidebar Güncellemesi

Mevcut content items'tan sonra yeni separator + analitik itemları:

```
...Takvim
-----------  (yeni separator)
Analytics
Simülatör
BMC
Rakip Analizi
```

## 7. Kurallar

- OperIQ branding: "OperIQ ile Doldur", "OperIQ ile Analiz Et" (Gemini/Claude/AI yazmak yasak)
- Em dash kullanmak yasak
- Türkçe karakterler doğru kullanılacak (ş, ç, ğ, ı, ö, ü)
- AskDesk Classic Blue tasarım dili korunur
- Mevcut Phase 1 ve Phase 2 modüllerine dokunulmaz
