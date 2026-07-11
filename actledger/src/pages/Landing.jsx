import { Link } from 'react-router-dom'
import { useT } from '../contexts/LanguageContext'

export default function Landing() {
  const { t } = useT()
  return (
    <div className="min-h-screen bg-white text-[#111827]">
      {/* Navbar */}
      <nav className="border-b border-[#E5E7EB] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-[#2563EB]">AskDesk</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-[#6B7280] hover:text-[#111827]">
            {t('Giriş Yap')}
          </Link>
          <Link
            to="/register"
            className="text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-4 py-1.5"
          >
            {t('Ücretsiz Başla')}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 py-20">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-[#111827] mb-4">
            {t("Startup'ınızı büyütecek müşterileri bulun")}
          </h1>
          <p className="text-sm text-[#6B7280] mb-8 max-w-xl mx-auto">
            {t("AskDesk ile potansiyel müşterileri keşfedin, outreach kampanyaları oluşturun ve lead'lerinizi bir CRM pipeline'ında yönetin. Yapay zeka destekli içgörülerle satış sürecinizi hızlandırın.")}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/register"
              className="text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-5 py-2"
            >
              {t('Ücretsiz Başla')}
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-[#111827] border border-[#E5E7EB] rounded-md px-5 py-2 hover:bg-[#F9FAFB]"
            >
              {t('Giriş Yap')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="border border-[#E5E7EB] rounded-md p-5">
            <div className="text-xs font-semibold text-[#2563EB] mb-2">{t('Akıllı Outreach')}</div>
            <div className="text-sm font-semibold text-[#111827] mb-1">{t('AI destekli email kampanyaları')}</div>
            <div className="text-xs text-[#6B7280]">
              {t('Gemini AI ile kişiselleştirilmiş outreach emaillerini saniyeler içinde oluşturun ve email açılma takibiyle etkiyi ölçün.')}
            </div>
          </div>
          <div className="border border-[#E5E7EB] rounded-md p-5">
            <div className="text-xs font-semibold text-[#2563EB] mb-2">{t('Lead Generation')}</div>
            <div className="text-sm font-semibold text-[#111827] mb-1">{t('Google Maps entegrasyonu')}</div>
            <div className="text-xs text-[#6B7280]">
              {t('Google Maps üzerinden hedef şirketleri arayın, yorumları analiz edin ve tek tıkla lead listesine ekleyin.')}
            </div>
          </div>
          <div className="border border-[#E5E7EB] rounded-md p-5">
            <div className="text-xs font-semibold text-[#2563EB] mb-2">{t('CRM Pipeline')}</div>
            <div className="text-sm font-semibold text-[#111827] mb-1">{t('Sürükle-bırak kanban')}</div>
            <div className="text-xs text-[#6B7280]">
              {t("Satış sürecinizi görselleştirin, lead'lerinizi aşamalar arasında taşıyın ve dönüşüm oranlarınızı artırın.")}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
        <span className="text-sm font-bold text-[#2563EB]">AskDesk</span>
        <span className="text-xs text-[#6B7280]">ATAOL AI Techs</span>
      </footer>
    </div>
  )
}
