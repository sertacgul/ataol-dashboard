import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../contexts/LanguageContext'

const sections = [
  { id: 'baslangic', label: 'Baslangic' },
  { id: 'lead-yonetimi', label: 'Lead Yonetimi' },
  { id: 'outreach', label: 'Outreach' },
  { id: 'icerik-uretimi', label: 'Icerik Uretimi' },
  { id: 'crm-pipeline', label: 'CRM Pipeline' },
  { id: 'analitik', label: 'Analitik ve Strateji' },
  { id: 'takvim', label: 'Sablonlar ve Takvim' },
  { id: 'ayarlar', label: 'Ayarlar' },
  { id: 'email-bulucu', label: 'Email Bulucu' },
]

function Tip({ children }) {
  return (
    <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-md p-3 mt-3 text-xs text-[#1E40AF] leading-relaxed">
      <span className="font-semibold">Ipucu:</span> {children}
    </div>
  )
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-10 scroll-mt-6">
      <h2 className="text-sm font-semibold text-[#111827] mb-3 pb-2 border-b border-[#E5E7EB]">{title}</h2>
      <div className="text-xs text-[#374151] leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  )
}

function Steps({ items }) {
  return (
    <ol className="list-decimal list-inside space-y-1.5 pl-2">
      {items.map((item, i) => (
        <li key={i} className="text-xs text-[#374151] leading-relaxed">{item}</li>
      ))}
    </ol>
  )
}

function Bullets({ items }) {
  return (
    <ul className="list-disc list-inside space-y-1.5 pl-2">
      {items.map((item, i) => (
        <li key={i} className="text-xs text-[#374151] leading-relaxed">{item}</li>
      ))}
    </ul>
  )
}

export default function Guide() {
  const { t } = useT()
  const [active, setActive] = useState('')

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      setActive(hash)
      const el = document.getElementById(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    sections.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex gap-6">
      {/* Left nav */}
      <nav className="w-44 flex-shrink-0">
        <div className="sticky top-6">
          <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2 px-2">{t('Kilavuz')}</div>
          <div className="space-y-0.5">
            {sections.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActive(s.id)}
                className={`block text-xs px-2 py-1.5 rounded-md transition-colors ${
                  active === s.id
                    ? 'bg-[#EFF6FF] text-[#2563EB] font-medium'
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]'
                }`}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h1 className="text-base font-semibold text-[#111827]">{t('AskDesk Kılavuzu')}</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">{t('Platformu etkili kullanmak için adım adım rehber.')}</p>
        </div>

        <Section id="baslangic" title="Baslangic">
          <p>AskDesk, satis, outreach ve icerik uretim sureclerini tek platformda yonetmenizi saglar. Ilk giris yaptiginizda Onboarding ekrani sizi yonlendirecektir.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Hesap Olusturma ve Giris</div>
            <Steps items={[
              'askdesk.app adresine gidin ve "Kayit Ol" butonuna tiklayin.',
              'Adinizi, email adresinizi ve sifrenizi girin.',
              'Kayit sonrasi otomatik olarak Dashboard\'a yonlendirilirsiniz.',
              'Tekrar giris icin Login sayfasini kullanin.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Firma Profili Ayarlama</div>
            <p>Profil bilgileriniz OperIQ analizlerinde ve email sablonlarinda kullanilir.</p>
            <Steps items={[
              'Sol menuden "Ayarlar" sayfasina gidin.',
              'Firma adi, sektör, web sitesi ve iletisim bilgilerinizi doldurun.',
              'Kaydet butonuna basin.',
            ]} />
            <Tip>Sektör bilgisini dogru girmek OperIQ analizlerinin kalitesini arttirir.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Email ve Blog Ayarlari</div>
            <Steps items={[
              'Ayarlar sayfasinda "Email Ayarlari" bolumune gidin.',
              'SMTP sunucu bilgilerinizi (host, port, kullanici adi, sifre) girin.',
              'Test emaili gondererek baglantıyi dogrulayin.',
              'Blog ayarlari icin WordPress API URL ve kimlik bilgilerini girin.',
            ]} />
          </div>
        </Section>

        <Section id="lead-yonetimi" title="Lead Yonetimi">
          <p>Lead Yonetimi modulu potansiyel musterilerinizi (firmalari ve kisilerini) organize etmenizi saglar. Her lead icin detayli bilgi, notlar ve iliskilendirilmis emailler tutabilirsiniz.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Manuel Lead Ekleme</div>
            <Steps items={[
              '"Leads" sayfasina gidin.',
              '"Yeni Lead" butonuna tiklayin.',
              'Firma adi, web sitesi, sektör ve ulke bilgilerini girin.',
              'Iletisim kisi bilgilerini ekleyin (opsiyonel).',
              '"Kaydet" butonuna basin.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Google Maps\'ten Firma Bulma</div>
            <p>Maps modulu ile belirli bir sektör ve lokasyondaki firmalari arayip dogrudan lead olarak ekleyebilirsiniz.</p>
            <Steps items={[
              '"Maps" sayfasina gidin.',
              'Arama kutusu, sektör ve sehir bilgilerini girin.',
              '"Ara" butonuna basin.',
              'Sonuclardan istediginiz firmalar icin "Lead Olarak Ekle" butonuna basin.',
            ]} />
            <Tip>Maps aramasinda "restoran istanbul" yerine "yazilim gelistirme ankara" gibi sektör odakli aramalar daha iyi sonuc verir.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Email Bulucu Kullanimi</div>
            <p>Email Bulucu, bir firma domaininden potansiyel email adreslerini otomatik olarak uretir.</p>
            <Bullets items={[
              'Sol menuden "Email Bulucu" sayfasina gidin.',
              'Firma sec ya da domain gir.',
              'Kisi adi ve unvan girin.',
              '"OperIQ ile Ara" butonuna basin.',
              'Sonuclari kopyalayin veya "Kisiyi Kaydet" ile ilgili firmaya baglayın.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Lead Detay ve Duzenleme</div>
            <Steps items={[
              'Leads listesinde bir firma adinina tiklayin.',
              'Detay sayfasinda firma bilgilerini, kisilerini ve email gecmisini gorun.',
              '"Duzenle" butonu ile bilgileri guncelleyin.',
            ]} />
          </div>
        </Section>

        <Section id="outreach" title="Outreach">
          <p>Outreach modulu, lead\'lerinize kisisellestirilmis email gondermek ve acilma oranlarini takip etmek icin kullanilir. OperIQ yapay zeka destegi ile saniyeler icinde profesyonel emailler olusturabilirsiniz.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">OperIQ ile Email Olusturma</div>
            <Steps items={[
              '"Outreach" sayfasinda "Yeni Email" butonuna tiklayin.',
              'Firma secin.',
              '"OperIQ ile Yaz" butonuna basin.',
              'AI, firma bilgilerine gore kisisellestirilmis bir email taslagi olusturur.',
              'Taslagi duzenleyip begendiginizde kaydedin.',
            ]} />
            <Tip>Firma web sitesini lead kaydina eklerseniz OperIQ daha alakali bir email olusturur.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Email Onaylama ve Gonderme</div>
            <Steps items={[
              'Email taslagini inceleyin ve gerekli degisiklikleri yapin.',
              'Alici email adresini kontrol edin.',
              '"Gonder" butonuna basin.',
              'Email durum "Gonderildi" olarak guncellenir.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Acilma Takibi</div>
            <p>AskDesk, gonderdginiz emaillerin acilip acilmadigini otomatik olarak takip eder.</p>
            <Bullets items={[
              'Acilan emailler listede "Acildi" rozeti ile gorunur.',
              'Dashboard\'da genel acilma orani istatistigi gorebilirsiniz.',
              'Analytics sayfasinda detayli raporlar mevcuttur.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Sablondan Email Olusturma</div>
            <Steps items={[
              '"Sablonlar" sayfasindan bir sablon secin.',
              'Sablon detay sayfasinda "Bu Sablonu Kullan" butonuna basin.',
              'Ilgili kisi/firmaya ata ve gor.',
            ]} />
          </div>
        </Section>

        <Section id="icerik-uretimi" title="Icerik Uretimi">
          <p>AskDesk'in icerik uretim modulleri ile SEO makaleleri, sosyal medya icerikleri, newsletter ve posterler olusturabilirsiniz. Tum icerikler OperIQ destegi ile uretilir.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">SEO Makale Yazimi (6 Adim)</div>
            <Steps items={[
              '"SEO Icerik" sayfasina gidin ve "Yeni Makale" butonuna basin.',
              'Anahtar kelime ve konu basligi girin.',
              'Hedef kitle ve ton secin.',
              '"OperIQ ile Yaz" butonuna basin.',
              'Olusturulan makaleyi gozden gecirin ve duzenleyin.',
              '"Kaydet" ile taslagi koruyun.',
            ]} />
            <Tip>Uzun kuyruklu anahtar kelimeler (ornek: "istanbul yazilim sirketleri icin CRM") daha hedefli icerik uretir.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Blog\'a Yayinlama</div>
            <Steps items={[
              'SEO makale detay sayfasina gidin.',
              '"Blog\'a Yayinla" butonuna basin.',
              'WordPress baglantiniz varsa makale otomatik olarak yayinlanir.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Sosyal Medya Icerigi (4 Platform)</div>
            <p>LinkedIn, Twitter/X, Instagram ve Facebook icin optimize edilmis icerikler olusturun.</p>
            <Steps items={[
              '"Sosyal Medya" sayfasina gidin.',
              '"Yeni Icerik" butonuna basin.',
              'Konu ve platform secin.',
              '"OperIQ ile Olustur" butonuna basin.',
              'Sonucu kopyalayip ilgili platforma yapistirin.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Newsletter ve Poster</div>
            <Bullets items={[
              '"Newsletter" sayfasinda abone listenize yonelik email kampanyalari olusturun.',
              'Konu girisinin ardindan OperIQ tam bir newsletter taslagi olusturur.',
              'Poster icerikleri gorsel sosyal medya paylasimlariniz icin kısa ve etkili metinler uretir.',
            ]} />
          </div>
        </Section>

        <Section id="crm-pipeline" title="CRM Pipeline">
          <p>Pipeline modulu, satislarifinizi asama asama takip etmenizi saglar. Kanban gorunumu ile bir bakista tum satislarin nerede oldugunu gorursunuz.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Kanban Kullanimi</div>
            <Steps items={[
              '"Pipeline" sayfasina gidin.',
              'Her sutun bir satis asamasini temsil eder.',
              'Kartlar uzerinde firma adi, deger ve son aktivite gorunur.',
              'Kart basligina tikladiginizda detay acilir.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Lead Asamalari</div>
            <Bullets items={[
              'Asamalar: Kesfedildi, Iletisime Gecildi, Ilgileniliyor, Teklif Verildi, Kazanildi, Kaybedildi.',
              'Her asamaya lead atayabilir, notlar ekleyebilirsiniz.',
              'Sutun basligindaki sayi o asama\'daki toplam lead sayisini gosterir.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Surukle-Birak</div>
            <Steps items={[
              'Bir karti tutun ve baska bir sutuna surukleyin.',
              'Biraktiginizda kart o asama\'ya gecer ve kayit otomatik guncellenir.',
            ]} />
            <Tip>Pipeline'da bir lead\'i kazanildi olarak isaretle ettiginizde Analytics sayfasindaki donusum oranlari guncellenir.</Tip>
          </div>
        </Section>

        <Section id="analitik" title="Analitik ve Strateji">
          <p>Analytics, Finansal Simulatör, Is Modeli Kanvasi ve Rakip Analizi modulleri ile stratejik kararlari verilere dayali alabilirsiniz.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Analytics Dashboard</div>
            <Bullets items={[
              'Outreach performansi: gonderilen, acilan, yanitlanan email sayilari.',
              'Lead kaynak dagilimi ve sektor grafikleri.',
              'Pipeline donusum orani zaman serisi grafigi.',
              'Son 30 gun aktivite ozeti.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Finansal Simulasyon</div>
            <p>3 senaryo (Iyimser, Gercekci, Kotumser) ile yillik gelir, gider ve net kar projeksiyonu yapabilirsiniz.</p>
            <Steps items={[
              '"Simulatör" sayfasina gidin.',
              'Senaryo tablarindan birini secin.',
              'Gelir ve maliyet sürücülerini doldurun.',
              '12 aylik tablo otomatik hesaplanir.',
              '"OperIQ Sektör Analizi" ile benchmarklarinizi ogrenin.',
              '"Rapor Indir" ile tarayici print diyalogunu acin.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Is Modeli Kanvasi (BMC)</div>
            <Steps items={[
              '"BMC" sayfasina gidin.',
              'Dokuz bloku doldurun (Musteriler, Deger Onerisi, Gelir Akislari vb.).',
              '"OperIQ ile Analiz Et" butonu eksik ya da zayif bloklari isaret eder.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Rakip Analizi</div>
            <Steps items={[
              '"Rakip Analizi" sayfasina gidin.',
              'Rakip firma adi ve web sitesi girin.',
              'OperIQ, SWOT ve konumlandirma analizi uretir.',
            ]} />
          </div>
        </Section>

        <Section id="takvim" title="Sablonlar ve Takvim">
          <div>
            <div className="font-medium text-[#111827] mb-1.5">Sablon Olusturma ve Kullanma</div>
            <p>Tekrar kullanimlik email ve icerik sablonlari olusturarak zamandan tasarruf edin.</p>
            <Steps items={[
              '"Sablonlar" sayfasina gidin.',
              '"Yeni Sablon" butonuna basin.',
              'Sablon adi, kategori ve icerigini girin.',
              'Icerik icinde {firma_adi} gibi degisken alanlar kullanabilirsiniz.',
              '"Kaydet" ile saklayın.',
            ]} />
            <Tip>Sablonlari email olusturma ekranindaki "Sablondan Sec" secenegi ile dogrudan kullanabilirsiniz.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Icerik Takvimi Planlama</div>
            <Steps items={[
              '"Takvim" sayfasina gidin.',
              'Bir gune tiklayin ve etkinlik olusturun.',
              'Etkinlik turunu secin: Email, SEO Makale, Sosyal Medya veya Newsletter.',
              'Planlanan etkinlikler takvimde farkli renklerle gosterilir.',
              'Hatirlatici ozelligi ile planlarinizi takip edin.',
            ]} />
          </div>
        </Section>

        <Section id="ayarlar" title="Ayarlar">
          <div>
            <div className="font-medium text-[#111827] mb-1.5">Firma Profili Duzenleme</div>
            <Steps items={[
              '"Ayarlar" sayfasina gidin.',
              'Firma adi, sektör, web sitesi, ulke ve aciklama alanlarini guncelleyin.',
              '"Profili Kaydet" butonuna basin.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Email (SMTP) Ayarlari</div>
            <p>AskDesk uzerinden email gondermek icin SMTP bilgilerinizi girmeniz gerekir.</p>
            <Steps items={[
              '"Email Ayarlari" bolumune gidin.',
              'SMTP Host (ornek: smtp.gmail.com), Port (587 veya 465), Kullanici Adi ve Sifre girin.',
              '"Baglantıyı Test Et" ile dogrulayin.',
              '"Kaydet" butonuna basin.',
            ]} />
            <Tip>Gmail kullaniyorsaniz "Uygulama Sifresi" olusturmaniz gerekir. Google Hesap guvenlik ayarlarindan 2FA aktif ederek uygulama sifresi alabilirsiniz.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Blog Ayarlari</div>
            <Steps items={[
              '"Blog Ayarlari" bolumune gidin.',
              'WordPress site URL\'inizi girin (ornek: https://siteadı.com).',
              'WordPress kullanici adi ve uygulama sifresini girin.',
              '"Kaydet" butonuna basin.',
              'SEO makaleleri artık dogrudan blog\'unuza yayinlanabilir.',
            ]} />
          </div>
        </Section>

        <Section id="email-bulucu" title="Email Bulucu">
          <p>Email Bulucu modulu, bir firma domaininden olasi email adreslerini algoritmik olarak uretir ve OperIQ ile web sitesini analiz ederek herkese acik emailler bulur.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Nasil Calisir?</div>
            <Bullets items={[
              'Domain + kisi adi kombinasyonundan 7 farkli email paterni uretilir.',
              'OperIQ domain\'i analiz ederek kamuya acik email adreslerini tespit eder.',
              'Bulunan kisiler (isim, unvan) listelenir.',
              'Olusturulan email adresleri bir tikla kopyalanir.',
              'Begendilerinizi "Kisiyi Kaydet" ile CRM\'e ekleyin.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Adim Adim Kullanim</div>
            <Steps items={[
              '"Email Bulucu" sayfasina gidin.',
              '"Firma Ara" alanina firma adi yazmaya baslayin ve ac&#305;lan listeden secin.',
              'Domain otomatik dolar; yoksa "Domain" alanina elle girin.',
              'Opsiyonel olarak kisi adi ve unvani girin.',
              '"OperIQ ile Ara" butonuna basin.',
              'Tahmin edilen email listesinden uygun olanları kopyalayin.',
              'Gercek kisileri "Kisiyi Kaydet" ile CRM\'e ekleyin.',
            ]} />
            <Tip>Bulunan emailler dogrulanmamistir. Gonderim oncesinde bounce oranini dusuk tutmak icin dogrulama servisi kullanmaniz onerilir.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">CSV Export</div>
            <Steps items={[
              'Arama sonuclarinin altinda "CSV Olarak Indir" butonuna basin.',
              'Ya da gecmis aramalar tablosunun ustundeki "Tumunu Indir" linkine basin.',
              'Indirilen dosyada domain, kisi adi, unvan ve tum email adresleri yer alir.',
            ]} />
          </div>
        </Section>

        <div className="pt-4 border-t border-[#E5E7EB] text-center">
          <p className="text-xs text-[#9CA3AF]">
            Daha fazla yardim icin{' '}
            <a href="mailto:destek@askdesk.app" className="text-[#2563EB] hover:underline">destek@askdesk.app</a>
            {' '}adresine yazabilirsiniz.
          </p>
        </div>
      </div>
    </div>
  )
}
