import { useEffect } from 'react'
import LegalShell, { LegalSection as Section } from '../components/LegalShell'
import { useT } from '../contexts/LanguageContext'
import { setSeo } from '../lib/seo'

export default function Privacy() {
  const { lang } = useT()
  const isEn = lang === 'en'

  // Without this the prerendered page carried the landing page's title and a
  // canonical pointing at /, so it was indistinguishable from the home page.
  useEffect(() => {
    setSeo({
      title: isEn
        ? 'Privacy Policy | AskDesk'
        : 'Gizlilik Politikası ve KVKK Aydınlatma Metni | AskDesk',
      description: isEn
        ? 'How AskDesk collects, processes and protects personal data, and the rights you hold over it.'
        : 'AskDesk kişisel verilerinizi nasıl topluyor, işliyor ve koruyor; KVKK kapsamındaki haklarınız neler.',
      canonical: 'https://askdesk.app/privacy/',
    })
  }, [isEn])

  return (
    <LegalShell
      title={isEn ? 'Privacy Policy' : 'Gizlilik Politikası ve KVKK Aydınlatma Metni'}
      updated={isEn ? 'Last updated: July 2026' : 'Son güncelleme: Temmuz 2026'}
    >
      {isEn ? <PrivacyEn /> : <PrivacyTr />}
    </LegalShell>
  )
}

function PrivacyTr() {
  return (
    <>
      <Section title="1. Veri Sorumlusu">
        <p>AskDesk hizmeti, ATAOL AI Techs ("Şirket") tarafından işletilmektedir. 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu Şirket'tir. İletişim: info@ataolai.tech</p>
      </Section>
      <Section title="2. İşlenen Kişisel Veriler">
        <p>Kayıt ve kullanım sırasında; ad soyad, kurumsal e-posta adresi, firma adı, şifrenizin güvenli özeti (hash) ve hesap etkinliğinize ilişkin kayıtlar işlenir. Hizmet'i kullanarak arattığınız firmalara ait alan adı, kişi adı ve iş e-postası gibi veriler de sistemde işlenir.</p>
      </Section>
      <Section title="3. İşleme Amaçları">
        <p>Verileriniz; hesabınızın oluşturulması ve yönetimi, hizmetin sunulması, e-posta bulma ve doğrulama işlevlerinin çalıştırılması, faturalandırma, güvenlik ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir.</p>
      </Section>
      <Section title="4. Hukuki Sebep">
        <p>İşleme; sözleşmenin kurulması ve ifası, Şirket'in meşru menfaati ve ilgili mevzuattan doğan yükümlülükler hukuki sebeplerine dayanır.</p>
      </Section>
      <Section title="5. Aktarım ve Hizmet Sağlayıcılar">
        <p>Hizmetin sağlanması için verileriniz aşağıdaki tedarikçilerle sınırlı ölçüde paylaşılabilir: Cloudflare (barındırma), MillionVerifier ve Hunter (e-posta doğrulama/bulma), Google (yapay zeka içerik üretimi), Lemon Squeezy (ödeme), Resend (işlemsel e-posta). Bu sağlayıcıların bir kısmı yurt dışında bulunmaktadır; aktarım KVKK'nın öngördüğü şartlara uygun yapılır.</p>
      </Section>
      <Section title="6. Saklama Süresi">
        <p>Kişisel veriler, hesabınız aktif olduğu sürece ve ilgili mevzuatın öngördüğü süreler boyunca saklanır. Hesabınızı kapattığınızda verileriniz makul süre içinde silinir veya anonimleştirilir.</p>
      </Section>
      <Section title="7. Üçüncü Kişi Verileri ve Sorumluluğunuz">
        <p>Hizmet aracılığıyla eriştiğiniz üçüncü kişilere ait iletişim verilerini işlerken veri sorumlusu sıfatıyla hareket edersiniz. Bu verileri hukuka ve KVKK ile spam/veri koruma kurallarına uygun kullanmakla yükümlüsünüz.</p>
      </Section>
      <Section title="8. İlgili Kişi Hakları (KVKK md. 11)">
        <p>Kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme, işlemeye itiraz etme ve zararın giderilmesini talep etme haklarına sahipsiniz. Taleplerinizi info@ataolai.tech adresine iletebilirsiniz.</p>
      </Section>
      <Section title="9. Çerezler">
        <p>Oturumunuzu sürdürmek için gerekli çerezler (örneğin kimlik doğrulama çerezi) kullanılır. Bu çerezler hizmetin çalışması için zorunludur.</p>
      </Section>
      <Section title="10. Güvenlik">
        <p>Şifreler yalnızca güvenli özet (hash) olarak saklanır. Verilerin korunması için makul teknik ve idari tedbirler alınır.</p>
      </Section>
      <Section title="11. Değişiklikler ve İletişim">
        <p>Bu metin güncellenebilir; önemli değişiklikler bildirilir. Sorularınız için: info@ataolai.tech</p>
      </Section>
    </>
  )
}

function PrivacyEn() {
  return (
    <>
      <Section title="1. Data Controller">
        <p>The AskDesk service is operated by ATAOL AI Techs (the "Company"), which acts as data controller under Turkey's Personal Data Protection Law (KVKK, Law No. 6698) and applicable data-protection law. Contact: info@ataolai.tech</p>
      </Section>
      <Section title="2. Personal Data We Process">
        <p>At registration and during use we process your name, corporate email address, company name, a secure hash of your password, and records of your account activity. Data about the companies you search, such as domain, person name, and business email, is also processed within the service.</p>
      </Section>
      <Section title="3. Purposes of Processing">
        <p>Your data is processed to create and manage your account, provide the service, run email finding and verification, handle billing, ensure security, and meet legal obligations.</p>
      </Section>
      <Section title="4. Legal Basis">
        <p>Processing is based on the formation and performance of the contract, the Company's legitimate interests, and obligations arising from applicable law.</p>
      </Section>
      <Section title="5. Transfers and Service Providers">
        <p>To provide the service, your data may be shared to a limited extent with: Cloudflare (hosting), MillionVerifier and Hunter (email verification/finding), Google (AI content generation), Lemon Squeezy (payments), and Resend (transactional email). Some providers are located abroad; transfers are made in accordance with applicable data-protection requirements.</p>
      </Section>
      <Section title="6. Retention">
        <p>Personal data is retained while your account is active and for periods required by applicable law. When you close your account, your data is deleted or anonymized within a reasonable time.</p>
      </Section>
      <Section title="7. Third-Party Data and Your Responsibility">
        <p>When you process contact data of third parties obtained through the service, you act as data controller for that data and must use it in compliance with applicable law and anti-spam and data-protection rules.</p>
      </Section>
      <Section title="8. Your Rights">
        <p>You have the right to learn whether your data is processed, request information, request correction or deletion, object to processing, and seek remedy for damages. Send requests to info@ataolai.tech</p>
      </Section>
      <Section title="9. Cookies">
        <p>We use cookies necessary to maintain your session (for example an authentication cookie). These cookies are required for the service to function.</p>
      </Section>
      <Section title="10. Security">
        <p>Passwords are stored only as a secure hash. We apply reasonable technical and organizational measures to protect data.</p>
      </Section>
      <Section title="11. Changes and Contact">
        <p>This policy may be updated; material changes will be communicated. Questions: info@ataolai.tech</p>
      </Section>
    </>
  )
}
