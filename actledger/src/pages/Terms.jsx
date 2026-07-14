import { Link } from 'react-router-dom'
import { useT } from '../contexts/LanguageContext'

export default function Terms() {
  const { lang } = useT()
  const isEn = lang === 'en'

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <img src="/assets/logo.svg" alt="AskDesk" className="w-8 h-8" />
          <span className="text-xl font-semibold tracking-tight text-[#111827]">AskDesk</span>
        </Link>

        <div className="bg-white border border-[#E5E7EB] rounded-md p-8">
          <h1 className="text-2xl font-semibold text-[#111827] mb-2">
            {isEn ? 'Terms of Use' : 'Kullanım Koşulları'}
          </h1>
          <p className="text-xs text-[#9CA3AF] mb-8">
            {isEn ? 'Last updated: July 2026' : 'Son güncelleme: Temmuz 2026'}
          </p>

          {isEn ? <TermsEn /> : <TermsTr />}
        </div>

        <p className="text-xs text-[#9CA3AF] text-center mt-6">ATAOL AI Techs · askdesk.app</p>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-[#111827] mb-2">{title}</h2>
      <div className="text-sm text-[#4B5563] leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

function TermsTr() {
  return (
    <>
      <Section title="1. Taraflar ve Kapsam">
        <p>AskDesk ("Hizmet"), ATAOL AI Techs ("Şirket") tarafından işletilen bir yazılım hizmetidir. Bu Kullanım Koşulları, Hizmet'e kayıt olan veya Hizmet'i kullanan gerçek ve tüzel kişiler ("Kullanıcı") ile Şirket arasındaki ilişkiyi düzenler. Kayıt olarak bu koşulları kabul etmiş sayılırsınız.</p>
      </Section>
      <Section title="2. Hizmetin Tanımı">
        <p>AskDesk; potansiyel müşteri (lead) bulma, iş email adresi tahmini ve doğrulama, yapay zeka destekli email içeriği üretimi, pipeline ve içerik yönetimi gibi araçlar sunar. AskDesk e-posta göndermez; oluşturulan içerik Kullanıcı tarafından kendi e-posta aracıyla gönderilir.</p>
      </Section>
      <Section title="3. Hesap ve Güvenlik">
        <p>Kullanıcı, kayıt sırasında doğru ve güncel bilgi vermekle yükümlüdür. Hesap güvenliğinden ve hesabı üzerinden yapılan tüm işlemlerden Kullanıcı sorumludur. Kurumsal e-posta adresi gereklidir.</p>
      </Section>
      <Section title="4. Deneme Süresi ve Ödeme">
        <p>Yeni hesaplara 7 günlük ücretsiz deneme süresi tanınır. Ücretli planlar ve kredi paketleri, ilgili ödeme sağlayıcısı üzerinden faturalandırılır. Fiyatlar önceden bildirilmeksizin değiştirilebilir; mevcut dönem için geçerli fiyat korunur.</p>
      </Section>
      <Section title="5. Kabul Edilebilir Kullanım">
        <p>Kullanıcı, Hizmet'i yürürlükteki mevzuata, spam ve veri koruma kurallarına uygun kullanmayı taahhüt eder. Hizmet aracılığıyla elde edilen iletişim bilgilerinin kullanımı ve gönderilen iletiler Kullanıcı'nın sorumluluğundadır. İzinsiz toplu ileti, yanıltıcı içerik ve yasa dışı amaçlarla kullanım yasaktır.</p>
      </Section>
      <Section title="6. Veri ve Gizlilik (KVKK)">
        <p>Kişisel veriler, 6698 sayılı Kişisel Verilerin Korunması Kanunu ve ilgili mevzuata uygun olarak işlenir. Kullanıcı, Hizmet üzerinden işlediği üçüncü kişilere ait verilerde veri sorumlusu sıfatıyla hareket eder ve gerekli hukuki dayanağa sahip olduğunu kabul eder.</p>
      </Section>
      <Section title="7. Sorumluluğun Sınırlandırılması">
        <p>Hizmet "olduğu gibi" sunulur. Email tahmini ve doğrulama sonuçlarının %100 doğruluğu garanti edilmez. Şirket, Hizmet'in kullanımından doğan dolaylı zararlardan sorumlu tutulamaz. Toplam sorumluluk, Kullanıcı'nın son 12 ayda ödediği tutarla sınırlıdır.</p>
      </Section>
      <Section title="8. Fesih">
        <p>Kullanıcı hesabını dilediği zaman kapatabilir. Şirket, bu koşulların ihlali halinde hesabı askıya alabilir veya kapatabilir.</p>
      </Section>
      <Section title="9. Değişiklikler">
        <p>Şirket, bu Kullanım Koşulları'nı güncelleyebilir. Önemli değişiklikler Kullanıcı'ya bildirilir. Güncellemeden sonra Hizmet'in kullanılmaya devam edilmesi, yeni koşulların kabulü anlamına gelir.</p>
      </Section>
      <Section title="10. Uygulanacak Hukuk ve İletişim">
        <p>Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Sorularınız için: captsertacgul@gmail.com</p>
      </Section>
    </>
  )
}

function TermsEn() {
  return (
    <>
      <Section title="1. Parties and Scope">
        <p>AskDesk (the "Service") is a software service operated by ATAOL AI Techs (the "Company"). These Terms of Use govern the relationship between the Company and any person or entity that registers for or uses the Service (the "User"). By registering, you accept these terms.</p>
      </Section>
      <Section title="2. Description of the Service">
        <p>AskDesk provides tools for lead discovery, business email pattern generation and verification, AI-assisted email drafting, and pipeline and content management. AskDesk does not send email; generated content is sent by the User from their own email tool.</p>
      </Section>
      <Section title="3. Account and Security">
        <p>The User must provide accurate, current information at registration and is responsible for account security and all activity under the account. A corporate email address is required.</p>
      </Section>
      <Section title="4. Trial and Payment">
        <p>New accounts receive a 7-day free trial. Paid plans and credit packs are billed through the relevant payment provider. Prices may change with notice; the price for the current period is honored.</p>
      </Section>
      <Section title="5. Acceptable Use">
        <p>The User agrees to use the Service in compliance with applicable law and anti-spam and data-protection rules. The use of contact data obtained through the Service and any messages sent are the User's responsibility. Unsolicited bulk messaging, deceptive content, and unlawful use are prohibited.</p>
      </Section>
      <Section title="6. Data and Privacy">
        <p>Personal data is processed in accordance with applicable data-protection law (including Turkey's KVKK, Law No. 6698). The User acts as data controller for any third-party data it processes through the Service and confirms it has the necessary legal basis.</p>
      </Section>
      <Section title="7. Limitation of Liability">
        <p>The Service is provided "as is." Email pattern and verification results are not guaranteed to be 100% accurate. The Company is not liable for indirect damages arising from use of the Service. Total liability is limited to the amount the User paid in the last 12 months.</p>
      </Section>
      <Section title="8. Termination">
        <p>The User may close their account at any time. The Company may suspend or close an account for breach of these terms.</p>
      </Section>
      <Section title="9. Changes">
        <p>The Company may update these Terms. Material changes will be communicated to the User. Continued use of the Service after an update constitutes acceptance of the new terms.</p>
      </Section>
      <Section title="10. Governing Law and Contact">
        <p>These terms are governed by the laws of the Republic of Türkiye. Questions: captsertacgul@gmail.com</p>
      </Section>
    </>
  )
}
