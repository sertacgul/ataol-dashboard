# Data Migration Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Super Admins to import historical company data from legacy systems (SAP, Logo, custom software, Excel/CSV files) into all ActLedger modules, with AI-powered column mapping, async processing, and batch rollback.

**Architecture:** New `data-migration` backend module under `src/modules/data-migration/` with Prisma models for job tracking, Claude AI for column mapping + data transformation, async row-by-row processing with Socket.io progress updates, and batch rollback with dependency checking. Frontend extends Super Admin panel with a new "Veri Tasima" tab.

**Tech Stack:** Prisma (PostgreSQL), Express.js, Zod, Anthropic Claude API (via existing gemini.client.ts), multer (file upload), xlsx (Excel parsing), Socket.io (progress), React + Tailwind CSS (frontend)

---

## File Structure

### Backend — New files

```
src/modules/data-migration/
  data-migration.router.ts          — Express routes with SUPER_ADMIN auth
  data-migration.controller.ts      — HTTP handlers
  data-migration.service.ts         — Job CRUD, orchestration
  data-migration.schema.ts          — Zod validation schemas
  migration-ai.service.ts           — Claude column mapping + transformation
  migration-processor.service.ts    — Async row-by-row processing engine
  migration-rollback.service.ts     — Batch rollback with dependency check
  module-configs/
    index.ts                        — Config registry + types
    accounting.config.ts            — ChartOfAccount, BankAccount, JournalEntry fields
    hr.config.ts                    — Employee, LeaveBalance, PayrollPeriod, PayrollRecord fields
    sales.config.ts                 — Customer, Quote, SalesOrder, Payment fields
    inventory.config.ts             — StockItem, StockMovement, InventoryBatch fields
    work-orders.config.ts           — WorkOrder, WorkOrderItem, WorkOrderMaterial fields
```

### Backend — Modified files

```
prisma/schema.prisma               — Add MigrationJob model, MigrationModuleConfig model, enums, migrationBatchId to target models
src/app.ts                          — Register data-migration router
```

### Frontend — New files

```
src/components/super-admin/
  DataMigration.tsx                 — Main migration container (job list + wizard steps)
```

### Frontend — Modified files

```
src/pages/SuperAdmin.tsx            — Add "Veri Tasima" tab + import DataMigration component
```

---

## Task 1: Prisma Schema — Migration Models + Enums

**Files:**
- Modify: `actledger-backend/prisma/schema.prisma`

- [ ] **Step 1: Add migration enums after existing enums (after line 17)**

Find the `ModuleCode` enum at line 12 and add new enums after line 17:

```prisma
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

- [ ] **Step 2: Add MigrationJob and MigrationModuleConfig models at end of schema (after line 3424)**

```prisma
// ─── Data Migration ─────────────────────────────────────────────────────────

model MigrationJob {
  id               String                @id @default(cuid())
  companyId        String
  company          Company               @relation(fields: [companyId], references: [id], onDelete: Cascade)
  createdById      String
  createdBy        User                  @relation("MigrationCreator", fields: [createdById], references: [id])
  moduleCode       MigrationModule
  subEntity        String
  sourceFormat     MigrationSourceFormat
  originalFileName String
  filePath         String
  columnMapping    Json?
  status           MigrationStatus       @default(YUKLENDI)
  totalRows        Int                   @default(0)
  successRows      Int                   @default(0)
  failedRows       Int                   @default(0)
  errorReportPath  String?
  batchId          String                @default(cuid())
  rolledBack       Boolean               @default(false)
  rolledBackAt     DateTime?
  rolledBackById   String?
  rolledBackBy     User?                 @relation("MigrationRollback", fields: [rolledBackById], references: [id])
  progress         Int                   @default(0)
  createdAt        DateTime              @default(now())
  completedAt      DateTime?

  @@index([companyId])
  @@index([companyId, status])
  @@index([batchId])
}

model MigrationModuleConfig {
  id             String          @id @default(cuid())
  moduleCode     MigrationModule
  subEntity      String
  requiredFields Json
  optionalFields Json
  sampleMapping  Json?
  dependsOn      String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@unique([moduleCode, subEntity])
}
```

- [ ] **Step 3: Add relation arrays to Company model (after line 482)**

Add inside `model Company` block, after `screeningSessions` line:

```prisma
  migrationJobs      MigrationJob[]
```

- [ ] **Step 4: Add relation arrays to User model**

Find end of User model relations and add:

```prisma
  migrationJobsCreated   MigrationJob[]  @relation("MigrationCreator")
  migrationJobsRolledBack MigrationJob[] @relation("MigrationRollback")
```

- [ ] **Step 5: Add migrationBatchId field to target models**

Add `migrationBatchId String?` and `@@index([migrationBatchId])` to each of these models:
- `ChartOfAccount` (line 825)
- `BankAccount` (line 554)
- `JournalEntry` (line 846)
- `JournalLine` (line 876)
- `Employee` (line 977)
- `LeaveBalance` (line 1030)
- `PayrollPeriod` (line 1072)
- `PayrollRecord` (line 1096)
- `Customer` (line 652)
- `Quote` (line 605)
- `SalesOrder` (line 682)
- `Payment` (line 738)
- `StockItem` (line 2048)
- `StockMovement` (line 2111)
- `InventoryBatch` (line 2489)
- `WorkOrder` (line 2798)
- `WorkOrderItem` (line 2855)
- `WorkOrderMaterial` (line 2888)

For each model, add before the closing `}`:
```prisma
  migrationBatchId String?
  @@index([migrationBatchId])
```

- [ ] **Step 6: Run Prisma migration**

Run: `npx prisma migrate dev --name add-data-migration-models` in actledger-backend
Expected: Migration created successfully, Prisma client regenerated.

- [ ] **Step 7: Commit**

```bash
cd actledger-backend
git add prisma/
git commit -m "feat(schema): add MigrationJob, MigrationModuleConfig models and migrationBatchId fields"
```

---

## Task 2: Module Configs — Field Definitions Per Module

**Files:**
- Create: `actledger-backend/src/modules/data-migration/module-configs/index.ts`
- Create: `actledger-backend/src/modules/data-migration/module-configs/accounting.config.ts`
- Create: `actledger-backend/src/modules/data-migration/module-configs/hr.config.ts`
- Create: `actledger-backend/src/modules/data-migration/module-configs/sales.config.ts`
- Create: `actledger-backend/src/modules/data-migration/module-configs/inventory.config.ts`
- Create: `actledger-backend/src/modules/data-migration/module-configs/work-orders.config.ts`

- [ ] **Step 1: Create index.ts with types and registry**

Create `src/modules/data-migration/module-configs/index.ts`:

```typescript
import { MigrationModule } from '@prisma/client'
import { accountingConfigs } from './accounting.config'
import { hrConfigs } from './hr.config'
import { salesConfigs } from './sales.config'
import { inventoryConfigs } from './inventory.config'
import { workOrderConfigs } from './work-orders.config'

export interface FieldDef {
  /** ActLedger field name (Prisma column) */
  field: string
  /** Human-readable label (Turkish) */
  label: string
  /** Expected data type */
  type: 'string' | 'number' | 'decimal' | 'date' | 'boolean' | 'enum'
  /** Is this field required? */
  required: boolean
  /** Allowed enum values (if type is 'enum') */
  enumValues?: string[]
  /** Default value if not provided */
  defaultValue?: unknown
}

export interface SubEntityConfig {
  subEntity: string
  /** Human-readable label (Turkish) */
  label: string
  /** Prisma model name for DB operations */
  prismaModel: string
  /** SubEntities that must be imported before this one */
  dependsOn: string[]
  requiredFields: FieldDef[]
  optionalFields: FieldDef[]
}

export interface ModuleConfig {
  moduleCode: MigrationModule
  label: string
  subEntities: SubEntityConfig[]
}

const MODULE_CONFIGS: Record<MigrationModule, ModuleConfig> = {
  ACCOUNTING: accountingConfigs,
  HR: hrConfigs,
  SALES: salesConfigs,
  INVENTORY: inventoryConfigs,
  WORK_ORDERS: workOrderConfigs,
}

export function getModuleConfig(moduleCode: MigrationModule): ModuleConfig {
  return MODULE_CONFIGS[moduleCode]
}

export function getSubEntityConfig(moduleCode: MigrationModule, subEntity: string): SubEntityConfig | undefined {
  return MODULE_CONFIGS[moduleCode].subEntities.find(s => s.subEntity === subEntity)
}

export function getAllModuleConfigs(): ModuleConfig[] {
  return Object.values(MODULE_CONFIGS)
}
```

- [ ] **Step 2: Create accounting.config.ts**

Create `src/modules/data-migration/module-configs/accounting.config.ts`:

```typescript
import type { ModuleConfig } from './index'

export const accountingConfigs: ModuleConfig = {
  moduleCode: 'ACCOUNTING',
  label: 'Muhasebe',
  subEntities: [
    {
      subEntity: 'ChartOfAccount',
      label: 'Hesap Plani',
      prismaModel: 'chartOfAccount',
      dependsOn: [],
      requiredFields: [
        { field: 'code', label: 'Hesap Kodu', type: 'string', required: true },
        { field: 'name', label: 'Hesap Adi', type: 'string', required: true },
        { field: 'accountType', label: 'Hesap Tipi', type: 'enum', required: true, enumValues: ['VARLIK', 'YUKUMLULUK', 'OZKAYNAK', 'GELIR', 'GIDER'] },
      ],
      optionalFields: [
        { field: 'parentCode', label: 'Ust Hesap Kodu', type: 'string', required: false },
        { field: 'isLeaf', label: 'Alt Hesap Mi', type: 'boolean', required: false, defaultValue: true },
      ],
    },
    {
      subEntity: 'BankAccount',
      label: 'Banka Hesaplari',
      prismaModel: 'bankAccount',
      dependsOn: [],
      requiredFields: [
        { field: 'name', label: 'Hesap Adi', type: 'string', required: true },
        { field: 'bankName', label: 'Banka Adi', type: 'string', required: true },
      ],
      optionalFields: [
        { field: 'accountNumber', label: 'Hesap Numarasi', type: 'string', required: false },
        { field: 'iban', label: 'IBAN', type: 'string', required: false },
        { field: 'currency', label: 'Para Birimi', type: 'string', required: false, defaultValue: 'TRY' },
        { field: 'balance', label: 'Bakiye', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'accountCode', label: 'Muhasebe Hesap Kodu', type: 'string', required: false },
      ],
    },
    {
      subEntity: 'JournalEntry',
      label: 'Yevmiye Kayitlari',
      prismaModel: 'journalEntry',
      dependsOn: ['ChartOfAccount'],
      requiredFields: [
        { field: 'entryNumber', label: 'Fis Numarasi', type: 'string', required: true },
        { field: 'date', label: 'Tarih', type: 'date', required: true },
        { field: 'description', label: 'Aciklama', type: 'string', required: true },
      ],
      optionalFields: [
        { field: 'status', label: 'Durum', type: 'enum', required: false, enumValues: ['TASLAK', 'ONAY_BEKLIYOR', 'ONAYLANDI', 'IPTAL'], defaultValue: 'ONAYLANDI' },
        { field: 'totalDebit', label: 'Toplam Borc', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'totalCredit', label: 'Toplam Alacak', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'sourceType', label: 'Kaynak Tipi', type: 'string', required: false },
      ],
    },
  ],
}
```

- [ ] **Step 3: Create sales.config.ts**

Create `src/modules/data-migration/module-configs/sales.config.ts`:

```typescript
import type { ModuleConfig } from './index'

export const salesConfigs: ModuleConfig = {
  moduleCode: 'SALES',
  label: 'Satis',
  subEntities: [
    {
      subEntity: 'Customer',
      label: 'Musteriler',
      prismaModel: 'customer',
      dependsOn: [],
      requiredFields: [
        { field: 'name', label: 'Musteri Adi', type: 'string', required: true },
      ],
      optionalFields: [
        { field: 'taxNumber', label: 'Vergi Numarasi', type: 'string', required: false },
        { field: 'phone', label: 'Telefon', type: 'string', required: false },
        { field: 'email', label: 'E-posta', type: 'string', required: false },
        { field: 'address', label: 'Adres', type: 'string', required: false },
        { field: 'customerType', label: 'Musteri Tipi', type: 'enum', required: false, enumValues: ['PERAKENDE', 'TOPTAN', 'KURUMSAL', 'TEDARIKCI', 'HER_IKISI'], defaultValue: 'KURUMSAL' },
        { field: 'creditLimit', label: 'Kredi Limiti', type: 'decimal', required: false },
        { field: 'paymentTermDays', label: 'Odeme Vadesi (Gun)', type: 'number', required: false, defaultValue: 0 },
        { field: 'balance', label: 'Bakiye', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'notes', label: 'Notlar', type: 'string', required: false },
      ],
    },
    {
      subEntity: 'Quote',
      label: 'Teklifler',
      prismaModel: 'quote',
      dependsOn: ['Customer'],
      requiredFields: [
        { field: 'quoteNumber', label: 'Teklif Numarasi', type: 'string', required: true },
        { field: 'customerName', label: 'Musteri Adi', type: 'string', required: true },
      ],
      optionalFields: [
        { field: 'status', label: 'Durum', type: 'enum', required: false, enumValues: ['TASLAK', 'GONDERILDI', 'ONAYLANDI', 'REDDEDILDI', 'IPTAL', 'SIPARISE_DONUSTU'], defaultValue: 'ONAYLANDI' },
        { field: 'validUntil', label: 'Gecerlilik Tarihi', type: 'date', required: false },
        { field: 'subtotal', label: 'Ara Toplam', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'taxAmount', label: 'KDV', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'totalAmount', label: 'Toplam', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'currency', label: 'Para Birimi', type: 'string', required: false, defaultValue: 'TRY' },
        { field: 'notes', label: 'Notlar', type: 'string', required: false },
      ],
    },
    {
      subEntity: 'SalesOrder',
      label: 'Satis Siparisleri',
      prismaModel: 'salesOrder',
      dependsOn: ['Customer'],
      requiredFields: [
        { field: 'orderNumber', label: 'Siparis Numarasi', type: 'string', required: true },
        { field: 'customerName', label: 'Musteri Adi', type: 'string', required: true },
      ],
      optionalFields: [
        { field: 'status', label: 'Durum', type: 'enum', required: false, enumValues: ['TASLAK', 'ONAYLANDI', 'HAZIRLANIYOR', 'TAMAMLANDI', 'IPTAL'], defaultValue: 'TAMAMLANDI' },
        { field: 'subtotal', label: 'Ara Toplam', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'discountAmount', label: 'Indirim', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'taxAmount', label: 'KDV', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'totalAmount', label: 'Toplam', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'notes', label: 'Notlar', type: 'string', required: false },
      ],
    },
    {
      subEntity: 'Payment',
      label: 'Odemeler',
      prismaModel: 'payment',
      dependsOn: ['Customer', 'SalesOrder'],
      requiredFields: [
        { field: 'amount', label: 'Tutar', type: 'decimal', required: true },
        { field: 'date', label: 'Odeme Tarihi', type: 'date', required: true },
      ],
      optionalFields: [
        { field: 'method', label: 'Odeme Yontemi', type: 'enum', required: false, enumValues: ['NAKIT', 'KREDI_KARTI', 'CEK', 'HAVALE'], defaultValue: 'HAVALE' },
        { field: 'orderNumber', label: 'Siparis Numarasi', type: 'string', required: false },
        { field: 'customerName', label: 'Musteri Adi', type: 'string', required: false },
        { field: 'reference', label: 'Referans', type: 'string', required: false },
        { field: 'notes', label: 'Notlar', type: 'string', required: false },
      ],
    },
  ],
}
```

- [ ] **Step 4: Create hr.config.ts**

Create `src/modules/data-migration/module-configs/hr.config.ts`:

```typescript
import type { ModuleConfig } from './index'

export const hrConfigs: ModuleConfig = {
  moduleCode: 'HR',
  label: 'Insan Kaynaklari',
  subEntities: [
    {
      subEntity: 'Employee',
      label: 'Calisanlar',
      prismaModel: 'employee',
      dependsOn: [],
      requiredFields: [
        { field: 'employeeNumber', label: 'Sicil Numarasi', type: 'string', required: true },
        { field: 'name', label: 'Ad Soyad', type: 'string', required: true },
        { field: 'email', label: 'E-posta', type: 'string', required: true },
        { field: 'startDate', label: 'Ise Baslama Tarihi', type: 'date', required: true },
      ],
      optionalFields: [
        { field: 'nationalId', label: 'TC Kimlik No', type: 'string', required: false },
        { field: 'employmentStatus', label: 'Calisma Durumu', type: 'enum', required: false, enumValues: ['AKTIF', 'IZINLI', 'ASKIDA', 'AYRILDI'], defaultValue: 'AKTIF' },
        { field: 'grossSalary', label: 'Brut Maas', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'sgkNumber', label: 'SGK Numarasi', type: 'string', required: false },
        { field: 'bankName', label: 'Banka Adi', type: 'string', required: false },
        { field: 'iban', label: 'IBAN', type: 'string', required: false },
        { field: 'phone', label: 'Telefon', type: 'string', required: false },
        { field: 'emergencyContact', label: 'Acil Durum Kisi', type: 'string', required: false },
        { field: 'emergencyPhone', label: 'Acil Durum Tel', type: 'string', required: false },
        { field: 'bloodType', label: 'Kan Grubu', type: 'string', required: false },
        { field: 'educationLevel', label: 'Egitim Durumu', type: 'string', required: false },
        { field: 'maritalStatus', label: 'Medeni Durum', type: 'string', required: false },
        { field: 'endDate', label: 'Ayrilma Tarihi', type: 'date', required: false },
        { field: 'notes', label: 'Notlar', type: 'string', required: false },
      ],
    },
    {
      subEntity: 'LeaveBalance',
      label: 'Izin Bakiyeleri',
      prismaModel: 'leaveBalance',
      dependsOn: ['Employee'],
      requiredFields: [
        { field: 'employeeNumber', label: 'Sicil Numarasi', type: 'string', required: true },
        { field: 'year', label: 'Yil', type: 'number', required: true },
        { field: 'leaveType', label: 'Izin Tipi', type: 'enum', required: true, enumValues: ['YILLIK', 'HASTALIK', 'DOGUM', 'OLUM', 'EVLILIK', 'UCRETSIZ', 'DIGER'] },
      ],
      optionalFields: [
        { field: 'entitlement', label: 'Hakedis (Gun)', type: 'number', required: false, defaultValue: 0 },
        { field: 'used', label: 'Kullanilan (Gun)', type: 'number', required: false, defaultValue: 0 },
        { field: 'remaining', label: 'Kalan (Gun)', type: 'number', required: false, defaultValue: 0 },
      ],
    },
    {
      subEntity: 'PayrollPeriod',
      label: 'Bordro Donemleri',
      prismaModel: 'payrollPeriod',
      dependsOn: [],
      requiredFields: [
        { field: 'year', label: 'Yil', type: 'number', required: true },
        { field: 'month', label: 'Ay', type: 'number', required: true },
      ],
      optionalFields: [
        { field: 'status', label: 'Durum', type: 'enum', required: false, enumValues: ['TASLAK', 'HESAPLANDI', 'ONAYLANDI', 'ODENDI'], defaultValue: 'ODENDI' },
        { field: 'totalGross', label: 'Toplam Brut', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'totalNet', label: 'Toplam Net', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'totalSgk', label: 'Toplam SGK', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'totalTax', label: 'Toplam Vergi', type: 'decimal', required: false, defaultValue: 0 },
      ],
    },
    {
      subEntity: 'PayrollRecord',
      label: 'Bordro Kayitlari',
      prismaModel: 'payrollRecord',
      dependsOn: ['Employee', 'PayrollPeriod'],
      requiredFields: [
        { field: 'employeeNumber', label: 'Sicil Numarasi', type: 'string', required: true },
        { field: 'year', label: 'Yil', type: 'number', required: true },
        { field: 'month', label: 'Ay', type: 'number', required: true },
        { field: 'grossSalary', label: 'Brut Maas', type: 'decimal', required: true },
      ],
      optionalFields: [
        { field: 'sgkEmployee', label: 'SGK Isci', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'sgkEmployer', label: 'SGK Isveren', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'incomeTax', label: 'Gelir Vergisi', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'stampTax', label: 'Damga Vergisi', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'netSalary', label: 'Net Maas', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'bonus', label: 'Prim', type: 'decimal', required: false, defaultValue: 0 },
        { field: 'overtime', label: 'Fazla Mesai', type: 'decimal', required: false, defaultValue: 0 },
      ],
    },
  ],
}
```

- [ ] **Step 5: Create inventory.config.ts**

Create `src/modules/data-migration/module-configs/inventory.config.ts`:

```typescript
import type { ModuleConfig } from './index'

export const inventoryConfigs: ModuleConfig = {
  moduleCode: 'INVENTORY',
  label: 'Envanter',
  subEntities: [
    {
      subEntity: 'StockItem',
      label: 'Stok Kalemleri',
      prismaModel: 'stockItem',
      dependsOn: [],
      requiredFields: [
        { field: 'name', label: 'Urun Adi', type: 'string', required: true },
        { field: 'category', label: 'Kategori', type: 'enum', required: true, enumValues: ['DEMIRBAS', 'SARF', 'YEDEK_PARCA'] },
        { field: 'unit', label: 'Birim', type: 'string', required: true },
      ],
      optionalFields: [
        { field: 'code', label: 'Stok Kodu', type: 'string', required: false },
        { field: 'quantity', label: 'Miktar', type: 'number', required: false, defaultValue: 0 },
        { field: 'minLevel', label: 'Min Seviye', type: 'number', required: false, defaultValue: 0 },
        { field: 'maxLevel', label: 'Maks Seviye', type: 'number', required: false },
        { field: 'criticalLevel', label: 'Kritik Seviye', type: 'number', required: false, defaultValue: 0 },
        { field: 'locationName', label: 'Lokasyon', type: 'string', required: false },
        { field: 'vendor', label: 'Tedarikci', type: 'string', required: false },
        { field: 'unitCost', label: 'Birim Maliyet', type: 'decimal', required: false },
        { field: 'barcode', label: 'Barkod', type: 'string', required: false },
        { field: 'description', label: 'Aciklama', type: 'string', required: false },
        { field: 'supplyLeadDays', label: 'Tedarik Suresi (Gun)', type: 'number', required: false },
      ],
    },
    {
      subEntity: 'StockMovement',
      label: 'Stok Hareketleri',
      prismaModel: 'stockMovement',
      dependsOn: ['StockItem'],
      requiredFields: [
        { field: 'stockItemName', label: 'Urun Adi', type: 'string', required: true },
        { field: 'type', label: 'Hareket Tipi', type: 'enum', required: true, enumValues: ['GIRIS', 'CIKIS', 'TRANSFER', 'SAYIM', 'FIRE'] },
        { field: 'quantity', label: 'Miktar', type: 'number', required: true },
      ],
      optionalFields: [
        { field: 'previousQty', label: 'Onceki Miktar', type: 'number', required: false, defaultValue: 0 },
        { field: 'newQty', label: 'Yeni Miktar', type: 'number', required: false, defaultValue: 0 },
        { field: 'fromLocation', label: 'Kaynak Lokasyon', type: 'string', required: false },
        { field: 'toLocation', label: 'Hedef Lokasyon', type: 'string', required: false },
        { field: 'description', label: 'Aciklama', type: 'string', required: false },
        { field: 'date', label: 'Tarih', type: 'date', required: false },
      ],
    },
    {
      subEntity: 'InventoryBatch',
      label: 'Parti/Lot Bilgileri',
      prismaModel: 'inventoryBatch',
      dependsOn: ['StockItem'],
      requiredFields: [
        { field: 'stockItemName', label: 'Urun Adi', type: 'string', required: true },
        { field: 'batchNumber', label: 'Parti Numarasi', type: 'string', required: true },
      ],
      optionalFields: [
        { field: 'quantity', label: 'Miktar', type: 'number', required: false, defaultValue: 0 },
        { field: 'unit', label: 'Birim', type: 'string', required: false },
        { field: 'productionDate', label: 'Uretim Tarihi', type: 'date', required: false },
        { field: 'expiryDate', label: 'Son Kullanma Tarihi', type: 'date', required: false },
        { field: 'supplier', label: 'Tedarikci', type: 'string', required: false },
        { field: 'status', label: 'Durum', type: 'enum', required: false, enumValues: ['AKTIF', 'TUKENDI', 'SURESI_DOLDU', 'KARANTINA', 'IADE'], defaultValue: 'AKTIF' },
      ],
    },
  ],
}
```

- [ ] **Step 6: Create work-orders.config.ts**

Create `src/modules/data-migration/module-configs/work-orders.config.ts`:

```typescript
import type { ModuleConfig } from './index'

export const workOrderConfigs: ModuleConfig = {
  moduleCode: 'WORK_ORDERS',
  label: 'Is Emirleri',
  subEntities: [
    {
      subEntity: 'WorkOrder',
      label: 'Is Emirleri',
      prismaModel: 'workOrder',
      dependsOn: [],
      requiredFields: [
        { field: 'code', label: 'Is Emri Kodu', type: 'string', required: true },
        { field: 'title', label: 'Baslik', type: 'string', required: true },
      ],
      optionalFields: [
        { field: 'description', label: 'Aciklama', type: 'string', required: false },
        { field: 'status', label: 'Durum', type: 'enum', required: false, enumValues: ['TASLAK', 'ONAY_BEKLIYOR', 'ONAYLANDI', 'DEVAM_EDIYOR', 'TAMAMLANDI', 'KAPANDI', 'REDDEDILDI'], defaultValue: 'TAMAMLANDI' },
        { field: 'priority', label: 'Oncelik', type: 'enum', required: false, enumValues: ['DUSUK', 'NORMAL', 'YUKSEK', 'ACIL'], defaultValue: 'NORMAL' },
        { field: 'dueDate', label: 'Bitis Tarihi', type: 'date', required: false },
        { field: 'estimatedHours', label: 'Tahmini Saat', type: 'number', required: false },
        { field: 'actualHours', label: 'Gerceklesen Saat', type: 'number', required: false },
        { field: 'estimatedCost', label: 'Tahmini Maliyet', type: 'number', required: false },
        { field: 'actualCost', label: 'Gerceklesen Maliyet', type: 'number', required: false },
      ],
    },
    {
      subEntity: 'WorkOrderItem',
      label: 'Is Emri Kalemleri',
      prismaModel: 'workOrderItem',
      dependsOn: ['WorkOrder'],
      requiredFields: [
        { field: 'workOrderCode', label: 'Is Emri Kodu', type: 'string', required: true },
        { field: 'title', label: 'Kalem Adi', type: 'string', required: true },
      ],
      optionalFields: [
        { field: 'completed', label: 'Tamamlandi Mi', type: 'boolean', required: false, defaultValue: false },
        { field: 'sortOrder', label: 'Sira', type: 'number', required: false, defaultValue: 0 },
      ],
    },
    {
      subEntity: 'WorkOrderMaterial',
      label: 'Is Emri Malzemeleri',
      prismaModel: 'workOrderMaterial',
      dependsOn: ['WorkOrder'],
      requiredFields: [
        { field: 'workOrderCode', label: 'Is Emri Kodu', type: 'string', required: true },
        { field: 'name', label: 'Malzeme Adi', type: 'string', required: true },
        { field: 'quantity', label: 'Miktar', type: 'number', required: true },
        { field: 'unit', label: 'Birim', type: 'string', required: true },
      ],
      optionalFields: [
        { field: 'unitCost', label: 'Birim Maliyet', type: 'number', required: false },
      ],
    },
  ],
}
```

- [ ] **Step 7: Commit**

```bash
cd actledger-backend
git add src/modules/data-migration/module-configs/
git commit -m "feat(migration): add module field configs for all 5 modules"
```

---

## Task 3: Zod Validation Schemas

**Files:**
- Create: `actledger-backend/src/modules/data-migration/data-migration.schema.ts`

- [ ] **Step 1: Create validation schemas**

Create `src/modules/data-migration/data-migration.schema.ts`:

```typescript
import { z } from 'zod'

export const uploadSchema = z.object({
  companyId:    z.string().min(1),
  moduleCode:   z.enum(['ACCOUNTING', 'HR', 'SALES', 'INVENTORY', 'WORK_ORDERS']),
  subEntity:    z.string().trim().min(1).max(100),
  sourceFormat: z.enum(['EXCEL', 'CSV', 'JSON', 'SQL']),
})

export const updateMappingSchema = z.object({
  columnMapping: z.record(z.string(), z.string()),
})

export const jobListQuerySchema = z.object({
  companyId: z.string().min(1),
  page:      z.coerce.number().positive().default(1),
  pageSize:  z.coerce.number().min(1).max(100).default(20),
  status:    z.enum(['YUKLENDI', 'ESLESTIRME_BEKLIYOR', 'ONIZLEME', 'ONAYLANDI', 'ISLENIYOR', 'TAMAMLANDI', 'KISMI_BASARILI', 'BASARISIZ']).optional(),
})

export type UploadDto = z.infer<typeof uploadSchema>
export type UpdateMappingDto = z.infer<typeof updateMappingSchema>
export type JobListQuery = z.infer<typeof jobListQuerySchema>
```

- [ ] **Step 2: Commit**

```bash
cd actledger-backend
git add src/modules/data-migration/data-migration.schema.ts
git commit -m "feat(migration): add Zod validation schemas"
```

---

## Task 4: Migration AI Service — Claude Column Mapping

**Files:**
- Create: `actledger-backend/src/modules/data-migration/migration-ai.service.ts`

- [ ] **Step 1: Create AI service**

Create `src/modules/data-migration/migration-ai.service.ts`:

```typescript
import { generateContent, isGeminiAvailable } from '../../core/gemini/gemini.client'
import { logger } from '../../core/logger/winston.logger'
import type { FieldDef } from './module-configs'

type RawRow = Record<string, unknown>

export interface MappingResult {
  columnMapping: Record<string, string>
  transformations: Record<string, TransformRule>
  warnings: string[]
}

export interface TransformRule {
  type: 'none' | 'date' | 'enum' | 'number' | 'boolean' | 'currency'
  enumMap?: Record<string, string>
  dateFormat?: string
}

export async function analyzeColumns(
  sampleRows: RawRow[],
  requiredFields: FieldDef[],
  optionalFields: FieldDef[],
  subEntityLabel: string,
): Promise<MappingResult> {
  if (!isGeminiAvailable() || sampleRows.length === 0) {
    return directMapping(sampleRows[0], requiredFields, optionalFields)
  }

  const sourceColumns = Object.keys(sampleRows[0])
  const allFields = [...requiredFields, ...optionalFields]

  const prompt = `Sen bir veri tasima uzmansin. Kullanicinin yukledigi dosyadaki sutunlari ActLedger "${subEntityLabel}" alanlarina eslestirmelisin.

KAYNAK DOSYA SUTUNLARI:
${sourceColumns.map(c => `- "${c}"`).join('\n')}

ORNEK VERILER (ilk 5 satir):
${JSON.stringify(sampleRows.slice(0, 5), null, 2)}

ACTLEDGER HEDEF ALANLARI:
${allFields.map(f => `- field: "${f.field}", label: "${f.label}", type: ${f.type}${f.required ? ' (ZORUNLU)' : ''}${f.enumValues ? `, values: [${f.enumValues.join(', ')}]` : ''}`).join('\n')}

GOREV:
1. Her kaynak sutunu icin en uygun ActLedger alanini eslestir
2. Veri donusumu gerekiyorsa belirt (tarih formati, enum eslestirme, sayi temizleme vb.)
3. Eslestirilemeyen sutunlari uyari olarak bildir

CEVABI SADECE JSON OLARAK VER, baska metin yazma:
{
  "columnMapping": { "kaynak_sutun": "hedef_alan" },
  "transformations": {
    "kaynak_sutun": {
      "type": "none|date|enum|number|boolean|currency",
      "enumMap": { "kaynak_deger": "HEDEF_DEGER" },
      "dateFormat": "YYYY-MM-DD"
    }
  },
  "warnings": ["eslestirilemeyen sutun bilgisi"]
}`

  try {
    const rawText = (await generateContent(prompt)).trim()
    const jsonText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(jsonText)
    return {
      columnMapping: parsed.columnMapping ?? {},
      transformations: parsed.transformations ?? {},
      warnings: parsed.warnings ?? [],
    }
  } catch (err) {
    logger.error('Migration AI analysis failed', { error: err })
    return directMapping(sampleRows[0], requiredFields, optionalFields)
  }
}

function directMapping(
  sampleRow: RawRow,
  requiredFields: FieldDef[],
  optionalFields: FieldDef[],
): MappingResult {
  const sourceColumns = Object.keys(sampleRow)
  const allFields = [...requiredFields, ...optionalFields]
  const mapping: Record<string, string> = {}
  const transformations: Record<string, TransformRule> = {}
  const warnings: string[] = []

  for (const col of sourceColumns) {
    const colLower = col.toLowerCase().replace(/[_\-\s]/g, '')
    let matched = false

    for (const f of allFields) {
      const fieldLower = f.field.toLowerCase()
      const labelLower = f.label.toLowerCase().replace(/[_\-\s]/g, '')

      if (colLower === fieldLower || colLower === labelLower || colLower.includes(fieldLower)) {
        mapping[col] = f.field
        transformations[col] = { type: 'none' }
        matched = true
        break
      }
    }

    if (!matched) {
      warnings.push(`"${col}" sutunu otomatik eslestirilemedi`)
    }
  }

  if (warnings.length > 0) {
    warnings.unshift('AI analizi kullanilamadi, dogrudan eslestirme yapildi')
  }

  return { columnMapping: mapping, transformations, warnings }
}

export function transformValue(value: unknown, rule: TransformRule): unknown {
  if (value === null || value === undefined || value === '') return null

  const str = String(value).trim()

  switch (rule.type) {
    case 'enum':
      if (rule.enumMap) {
        const upper = str.toUpperCase()
        return rule.enumMap[str] ?? rule.enumMap[upper] ?? str
      }
      return str

    case 'date': {
      const d = new Date(str)
      return isNaN(d.getTime()) ? null : d.toISOString()
    }

    case 'number': {
      const cleaned = str.replace(/[^\d.\-]/g, '')
      const num = Number(cleaned)
      return isNaN(num) ? null : num
    }

    case 'currency': {
      const cleaned = str.replace(/[^\d.,\-]/g, '').replace(',', '.')
      const num = parseFloat(cleaned)
      return isNaN(num) ? null : num
    }

    case 'boolean': {
      const lower = str.toLowerCase()
      if (['true', '1', 'evet', 'yes', 'e', 'y'].includes(lower)) return true
      if (['false', '0', 'hayir', 'no', 'h', 'n'].includes(lower)) return false
      return null
    }

    default:
      return str
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd actledger-backend
git add src/modules/data-migration/migration-ai.service.ts
git commit -m "feat(migration): add Claude AI column mapping and transformation service"
```

---

## Task 5: Migration Processor Service — Async Row Processing

**Files:**
- Create: `actledger-backend/src/modules/data-migration/migration-processor.service.ts`

- [ ] **Step 1: Create processor service**

This is the largest file. It contains:
- `processJob(jobId)` — Main entry: reads file, processes rows, updates status, emits Socket.io events
- `processRows(...)` — Iterates rows, calls `insertRecord` per row, updates progress every 50 rows
- `mapRow(row, mapping, transformations)` — Applies column mapping + value transformation
- `insertRecord(companyId, userId, batchId, prismaModel, subEntity, data)` — Switch/case per subEntity with Prisma create calls
- `readDataFile(filePath, format)` — Reads EXCEL/CSV/JSON/SQL files
- `parseCsv(content)` — CSV parser (auto-detects separator: comma, semicolon, tab)
- `parseSqlInserts(content)` — Extracts data from SQL INSERT statements
- `writeErrorReport(companyId, jobId, errors)` — Writes failed rows to CSV

Create `src/modules/data-migration/migration-processor.service.ts` with the full implementation. Key patterns:

- Each `insertRecord` case matches a Prisma model and always sets `companyId` and `migrationBatchId`
- For entities with foreign keys (e.g. Quote needs customerId), it looks up the referenced record by name
- Employee import also creates a User record with `mustChangePassword: true`
- Progress is emitted via `emitToUser(userId, 'migration:progress', {...})` from `socket.manager`
- Completion is emitted via `emitToUser(userId, 'migration:complete', {...})`
- Errors are collected and written as CSV to `uploads/migration/{companyId}/error-report-{jobId}.csv`

The full code for this file is extensive (18 subEntity switch cases). Each case follows this pattern:

```typescript
case 'Customer':
  await prisma.customer.create({
    data: {
      companyId,
      migrationBatchId: batchId,
      name: String(data.name ?? ''),
      taxNumber: data.taxNumber ? String(data.taxNumber) : null,
      // ... map each field from data
    },
  })
  break
```

For entities with lookups:
```typescript
case 'Quote': {
  const customer = data.customerName
    ? await prisma.customer.findFirst({ where: { companyId, name: String(data.customerName) } })
    : null
  if (!customer) throw new Error(`Musteri bulunamadi: ${data.customerName}`)
  await prisma.quote.create({
    data: {
      companyId,
      migrationBatchId: batchId,
      customerId: customer.id,
      createdById: userId,
      // ... other fields
    },
  })
  break
}
```

- [ ] **Step 2: Commit**

```bash
cd actledger-backend
git add src/modules/data-migration/migration-processor.service.ts
git commit -m "feat(migration): add async row processor with per-entity insert logic"
```

---

## Task 6: Migration Rollback Service

**Files:**
- Create: `actledger-backend/src/modules/data-migration/migration-rollback.service.ts`

- [ ] **Step 1: Create rollback service**

Create `src/modules/data-migration/migration-rollback.service.ts` with:

- `rollbackJob(jobId, userId)` — Validates job status, checks dependencies, deletes records by batchId
- `checkDependencies(batchId, companyId, subEntity)` — Checks if non-migration records depend on batch records (e.g. non-migrated orders referencing migrated customers)
- `deleteByBatch(batchId, subEntity)` — Deletes all records with matching migrationBatchId. For Employee, also deletes associated User records

Key pattern:
```typescript
const blocked = await checkDependencies(batchId, job.companyId, job.subEntity)
if (blocked.length > 0) {
  throw new BadRequestError(`Geri alma yapilamadi. ${blocked.join(', ')}`)
}
const deletedCounts = await deleteByBatch(batchId, job.subEntity)
await prisma.migrationJob.update({
  where: { id: jobId },
  data: { rolledBack: true, rolledBackAt: new Date(), rolledBackById: userId },
})
```

- [ ] **Step 2: Commit**

```bash
cd actledger-backend
git add src/modules/data-migration/migration-rollback.service.ts
git commit -m "feat(migration): add batch rollback service with dependency checking"
```

---

## Task 7: Main Data Migration Service

**Files:**
- Create: `actledger-backend/src/modules/data-migration/data-migration.service.ts`

- [ ] **Step 1: Create main service**

Create `src/modules/data-migration/data-migration.service.ts` with:

- `createJob(userId, dto, file)` — Creates MigrationJob record, validates dependencies
- `analyzeJob(jobId)` — Reads file, runs AI column analysis, saves mapping
- `updateMapping(jobId, mapping)` — Updates column mapping after manual adjustment
- `getPreview(jobId)` — Returns first 20 rows transformed through mapping
- `executeJob(jobId)` — Sets status to ONAYLANDI and fires async `processJob` via `setImmediate`
- `getJobStatus(jobId)` — Returns job record
- `listJobs(query)` — Paginated job list filtered by companyId
- `rollbackJob(jobId, userId)` — Delegates to rollback service
- `getModuleConfigs()` / `getModuleConfigByCode(moduleCode)` — Returns config metadata

Key pattern for async execution:
```typescript
export async function executeJob(jobId: string): Promise<void> {
  await prisma.migrationJob.update({ where: { id: jobId }, data: { status: 'ONAYLANDI' } })
  setImmediate(() => {
    processJob(jobId).catch(err => logger.error('processJob error', { jobId, error: err }))
  })
}
```

- [ ] **Step 2: Commit**

```bash
cd actledger-backend
git add src/modules/data-migration/data-migration.service.ts
git commit -m "feat(migration): add main service with job CRUD and orchestration"
```

---

## Task 8: Controller + Router + App Registration

**Files:**
- Create: `actledger-backend/src/modules/data-migration/data-migration.controller.ts`
- Create: `actledger-backend/src/modules/data-migration/data-migration.router.ts`
- Modify: `actledger-backend/src/app.ts`

- [ ] **Step 1: Create controller**

Create `src/modules/data-migration/data-migration.controller.ts` following the standard pattern:
- Each handler: `async function(req, res, next)` with try/catch, calling service, returning via `ok()`/`created()`
- `upload` — Reads `req.file`, calls `svc.createJob`
- `analyze` — Calls `svc.analyzeJob(req.params.jobId)`
- `updateMapping` — Calls `svc.updateMapping`
- `preview` — Calls `svc.getPreview`
- `execute` — Calls `svc.executeJob`
- `status` — Calls `svc.getJobStatus`
- `errorReport` — Calls `res.download(job.errorReportPath)`
- `rollback` — Calls `svc.rollbackJob`
- `list` — Calls `svc.listJobs`
- `moduleConfigs` / `moduleConfig` — Returns config metadata

- [ ] **Step 2: Create router**

Create `src/modules/data-migration/data-migration.router.ts`:
- `router.use(authenticate)` + `router.use(authorize(ROLE_LEVELS.SUPER_ADMIN))`
- Custom multer config: accepts XLSX, CSV, JSON, SQL files up to 50MB, stores in `uploads/migration/temp/`
- Routes:

```
GET    /configs                    — ctrl.moduleConfigs
GET    /configs/:moduleCode        — ctrl.moduleConfig
GET    /jobs                       — validate(jobListQuerySchema, 'query'), ctrl.list
POST   /upload                     — uploadFile, validate(uploadSchema), auditLog, ctrl.upload
POST   /:jobId/analyze             — auditLog, ctrl.analyze
PUT    /:jobId/mapping             — validate(updateMappingSchema), ctrl.updateMapping
GET    /:jobId/preview             — ctrl.preview
POST   /:jobId/execute             — auditLog, ctrl.execute
GET    /:jobId/status              — ctrl.status
GET    /:jobId/error-report        — ctrl.errorReport
POST   /:jobId/rollback            — auditLog, ctrl.rollback
```

- [ ] **Step 3: Register route in app.ts**

Add import: `import dataMigrationRouter from './modules/data-migration/data-migration.router'`

Add route after super-admin: `app.use(\`${API}/super-admin/migration\`, dataMigrationRouter)`

- [ ] **Step 4: Commit**

```bash
cd actledger-backend
git add src/modules/data-migration/data-migration.controller.ts src/modules/data-migration/data-migration.router.ts src/app.ts
git commit -m "feat(migration): add controller, router, and register API routes"
```

---

## Task 9: Frontend — DataMigration Component

**Files:**
- Create: `actledger-frontend/src/components/super-admin/DataMigration.tsx`

- [ ] **Step 1: Create the DataMigration component**

Create `src/components/super-admin/DataMigration.tsx` — a single component with two views:

**List View (default):**
- Company selector dropdown
- "Yeni Import" button to start wizard
- Table showing all MigrationJob records for selected company
- Columns: Dosya, Modul/Tip, Durum (badge), Satirlar (success/fail/total), Tarih, Islem (download error report + rollback buttons)
- Pagination

**Wizard View** (6 steps with progress dots):

1. **select** — Company selector, module grid (5 buttons), sub-entity list with dependency warnings
2. **upload** — Format selector (EXCEL/CSV/JSON/SQL), drag-and-drop file upload area, auto-triggers AI analysis on upload
3. **mapping** — AI-generated column mapping table with dropdown overrides, warnings display
4. **preview** — First 20 rows shown in table with transformed values
5. **processing** — Spinner, progress bar, live success/fail counters (polled every 2s)
6. **result** — Success/partial/fail banner with counts, error report download button, "Tamamla" button

**UI follows Super Admin dark theme:**
- `bg-slate-950`, `border-slate-800`, `bg-slate-900/60` for cards
- `bg-cyan-600` for primary buttons, `bg-emerald-600` for execute
- Status badges with module-specific colors
- `text-[11px]` for table content, `text-[9px]` for badges

**API calls** use `saFetch` helper (same pattern as SuperAdmin.tsx) with `tokenStore.get()` for Bearer auth.

**Socket.io** is not needed on frontend for MVP — polling every 2s during processing step is simpler and sufficient.

- [ ] **Step 2: Commit**

```bash
cd actledger-frontend
git add src/components/super-admin/DataMigration.tsx
git commit -m "feat(frontend): add DataMigration component with wizard and job list"
```

---

## Task 10: Wire DataMigration into Super Admin Page

**Files:**
- Modify: `actledger-frontend/src/pages/SuperAdmin.tsx`

- [ ] **Step 1: Add import at top of SuperAdmin.tsx**

```typescript
import DataMigration from '../components/super-admin/DataMigration'
```

- [ ] **Step 2: Add 'migration' to the tab type and sidebar**

Find the tab state and add `'migration'` as a possible value. Add sidebar button:

```tsx
<button
  onClick={() => setTab('migration')}
  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors ${
    tab === 'migration'
      ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
  }`}
>
  <Database size={14} />
  Veri Tasima
</button>
```

Import `Database` from lucide-react if not already imported.

- [ ] **Step 3: Add the tab content rendering**

In the content area where tab panels are rendered:

```tsx
{tab === 'migration' && (
  <DataMigration companies={companies} />
)}
```

- [ ] **Step 4: Commit**

```bash
cd actledger-frontend
git add src/pages/SuperAdmin.tsx
git commit -m "feat(frontend): add Veri Tasima tab to Super Admin panel"
```

---

## Task 11: Install xlsx dependency (if not already present)

**Files:**
- Modify: `actledger-backend/package.json`

- [ ] **Step 1: Check and install xlsx**

Run: `cd actledger-backend && npm ls xlsx 2>/dev/null || npm install xlsx`
Expected: xlsx package available for Excel file parsing in the backend processor.

- [ ] **Step 2: Commit if package.json changed**

```bash
cd actledger-backend
git add package.json package-lock.json
git commit -m "chore: add xlsx dependency for migration file parsing"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Build backend to check for TypeScript errors**

Run: `cd actledger-backend && npx tsc --noEmit`
Expected: No compilation errors.

- [ ] **Step 2: Build frontend to check for TypeScript errors**

Run: `cd actledger-frontend && npx tsc --noEmit`
Expected: No compilation errors.

- [ ] **Step 3: Run Prisma generate to verify schema**

Run: `cd actledger-backend && npx prisma generate`
Expected: Prisma client generated successfully.

- [ ] **Step 4: Verify route is registered**

Run: `cd actledger-backend && npx ts-node -e "import('./src/app').then(m => console.log('app loaded'))"`
Expected: No import errors.

- [ ] **Step 5: Fix any build issues and commit**

If there are TypeScript errors, fix them and commit:
```bash
git add -A && git commit -m "fix: resolve build issues from data migration module"
```
