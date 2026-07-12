import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../contexts/LanguageContext'

const sections = [
  { id: 'baslangic', label: 'Başlangıç' },
  { id: 'lead-yonetimi', label: 'Lead Yönetimi' },
  { id: 'outreach', label: 'Outreach' },
  { id: 'icerik-uretimi', label: 'İçerik Üretimi' },
  { id: 'crm-pipeline', label: 'CRM Pipeline' },
  { id: 'analitik', label: 'Analitik ve Strateji' },
  { id: 'takvim', label: 'Şablonlar ve Takvim' },
  { id: 'ayarlar', label: 'Ayarlar' },
  { id: 'email-bulucu', label: 'Email Bulucu' },
]

function Tip({ children }) {
  return (
    <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-md p-3 mt-3 text-xs text-[#1E40AF] leading-relaxed">
      <span className="font-semibold">İpucu:</span> {children}
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
          <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2 px-2">{t('Kılavuz')}</div>
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
                {t(s.label)}
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

        <Section id="baslangic" title="Başlangıç">
          <p>AskDesk, satış, outreach ve içerik üretim süreçlerini tek platformda yönetmenizi sağlar. İlk giriş yaptığınızda Onboarding ekranı sizi yönlendirecektir.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Hesap Oluşturma ve Giriş</div>
            <Steps items={[
              'askdesk.app adresine gidin ve "Kayıt Ol" butonuna tıklayın.',
              'Adınızı, email adresinizi ve şifrenizi girin.',
              'Kayıt sonrası otomatik olarak Dashboard\'a yönlendirilirsiniz.',
              'Tekrar giriş için Login sayfasını kullanın.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Firma Profili Ayarlama</div>
            <p>Profil bilgileriniz OperIQ analizlerinde ve email şablonlarında kullanılır.</p>
            <Steps items={[
              'Sol menüden "Ayarlar" sayfasına gidin.',
              'Firma adı, sektör, web sitesi ve iletişim bilgilerinizi doldurun.',
              'Kaydet butonuna basın.',
            ]} />
            <Tip>Sektör bilgisini doğru girmek OperIQ analizlerinin kalitesini artırır.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Email ve Blog Ayarları</div>
            <Steps items={[
              'Ayarlar sayfasında "Email Ayarları" bölümüne gidin.',
              'SMTP sunucu bilgilerinizi (host, port, kullanıcı adı, şifre) girin.',
              'Test emaili göndererek bağlantıyı doğrulayın.',
              'Blog ayarları için WordPress API URL ve kimlik bilgilerini girin.',
            ]} />
          </div>
        </Section>

        <Section id="lead-yonetimi" title="Lead Yönetimi">
          <p>Lead Yönetimi modülü potansiyel müşterilerinizi (firmaları ve kişilerini) organize etmenizi sağlar. Her lead için detaylı bilgi, notlar ve ilişkilendirilmiş emailler tutabilirsiniz.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Manuel Lead Ekleme</div>
            <Steps items={[
              '"Leads" sayfasına gidin.',
              '"Yeni Lead" butonuna tıklayın.',
              'Firma adı, web sitesi, sektör ve ülke bilgilerini girin.',
              'İletişim kişi bilgilerini ekleyin (opsiyonel).',
              '"Kaydet" butonuna basın.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Google Maps\'ten Firma Bulma</div>
            <p>Maps modülü ile belirli bir sektör ve lokasyondaki firmaları arayıp doğrudan lead olarak ekleyebilirsiniz.</p>
            <Steps items={[
              '"Maps" sayfasına gidin.',
              'Arama kutusu, sektör ve şehir bilgilerini girin.',
              '"Ara" butonuna basın.',
              'Sonuçlardan istediğiniz firmalar için "Lead Olarak Ekle" butonuna basın.',
            ]} />
            <Tip>Maps aramasında "restoran istanbul" yerine "yazılım geliştirme ankara" gibi sektör odaklı aramalar daha iyi sonuç verir.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Email Bulucu Kullanımı</div>
            <p>Email Bulucu, bir firma domaininden potansiyel email adreslerini otomatik olarak üretir.</p>
            <Bullets items={[
              'Sol menüden "Email Bulucu" sayfasına gidin.',
              'Firma seç ya da domain gir.',
              'Kişi adı ve unvan girin.',
              '"OperIQ ile Ara" butonuna basın.',
              'Sonuçları kopyalayın veya "Kişiyi Kaydet" ile ilgili firmaya bağlayın.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Lead Detay ve Düzenleme</div>
            <Steps items={[
              'Leads listesinde bir firma adına tıklayın.',
              'Detay sayfasında firma bilgilerini, kişilerini ve email geçmişini görün.',
              '"Düzenle" butonu ile bilgileri güncelleyin.',
            ]} />
          </div>
        </Section>

        <Section id="outreach" title="Outreach">
          <p>Outreach modülü, lead\'lerinize kişiselleştirilmiş email göndermek ve açılma oranlarını takip etmek için kullanılır. OperIQ yapay zeka desteği ile saniyeler içinde profesyonel emailler oluşturabilirsiniz.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">OperIQ ile Email Oluşturma</div>
            <Steps items={[
              '"Outreach" sayfasında "Yeni Email" butonuna tıklayın.',
              'Firma seçin.',
              '"OperIQ ile Yaz" butonuna basın.',
              'AI, firma bilgilerine göre kişiselleştirilmiş bir email taslağı oluşturur.',
              'Taslağı düzenleyip beğendiğinizde kaydedin.',
            ]} />
            <Tip>Firma web sitesini lead kaydına eklerseniz OperIQ daha alakalı bir email oluşturur.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Email Onaylama ve Gönderme</div>
            <Steps items={[
              'Email taslağını inceleyin ve gerekli değişiklikleri yapın.',
              'Alıcı email adresini kontrol edin.',
              '"Gönder" butonuna basın.',
              'Email durumu "Gönderildi" olarak güncellenir.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Açılma Takibi</div>
            <p>AskDesk, gönderdiğiniz emaillerin açılıp açılmadığını otomatik olarak takip eder.</p>
            <Bullets items={[
              'Açılan emailler listede "Açıldı" rozeti ile görünür.',
              'Dashboard\'da genel açılma oranı istatistiği görebilirsiniz.',
              'Analytics sayfasında detaylı raporlar mevcuttur.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Şablondan Email Oluşturma</div>
            <Steps items={[
              '"Şablonlar" sayfasından bir şablon seçin.',
              'Şablon detay sayfasında "Bu Şablonu Kullan" butonuna basın.',
              'İlgili kişi/firmaya atayın ve görüntüleyin.',
            ]} />
          </div>
        </Section>

        <Section id="icerik-uretimi" title="İçerik Üretimi">
          <p>AskDesk'in içerik üretim modülleri ile SEO makaleleri, sosyal medya içerikleri, newsletter ve posterler oluşturabilirsiniz. Tüm içerikler OperIQ desteği ile üretilir.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">SEO Makale Yazımı (6 Adım)</div>
            <Steps items={[
              '"SEO İçerik" sayfasına gidin ve "Yeni Makale" butonuna basın.',
              'Anahtar kelime ve konu başlığı girin.',
              'Hedef kitle ve ton seçin.',
              '"OperIQ ile Yaz" butonuna basın.',
              'Oluşturulan makaleyi gözden geçirin ve düzenleyin.',
              '"Kaydet" ile taslağı koruyun.',
            ]} />
            <Tip>Uzun kuyruklu anahtar kelimeler (örnek: "istanbul yazılım şirketleri için CRM") daha hedefli içerik üretir.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Blog\'a Yayınlama</div>
            <Steps items={[
              'SEO makale detay sayfasına gidin.',
              '"Blog\'a Yayınla" butonuna basın.',
              'WordPress bağlantınız varsa makale otomatik olarak yayınlanır.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Sosyal Medya İçeriği (4 Platform)</div>
            <p>LinkedIn, Twitter/X, Instagram ve Facebook için optimize edilmiş içerikler oluşturun.</p>
            <Steps items={[
              '"Sosyal Medya" sayfasına gidin.',
              '"Yeni İçerik" butonuna basın.',
              'Konu ve platform seçin.',
              '"OperIQ ile Oluştur" butonuna basın.',
              'Sonucu kopyalayıp ilgili platforma yapıştırın.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Newsletter ve Poster</div>
            <Bullets items={[
              '"Newsletter" sayfasında abone listenize yönelik email kampanyaları oluşturun.',
              'Konu girişinin ardından OperIQ tam bir newsletter taslağı oluşturur.',
              'Poster içerikleri görsel sosyal medya paylaşımlarınız için kısa ve etkili metinler üretir.',
            ]} />
          </div>
        </Section>

        <Section id="crm-pipeline" title="CRM Pipeline">
          <p>Pipeline modülü, satışlarınızı aşama aşama takip etmenizi sağlar. Kanban görünümü ile bir bakışta tüm satışların nerede olduğunu görürsünüz.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Kanban Kullanımı</div>
            <Steps items={[
              '"Pipeline" sayfasına gidin.',
              'Her sütun bir satış aşamasını temsil eder.',
              'Kartlar üzerinde firma adı, değer ve son aktivite görünür.',
              'Kart başlığına tıkladığınızda detay açılır.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Lead Aşamaları</div>
            <Bullets items={[
              'Aşamalar: Keşfedildi, İletişime Geçildi, İlgileniliyor, Teklif Verildi, Kazanıldı, Kaybedildi.',
              'Her aşamaya lead atayabilir, notlar ekleyebilirsiniz.',
              'Sütun başlığındaki sayı o aşamadaki toplam lead sayısını gösterir.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Sürükle-Bırak</div>
            <Steps items={[
              'Bir kartı tutun ve başka bir sütuna sürükleyin.',
              'Bıraktığınızda kart o aşamaya geçer ve kayıt otomatik güncellenir.',
            ]} />
            <Tip>Pipeline'da bir lead\'i kazanıldı olarak işaretlediğinizde Analytics sayfasındaki dönüşüm oranları güncellenir.</Tip>
          </div>
        </Section>

        <Section id="analitik" title="Analitik ve Strateji">
          <p>Analytics, Finansal Simülatör, İş Modeli Kanvası ve Rakip Analizi modülleri ile stratejik kararları verilere dayalı alabilirsiniz.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Analytics Dashboard</div>
            <Bullets items={[
              'Outreach performansı: gönderilen, açılan, yanıtlanan email sayıları.',
              'Lead kaynak dağılımı ve sektör grafikleri.',
              'Pipeline dönüşüm oranı zaman serisi grafiği.',
              'Son 30 gün aktivite özeti.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Finansal Simülasyon</div>
            <p>3 senaryo (İyimser, Gerçekçi, Kötümser) ile yıllık gelir, gider ve net kar projeksiyonu yapabilirsiniz.</p>
            <Steps items={[
              '"Simülatör" sayfasına gidin.',
              'Senaryo tablarından birini seçin.',
              'Gelir ve maliyet sürücülerini doldurun.',
              '12 aylık tablo otomatik hesaplanır.',
              '"OperIQ Sektör Analizi" ile benchmarklarınızı öğrenin.',
              '"Rapor İndir" ile tarayıcı print diyalogunu açın.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">İş Modeli Kanvası (BMC)</div>
            <Steps items={[
              '"BMC" sayfasına gidin.',
              'Dokuz bloğu doldurun (Müşteriler, Değer Önerisi, Gelir Akışları vb.).',
              '"OperIQ ile Analiz Et" butonu eksik ya da zayıf blokları işaret eder.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Rakip Analizi</div>
            <Steps items={[
              '"Rakip Analizi" sayfasına gidin.',
              'Rakip firma adı ve web sitesi girin.',
              'OperIQ, SWOT ve konumlandırma analizi üretir.',
            ]} />
          </div>
        </Section>

        <Section id="takvim" title="Şablonlar ve Takvim">
          <div>
            <div className="font-medium text-[#111827] mb-1.5">Şablon Oluşturma ve Kullanma</div>
            <p>Tekrar kullanımlık email ve içerik şablonları oluşturarak zamandan tasarruf edin.</p>
            <Steps items={[
              '"Şablonlar" sayfasına gidin.',
              '"Yeni Şablon" butonuna basın.',
              'Şablon adı, kategori ve içeriğini girin.',
              'İçerik içinde {firma_adi} gibi değişken alanlar kullanabilirsiniz.',
              '"Kaydet" ile saklayın.',
            ]} />
            <Tip>Şablonları email oluşturma ekranındaki "Şablondan Seç" seçeneği ile doğrudan kullanabilirsiniz.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">İçerik Takvimi Planlama</div>
            <Steps items={[
              '"Takvim" sayfasına gidin.',
              'Bir güne tıklayın ve etkinlik oluşturun.',
              'Etkinlik türünü seçin: Email, SEO Makale, Sosyal Medya veya Newsletter.',
              'Planlanan etkinlikler takvimde farklı renklerle gösterilir.',
              'Hatırlatıcı özelliği ile planlarınızı takip edin.',
            ]} />
          </div>
        </Section>

        <Section id="ayarlar" title="Ayarlar">
          <div>
            <div className="font-medium text-[#111827] mb-1.5">Firma Profili Düzenleme</div>
            <Steps items={[
              '"Ayarlar" sayfasına gidin.',
              'Firma adı, sektör, web sitesi, ülke ve açıklama alanlarını güncelleyin.',
              '"Profili Kaydet" butonuna basın.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Email (SMTP) Ayarları</div>
            <p>AskDesk üzerinden email göndermek için SMTP bilgilerinizi girmeniz gerekir.</p>
            <Steps items={[
              '"Email Ayarları" bölümüne gidin.',
              'SMTP Host (örnek: smtp.gmail.com), Port (587 veya 465), Kullanıcı Adı ve Şifre girin.',
              '"Bağlantıyı Test Et" ile doğrulayın.',
              '"Kaydet" butonuna basın.',
            ]} />
            <Tip>Gmail kullanıyorsanız "Uygulama Şifresi" oluşturmanız gerekir. Google Hesap güvenlik ayarlarından 2FA aktif ederek uygulama şifresi alabilirsiniz.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Blog Ayarları</div>
            <Steps items={[
              '"Blog Ayarları" bölümüne gidin.',
              'WordPress site URL\'inizi girin (örnek: https://siteadi.com).',
              'WordPress kullanıcı adı ve uygulama şifresini girin.',
              '"Kaydet" butonuna basın.',
              'SEO makaleleri artık doğrudan blog\'unuza yayınlanabilir.',
            ]} />
          </div>
        </Section>

        <Section id="email-bulucu" title="Email Bulucu">
          <p>Email Bulucu modülü, bir firma domaininden olası email adreslerini algoritmik olarak üretir ve OperIQ ile web sitesini analiz ederek herkese açık emailler bulur.</p>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Nasıl Çalışır?</div>
            <Bullets items={[
              'Domain + kişi adı kombinasyonundan 7 farklı email paterni üretilir.',
              'OperIQ domain\'i analiz ederek kamuya açık email adreslerini tespit eder.',
              'Bulunan kişiler (isim, unvan) listelenir.',
              'Oluşturulan email adresleri bir tıkla kopyalanır.',
              'Beğendiklerinizi "Kişiyi Kaydet" ile CRM\'e ekleyin.',
            ]} />
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">Adım Adım Kullanım</div>
            <Steps items={[
              '"Email Bulucu" sayfasına gidin.',
              '"Firma Ara" alanına firma adı yazmaya başlayın ve açılan listeden seçin.',
              'Domain otomatik dolar; yoksa "Domain" alanına elle girin.',
              'Opsiyonel olarak kişi adı ve unvanı girin.',
              '"OperIQ ile Ara" butonuna basın.',
              'Tahmin edilen email listesinden uygun olanları kopyalayın.',
              'Gerçek kişileri "Kişiyi Kaydet" ile CRM\'e ekleyin.',
            ]} />
            <Tip>Bulunan emailler doğrulanmamıştır. Gönderim öncesinde bounce oranını düşük tutmak için doğrulama servisi kullanmanız önerilir.</Tip>
          </div>

          <div>
            <div className="font-medium text-[#111827] mb-1.5">CSV Export</div>
            <Steps items={[
              'Arama sonuçlarının altında "CSV Olarak İndir" butonuna basın.',
              'Ya da geçmiş aramalar tablosunun üstündeki "Tümünü İndir" linkine basın.',
              'İndirilen dosyada domain, kişi adı, unvan ve tüm email adresleri yer alır.',
            ]} />
          </div>
        </Section>

        <div className="pt-4 border-t border-[#E5E7EB] text-center">
          <p className="text-xs text-[#9CA3AF]">
            Daha fazla yardım için{' '}
            <a href="mailto:destek@askdesk.app" className="text-[#2563EB] hover:underline">destek@askdesk.app</a>
            {' '}adresine yazabilirsiniz.
          </p>
        </div>
      </div>
    </div>
  )
}
