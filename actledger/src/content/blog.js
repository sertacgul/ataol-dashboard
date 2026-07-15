// Public blog content. Pure data module (no JSX) so the prerender script can
// import slugs too. Body is a list of typed blocks rendered as React elements
// (no raw HTML injection).
//
// Block shapes:
//   ['p', 'paragraph text']
//   ['h2', 'heading']
//   ['h3', 'subheading']
//   ['ul', ['item one', 'item two']]

export const POSTS = [
  {
    slug: 'b2b-eposta-bulma-rehberi',
    title: 'B2B E-posta Bulma Rehberi: Bir Firmadaki Doğru Kişiye Nasıl Ulaşılır',
    metaTitle: 'B2B E-posta Bulma Rehberi: Doğru Kişiye Nasıl Ulaşılır (2026)',
    metaDescription: 'Bir firmada karar vericinin iş e-postasını bulmanın yöntemleri: pattern mantığı, doğrulama, catch-all domainler ve KVKK. Uygulamalı, güncel rehber.',
    date: '2 Haziran 2026',
    dateISO: '2026-06-02',
    author: 'ATAOL AI Techs',
    keyword: 'b2b e-posta bulma',
    excerpt: 'Bir firmada karar vericinin iş e-postasını bulmanın çalışan bir sistemi: pattern mantığı, doğrulama, catch-all domainler ve KVKK.',
    body: [
      ['p', 'Bir firmayı müşteri yapmak istiyorsun. Web sitesine giriyorsun, tek gördüğün adres bir info@ kutusu. O adrese yazdığın e-postaların çoğu bir yere varmıyor, çünkü orayı kimse ciddiye almıyor. Oysa ulaşman gereken kişi belli: o firmadaki satış direktörü, kurucu ya da operasyon müdürü. Sorun onu bulmak değil, ona giden iş e-postasını bulmak.'],
      ['p', 'Bu rehber, tam olarak bunu nasıl yapacağını anlatıyor. Tahmin ve şansı bırakıp, çalışan bir sistem kuracağız.'],

      ['h2', 'Neden info@ çözüm değil'],
      ['p', 'Genel adresler (info@, iletisim@, destek@) bir havuzdur. Oraya düşen mesajlar çoğu zaman bir asistan tarafından elenir, sınıflandırılır ya da hiç açılmaz. Sana lazım olan karar verici o kutuyu genelde hiç görmez.'],
      ['p', 'İş e-postası ise kişiseldir: ad ve soyadın domaine bağlanmış halidir. Doğru kişinin kişisel iş adresine giden bir mesajın açılma ve yanıt alma olasılığı, genel bir kutuya göre kat kat yüksektir. Bu yüzden hedefimiz her zaman kişiye özel adrestir.'],

      ['h2', 'Bir iş e-postasının anatomisi'],
      ['p', 'Her iş e-postası iki parçadan oluşur: yerel kısım (@ işaretinden önce) ve domain (@ işaretinden sonra). Domaini bulmak kolaydır, firmanın web sitesidir. İş burada yerel kısmı çözmektir.'],
      ['p', 'Firmalar yerel kısmı rastgele oluşturmaz. Neredeyse tüm kurumlar tek bir kalıp kullanır ve tüm çalışanlara aynı kalıbı uygular. En yaygın kalıplar şunlardır:'],
      ['ul', [
        'ad.soyad@firma.com',
        'adsoyad@firma.com',
        'a.soyad@firma.com (ilk harf, sonra soyad)',
        'asoyad@firma.com',
        'ad_soyad@firma.com',
        'soyad.ad@firma.com',
        'ad@firma.com',
      ]],
      ['p', 'Bir firmanın hangi kalıbı kullandığını bir kez çözersen, o firmadaki herkesin adresini üretebilirsin. Bir çalışanın adresini bir yerde gördüysen (LinkedIn, web sitesi, imza), kalıbı geri çıkarıp diğerlerine uygularsın.'],

      ['h3', 'Türkçe karakter tuzağı'],
      ['p', 'Türkiye firmalarında sık atlanan bir nokta var. Şükrü Güneş adlı biri için adres neredeyse hiçbir zaman şükrü.güneş@ olmaz. Türkçe karakterler İngilizce karşılıklarına çevrilir: ş yerine s, ğ yerine g, ı yerine i, ç yerine c, ö yerine o, ü yerine u. Yani doğru tahmin sukru.gunes@firma.com olur. Bu çeviriyi yapmadan üretilen her kalıp baştan yanlıştır.'],

      ['h2', 'E-posta bulmanın dört yöntemi'],
      ['p', 'Elinde dört temel yol var. Her birinin ayrı bir gücü ve sınırı var.'],
      ['h3', '1. Web sitesi ve iletişim sayfası taraması'],
      ['p', 'Firmanın kendi sitesi çoğu zaman en dürüst kaynaktır. İletişim, hakkımızda, ekip ve kurumsal sayfalarında gerçek adresler açıkça yazabilir. Bu adresler tahmin değil, doğrulanmış gerçeklerdir. İlk adımın her zaman burası olsun.'],
      ['h3', '2. Kalıp üretme ve doğrulama'],
      ['p', 'Site adres vermiyorsa, kişinin adını ve firmanın domainini biliyorsan kalıpları üretir, sonra hangisinin gerçek olduğunu doğrularsın. Bu ikilinin birleşimi aslında bir e-posta bulucudur: üret, doğrula, gerçeği döndür. Doğrulama olmadan bu yöntem sadece tahmindir, bu yüzden aşağıda ayrı bir başlık ayırdık.'],
      ['h3', '3. Veritabanı tabanlı araçlar'],
      ['p', 'Hunter, Apollo gibi araçların arkasında geniş kişi veritabanları vardır. Bir domain verirsin, sana o firmadaki kişileri ve adreslerini döndürür. Kapsamları geniştir ama maliyetlidir ve her firmayı, özellikle küçük yerel firmaları bilmezler.'],
      ['h3', '4. LinkedIn üzerinden çapraz doğrulama'],
      ['p', 'LinkedIn, doğru kişiyi ve unvanını bulmak için en iyi yerdir. Adresi doğrudan vermez ama adı ve firmayı verir. Adı alıp kalıba çevirir, doğrularsın. Ayrıca bir kişinin gerçek adresini bir yerde görürsen, firmanın kalıbını çözmek için çapraz kontrol sağlar.'],

      ['h2', 'Doğrulama olmadan tahmin işe yaramaz'],
      ['p', 'Burası çoğu rehberin atladığı yer. Bir kalıp ürettin diyelim: ad.soyad@firma.com. Bu adres gerçekten var mı, yoksa boşa mı yazıyorsun? Doğrulama bunu söyler.'],
      ['p', 'Doğrulama üç katmanda çalışır:'],
      ['ul', [
        'MX kaydı: Domainin e-posta alabilen bir sunucusu var mı. Yoksa hiçbir adres çalışmaz.',
        'Kutu kontrolü: Sunucuya bağlanıp o yerel kısmın gerçekten var olup olmadığı sorulur.',
        'Catch-all durumu: Bazı firmalar her adrese evet der ayarındadır (özellikle Google Workspace te sık). Bu durumda sunucu var olmayan adreslere bile kabul der, yani hangi kalıbın gerçek olduğunu ayırt edemezsin.',
      ]],
      ['p', 'Catch-all bir domaine denk geldiğinde saf doğrulama yetmez. Burada en olası kalıbı en yüksek olasılıkla verir, tahmin olarak işaretlersin. Normal domainlerde ise doğrulama sana kesin cevabı verir.'],
      ['p', 'Doğrulamayı atlamanın bedeli bounce tur. Var olmayan adreslere gönderim yaptıkça gönderen itibarın düşer ve zamanla gerçek adreslere bile ulaşamamaya başlarsın. Yani doğrulama sadece isabet için değil, uzun vadede gönderebilme yeteneğin için de şarttır.'],

      ['h2', 'KVKK ve soğuk iletişimde e-posta'],
      ['p', 'Türkiye de e-posta ile soğuk iletişim yaparken iki çerçeveyi bilmek gerekir. Kişisel verilerin işlenmesi KVKK kapsamındadır. Ticari elektronik ileti gönderimi ise 6563 sayılı kanun ve İleti Yönetim Sistemi (İYS) ile düzenlenir.'],
      ['p', 'Genel çerçeve şudur: bireysel alıcılara yönelik ticari elektronik iletide onay ve İYS kaydı önemliyken, tacirler ve esnaf arasındaki B2B iletişimde bazı istisnalar tanımlıdır. Yine de topladığın verinin kaynağını, işleme amacını ve saklama süresini bilmek, alıcıya çıkma hakkını sunmak iyi bir pratiktir. Bu bir hukuki tavsiye değildir; ölçeklenmeden önce bir hukukçuya danışmanı öneririz. Doğru yaklaşım, az sayıda ve gerçekten ilgili firmaya kişiselleştirilmiş ulaşmaktır, toplu ve alakasız gönderim değil.'],

      ['h2', 'Hangi yöntem sana uygun'],
      ['p', 'Solo kurucuysan ve az sayıda ama doğru firmayı hedefliyorsan, site taraması ve kalıp artı doğrulama kombinasyonu genelde yeter ve maliyeti neredeyse sıfırdır. Hacmin arttıkça ve her firmayı tek tek bulmak zaman aldıkça, veritabanı tabanlı bir aracı doğrulamayla birlikte kullanmak işini hızlandırır. KOBİ ler ve küçük ekipler için en sağlıklı model, bulmayı ücretsiz katmana bırakıp yalnızca doğrulamayı kullanım başına ödemektir; böylece maliyet gelirle birlikte büyür.'],
      ['p', 'Hangi yolu seçersen seç, değişmeyen sıralama şudur: önce doğru kişiyi belirle, sonra adresi üret, sonra mutlaka doğrula, en son gönder.'],
    ],
    faq: [
      {
        q: 'Bir firmanın kullandığı e-posta kalıbını nasıl anlarım?',
        a: 'O firmadan bir kişinin gerçek adresini bir yerde (imza, LinkedIn, site) bulup, adını kalıba geri çevirirsin. Örneğin adresi a.gunes@firma.com olan Ahmet Güneş, firmanın ilk harf nokta soyad kalıbını kullandığını gösterir. Aynısını diğer kişilere uygularsın.',
      },
      {
        q: 'Tahmin ettiğim adresin gerçek olduğunu nasıl bilirim?',
        a: 'Doğrulama ile. MX kaydı, kutu kontrolü ve catch-all durumu bakılır. Catch-all olmayan bir domainde doğrulama kesin sonuç verir; catch-all domainde ise en olası kalıbı tahmin olarak işaretlersin.',
      },
      {
        q: 'Sadece info@ adresi bulabiliyorum, ne yapmalıyım?',
        a: 'Önce LinkedIn den doğru kişiyi bul, adını firma domainiyle birleştirip kalıp üret ve doğrula. Gerçekten başka yol yoksa info@ üzerinden yazarken mesajın konusuna doğru kişinin adını ve unvanını ekleyerek yönlendirilmesini kolaylaştır.',
      },
      {
        q: 'Bu yöntemler yasal mı?',
        a: 'Herkese açık kaynaklardan iş iletişim bilgisi bulmak yaygın bir pratiktir. Kritik olan bu veriyi nasıl kullandığındır. KVKK ve ticari ileti kurallarına uygun, kişiselleştirilmiş ve alakalı iletişim kur; toplu ve izinsiz gönderimden kaçın.',
      },
    ],
  },
]

export function getPost(slug) {
  return POSTS.find(p => p.slug === slug) || null
}
