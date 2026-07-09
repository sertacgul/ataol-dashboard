# Veri Tasima (Data Migration) Modulu - Tasarim Dokumani

**Tarih:** 2026-07-09
**Durum:** Onaylandi

---

## 1. Amac

ActLedger'a katilan firmalarin eski sistemlerinden (SAP, Logo, ozel yazilimlar, Excel/CSV dosyalari) tarihsel verilerini tasiyabilmesi. Veri yuklendikten sonra firma, ActLedger'i sanki gecmisten beri kullaniyormus gibi gorunmeli.

## 2. Temel Kararlar

| Karar | Secim | Aciklama |
|-------|-------|----------|
| Yukleme yaklasimi | Hibrit (C) | Modul bazli veya toplu yukleme desteklenir |
| AI destegi | Kolon eslestirme + veri donusumu (B) | Claude ile akilli eslestirme ve otomatik format donusumu |
| Hata yonetimi | Kismi yukleme + hata raporu (B) | Gecerli satirlar yuklenir, hatali satirlar CSV olarak indirilir |
| Islem stratejisi | Asenkron isleme (B) | Tum importlar arka planda islenir, canli ilerleme takibi |
| Geri alma | Import bazli rollback (B) | batchId ile geri alma, bagimlilik kontrolu ile veri butunlugu korunur |

## 3. Mimari Genel Bakis

Super Admin paneline eklenen yeni bir modul. Backend'de `src/modules/data-migration/` altinda, frontend'de Super Admin sayfasina entegre.

```
Super Admin UI -> Dosya Yukleme -> AI Kolon Eslestirme -> Onizleme -> Onay
                                                                      |
                                                                Asenkron Kuyruk
                                                                      |
                                                           Satir Satir Isleme
                                                                      |
                                                      Sonuc Raporu + Bildirim
```

## 4. Veri Modeli (Prisma)

### MigrationJob

Her import islemi icin bir kayit:

```prisma
model MigrationJob {
  id               String             @id @default(uuid())
  companyId        String
  company          Company            @relation(fields: [companyId], references: [id])
  createdById      String
  createdBy        User               @relation(fields: [createdById], references: [id])
  moduleCode       MigrationModule
  subEntity        String
  sourceFormat     MigrationSourceFormat
  originalFileName String
  filePath         String
  columnMapping    Json?
  status           MigrationStatus    @default(YUKLENDI)
  totalRows        Int                @default(0)
  successRows      Int                @default(0)
  failedRows       Int                @default(0)
  errorReportPath  String?
  batchId          String             @default(uuid())
  rolledBack       Boolean            @default(false)
  rolledBackAt     DateTime?
  rolledBackById   String?
  rolledBackBy     User?              @relation("RollbackBy", fields: [rolledBackById], references: [id])
  progress         Int                @default(0)
  createdAt        DateTime           @default(now())
  completedAt      DateTime?
}

enum MigrationModule {
  ACCOUNTING
  HR
  SALES
  INVENTORY
  WORK_ORDERS
}

enum MigrationSourceFormat {
  EXCEL
  CSV
  JSON
  SQL
}

enum MigrationStatus {
  YUKLENDI
  ESLESTIRME_BEKLIYOR
  ONIZLEME
  ONAYLANDI
  ISLENIYOR
  TAMAMLANDI
  KISMI_BASARILI
  BASARISIZ
}
```

### MigrationModuleConfig

Modul bazli eslestirme sablonlari:

```prisma
model MigrationModuleConfig {
  id             String   @id @default(uuid())
  moduleCode     MigrationModule
  subEntity      String
  requiredFields Json
  optionalFields Json
  sampleMapping  Json?
  dependsOn      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([moduleCode, subEntity])
}
```

## 5. Desteklenen Moduller ve Alt Varliklar

Bagimlilik sirasi (bu sirayla yuklenmeli):

| Sira | Modul | Alt Varliklar (bagimlilik sirasi) |
|------|-------|----------------------------------|
| 1 | ACCOUNTING | ChartOfAccount -> BankAccount -> JournalEntry |
| 2 | HR | Employee -> LeaveBalance -> PayrollPeriod -> PayrollRecord |
| 3 | SALES | Customer -> Quote -> SalesOrder -> Payment |
| 4 | INVENTORY | StockItem -> StockMovement -> InventoryBatch |
| 5 | WORK_ORDERS | WorkOrder -> WorkOrderItem -> WorkOrderMaterial |

Her alt varlik icindeki `->` bagimlilik sirasini gosterir. Ornegin Customer yuklenmeden SalesOrder yuklenemez. Sistem bunu otomatik kontrol eder.

## 6. AI Kolon Eslestirme + Donusum

Mevcut `core/gemini/gemini.client.ts` (Anthropic/Claude) altyapisi genisletilir:

1. Claude'a modulun bekledigi alan listesi + kullanicinin dosyasindaki ilk 5 satir gonderilir
2. Claude her sutun icin: hedef alan, veri donusumu (tarih formati, enum eslestirme, para birimi) onerir
3. Super Admin eslestirmeyi UI'da duzenleyebilir (dropdown ile)
4. Donusum ornekleri:
   - `"Active"` -> `AKTIF`
   - `"2024/03/15"` -> ISO date
   - `"USD 1,500.00"` -> `1500.00`
   - `"Erkek"` / `"Male"` / `"M"` -> `ERKEK`

## 7. Asenkron Isleme Akisi

1. Dosya yuklenir -> `MigrationJob` kaydi olusur (`YUKLENDI`)
2. AI eslestirme calisir -> Super Admin onaylar (`ONIZLEME`)
3. Ilk 20 satir donusturulmus haliyle gosterilir
4. Super Admin "Baslat" der -> status `ISLENIYOR`, arka planda satir satir islenir
5. Her 100 satirda `progress` guncellenir (Socket.io ile canli ilerleme)
6. Tamamlaninca bildirim gonderilir + sonuc raporu hazirlanir
7. Hatali satirlar varsa hata raporu (CSV) indirilebilir

## 8. Rollback Mekanizmasi

- Her import'taki kayitlar `migrationBatchId` alaniyla isaretlenir
- Mevcut Prisma modellerine `migrationBatchId String?` alani eklenir (tasima ile gelen kayitlari isaretlemek icin)
- Rollback isteginde sistem once bagimlilik kontrolu yapar (bu batch'teki kayitlara baska kayitlar bagli mi?)
- Bagimlilik yoksa -> tum batch kayitlari silinir
- Bagimlilik varsa -> hangi kayitlarin silinemeyecegi raporlanir
- Rollback islemi de audit log'a kaydedilir

## 9. Super Admin UI Akisi

1. **Firma Secimi** — Super Admin hangi firmaya veri yukleyecegini secer
2. **Modul Secimi** — Hangi module yukleme yapilacagi (ACCOUNTING, SALES, HR, INVENTORY, WORK_ORDERS)
3. **Alt Varlik Secimi** — Modulun icindeki hangi entity (orn. ChartOfAccount, Customer)
4. **Dosya Yukleme** — Excel, CSV, JSON veya SQL dump yuklenir
5. **AI Kolon Eslestirme** — Claude sutunlari analiz eder, eslestirme onerir, Super Admin onaylar/duzeltir
6. **Onizleme** — Ilk 20 satir donusturulmus haliyle gosterilir, Super Admin kontrol eder
7. **Yukleme** — Onay sonrasi veriler arka planda islenir
8. **Sonuc Raporu** — Basarili/basarisiz satir sayilari + hata dosyasi indirme
9. **Import Gecmisi** — Tum import islemleri listelenir, rollback butonu ile geri alinabilir

## 10. Guvenlik ve Izolasyon

- Tum endpoint'ler `SUPER_ADMIN` role kontrolu altinda
- Her `MigrationJob` bir `companyId`'ye bagli — farkli firma verisi asla karismaz
- Import edilen her kayda `companyId` otomatik eklenir
- Audit log'a her import ve rollback islemi kaydedilir
- Dosyalar firma bazli dizinlerde saklanir (`uploads/migration/{companyId}/`)
- Import sirasinda firma izolasyonu icin tum sorgular `companyId` filtresi ile calisir

## 11. API Endpoint'leri

Tumu `/api/v1/super-admin/migration` altinda:

```
POST   /upload                    - Dosya yukleme + MigrationJob olusturma
POST   /:jobId/analyze            - AI kolon eslestirme baslatma
PUT    /:jobId/mapping            - Kolon eslestirmesini guncelleme
GET    /:jobId/preview            - Donusturulmus onizleme (ilk 20 satir)
POST   /:jobId/execute            - Import islemini baslatma
GET    /:jobId/status             - Ilerleme durumu
GET    /:jobId/error-report       - Hata raporu indirme
POST   /:jobId/rollback           - Import geri alma
GET    /jobs?companyId=X          - Firma bazli import gecmisi
GET    /module-config/:moduleCode - Modul eslestirme sablonu
```

## 12. Backend Dosya Yapisi

```
src/modules/data-migration/
  data-migration.controller.ts    - HTTP handler'lar
  data-migration.router.ts        - Route tanimlari
  data-migration.service.ts       - Is mantigi (job yonetimi)
  data-migration.schema.ts        - Zod validation sema'lari
  migration-processor.service.ts  - Asenkron satir isleme motoru
  migration-ai.service.ts         - Claude ile kolon eslestirme + donusum
  migration-rollback.service.ts   - Rollback mantigi + bagimlilik kontrolu
  module-configs/
    accounting.config.ts          - Muhasebe alan tanimlari + bagimliliklar
    hr.config.ts                  - IK alan tanimlari + bagimliliklar
    sales.config.ts               - Satis alan tanimlari + bagimliliklar
    inventory.config.ts           - Envanter alan tanimlari + bagimliliklar
    work-orders.config.ts         - Is emri alan tanimlari + bagimliliklar
```

## 13. Toplu Yukleme (Paket Modu)

Buyuk firmalar icin ZIP/coklu dosya destegi:

- Super Admin bir ZIP dosyasi yukler
- Sistem icindeki dosyalari tarar ve her birini hangi module/entity'ye ait oldugunu AI ile tespit eder
- Bagimlilik sirasina gore otomatik siralar
- Her dosya icin ayri MigrationJob olusturur ve sirali isler
- Tum paket tek bir `batchId` altinda gruplanir (toplu rollback icin)

## 14. Opsiyonellik

- Veri tasima tamamen opsiyonel — firma kurulumu sirasinda zorunlu degil
- Super Admin firma sayfasindan "Veri Tasima" sekmesine girerek islemi baslatir
- Firma hicbir veri tasimadan da ActLedger'i kullanmaya baslayabilir
- Tasima sonrasi veriler otomatik olarak firma kullanicilarinin yetkilerine gore erisilebilir olur
