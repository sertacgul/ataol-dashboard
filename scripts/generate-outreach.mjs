#!/usr/bin/env node
// Daily outreach email generator for ATAOL AI Techs
// Reads unprocessed leads from Gist, researches via Gemini 2.5 Flash
// with Google Search grounding, generates emails via Gemini 2.5 Flash,
// writes back to Gist as pending_review.
//
// Required env vars (set via GitHub Secrets):
//   GEMINI_API_KEY, GIST_TOKEN
// Optional:
//   BATCH_SIZE (default: 25)

const GIST_ID = '3a783c6e0d525a36da50cc4821e55552';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '25', 10);

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GIST_TOKEN = process.env.GIST_TOKEN;

if (!GEMINI_KEY || !GIST_TOKEN) {
  console.error('Missing required env vars: GEMINI_API_KEY, GIST_TOKEN');
  process.exit(1);
}

// ---- ATAOL company info (same as dashboard) ----
const ATAOL_INFO = `ATAOL AI Techs - teknoloji ve yazilim cozumleri sirketi:

Piramit Platform ve Hizmetlerimiz:
1. StrategyThrust - Stratejik Karar Destek Platformu:
- Geleneksel yonetim danismanliginin aylar suren isini (sektor analizi, rekabet konumlandirmasi, pazar dinamikleri, stratejik projeksiyonlar) cok daha kisa surede tamamlar.
- Geleneksel yonetim danismanliginin yaklasik 150'de 1 fiyatina ayni kalitede cikti sunar.
- Yonetim kurulunun karar alma sureclerini hizlandirir, stratejik riskleri minimize eder.

2. ActLedger - Operasyonel Mukemmellik Sistem Platformu:
- 15 sektor, 576+ departman, 7800+ hazir KPI ile dunyanin en kapsamli sektor-spesifik performans olcum ve takip sistemidir.
- Mobil-first: iOS native app + PWA. Saha operasyonlari, envanter, is akislari ve IoT entegrasyonu saglar.
- Kampanya: 3 aylik lisans alanlara +1 ay ucretsiz | Yillik lisans alanlara %15 indirim.

3. ATAOL AI Lab - Yapay Zeka Entegrasyonu ve Dijital Donusum Hizmetleri:
- Buyuk Dil Modelleri (LLM) ve uretken yapay zeka araclarinin sirketlerin is akislarina ve B2B yazilim sureclerine entegrasyonu.
- Sirkete ozel yapay zeka cozumleri, otomasyon sistemleri, mobil ve web uygulamalari gelistirme.

4. ATAOL AI Institute - Kurumsal Yapay Zeka Egitimleri:
- Sirketlerin yonetici ve calisan kadrolarina yonelik kurumsal yapay zeka egitimi, yapay zeka okuryazarligi ve dijital donusum adaptasyon programlari.

Kurucu: Sertac Gul | ataolai.tech | strategythrust.com | actledger.com`;

// ---- Country / Language mappings ----
const COUNTRY_LANGCODE = {
  TR:'tr', DE:'de', FR:'fr', ES:'es', IT:'it', NL:'nl', BE:'nl',
  AT:'de', CH:'de', PT:'pt', SE:'sv', NO:'no', DK:'da', FI:'fi',
  PL:'pl', CZ:'cs', RO:'ro', GR:'el', IE:'en',
  UK:'en', GB:'en', US:'en', CA:'en', MX:'es', BR:'pt',
  AR:'es', CO:'es', CL:'es', AE:'en', SA:'ar', IL:'en', QA:'en',
  IN:'en', SG:'en', JP:'ja', KR:'ko', CN:'zh', ID:'id', MY:'en',
  TH:'th', VN:'vi', AU:'en', NZ:'en', ZA:'en', NG:'en',
  KE:'en', EG:'ar', INT:'en'
};
const COUNTRY_TZ = {
  TR:3, DE:2, FR:2, ES:2, IT:2, NL:2, GB:1, UK:1, US:-5, CA:-5,
  JP:9, KR:9, AU:10, BR:-3, AE:4, SA:3, IN:5, SG:8, INT:0
};

const TEMPLATE_L10N = {
  tr: {
    st_label: 'Stratejik Karar Destek Platformu',
    al_label: 'Operasyonel M\u00fckemmellik Sistem Platformu',
    innov_label: '\u0130novasyon ve D\u00fcnya \u0130lkleri',
    svc_label: 'Otomasyon, Mobil & Web Uygulama, \u00d6zel Yaz\u0131l\u0131m \u00c7\u00f6z\u00fcmleri',
    promo: '3 ayl\u0131k lisans alanlara +1 ay \u00fccretsiz kullan\u0131m | Y\u0131ll\u0131k lisans alanlara %15 indirim',
    unsub: 'Bu e-postay\u0131 almak istemiyorsan\u0131z, l\u00fctfen \'abonelikten \u00e7\u0131k\' yazarak yan\u0131t verin.',
    eng_note: ''
  },
  de: {
    st_label: 'Strategische Entscheidungsunterst\u00fctzung',
    al_label: 'Operationale Exzellenz Plattform',
    innov_label: 'Innovation und Weltpremieren',
    svc_label: 'Automatisierung, Mobile & Web Apps, individuelle Softwarel\u00f6sungen',
    promo: '3-Monats-Lizenz: +1 Monat kostenlos | Jahreslizenz: 15% Rabatt',
    unsub: 'Wenn Sie diese E-Mails nicht mehr erhalten m\u00f6chten, antworten Sie einfach mit \'abmelden\'.',
    eng_note: '<p style="margin:0 0 20px;font-size:12px;color:#888;font-style:italic;">Note: All meetings and communications will be conducted in English.</p>'
  },
  fr: {
    st_label: "Plateforme d'aide \u00e0 la d\u00e9cision strat\u00e9gique",
    al_label: "Plateforme d'excellence op\u00e9rationnelle",
    innov_label: 'Innovation et premi\u00e8res mondiales',
    svc_label: 'Automatisation, applications mobiles & web, solutions logicielles sur mesure',
    promo: 'Licence 3 mois : +1 mois offert | Licence annuelle : 15% de r\u00e9duction',
    unsub: "Si vous ne souhaitez plus recevoir ces e-mails, r\u00e9pondez simplement 'se d\u00e9sabonner'.",
    eng_note: '<p style="margin:0 0 20px;font-size:12px;color:#888;font-style:italic;">Note: All meetings and communications will be conducted in English.</p>'
  },
  es: {
    st_label: 'Plataforma de apoyo a decisiones estrat\u00e9gicas',
    al_label: 'Plataforma de excelencia operacional',
    innov_label: 'Innovaci\u00f3n y primicias mundiales',
    svc_label: 'Automatizaci\u00f3n, apps m\u00f3viles & web, soluciones de software a medida',
    promo: 'Licencia 3 meses: +1 mes gratis | Licencia anual: 15% de descuento',
    unsub: "Si no desea recibir estos correos, simplemente responda con 'cancelar suscripci\u00f3n'.",
    eng_note: '<p style="margin:0 0 20px;font-size:12px;color:#888;font-style:italic;">Note: All meetings and communications will be conducted in English.</p>'
  },
  it: {
    st_label: 'Piattaforma di supporto alle decisioni strategiche',
    al_label: 'Piattaforma di eccellenza operativa',
    innov_label: 'Innovazione e primati mondiali',
    svc_label: 'Automazione, app mobile & web, soluzioni software personalizzate',
    promo: 'Licenza 3 mesi: +1 mese gratuito | Licenza annuale: sconto del 15%',
    unsub: "Se non desideri pi\u00f9 ricevere queste e-mail, rispondi semplicemente con 'annulla iscrizione'.",
    eng_note: '<p style="margin:0 0 20px;font-size:12px;color:#888;font-style:italic;">Note: All meetings and communications will be conducted in English.</p>'
  },
  pt: {
    st_label: 'Plataforma de apoio \u00e0 decis\u00e3o estrat\u00e9gica',
    al_label: 'Plataforma de excel\u00eancia operacional',
    innov_label: 'Inova\u00e7\u00e3o e pioneirismo mundial',
    svc_label: 'Automa\u00e7\u00e3o, apps m\u00f3veis & web, solu\u00e7\u00f5es de software sob medida',
    promo: 'Licen\u00e7a 3 meses: +1 m\u00eas gr\u00e1tis | Licen\u00e7a anual: 15% de desconto',
    unsub: "Se n\u00e3o deseja receber estes e-mails, basta responder com 'cancelar inscri\u00e7\u00e3o'.",
    eng_note: '<p style="margin:0 0 20px;font-size:12px;color:#888;font-style:italic;">Note: All meetings and communications will be conducted in English.</p>'
  },
  nl: {
    st_label: 'Strategisch beslissingsondersteuningsplatform',
    al_label: 'Operationeel excellentie platform',
    innov_label: 'Innovatie en wereldprimeurs',
    svc_label: 'Automatisering, mobiele & webapps, maatwerkoplossingen',
    promo: '3-maanden licentie: +1 maand gratis | Jaarlicentie: 15% korting',
    unsub: "Als u deze e-mails niet meer wilt ontvangen, antwoord dan met 'uitschrijven'.",
    eng_note: '<p style="margin:0 0 20px;font-size:12px;color:#888;font-style:italic;">Note: All meetings and communications will be conducted in English.</p>'
  },
  ja: {
    st_label: '\u6226\u7565\u7684\u610f\u601d\u6c7a\u5b9a\u652f\u63f4\u30d7\u30e9\u30c3\u30c8\u30d5\u30a9\u30fc\u30e0',
    al_label: '\u30aa\u30da\u30ec\u30fc\u30b7\u30e7\u30ca\u30eb\u30a8\u30af\u30bb\u30ec\u30f3\u30b9\u30d7\u30e9\u30c3\u30c8\u30d5\u30a9\u30fc\u30e0',
    innov_label: '\u30a4\u30ce\u30d9\u30fc\u30b7\u30e7\u30f3\u3068\u4e16\u754c\u521d',
    svc_label: '\u81ea\u52d5\u5316\u3001\u30e2\u30d0\u30a4\u30eb&\u30a6\u30a7\u30d6\u30a2\u30d7\u30ea\u3001\u30ab\u30b9\u30bf\u30e0\u30bd\u30d5\u30c8\u30a6\u30a7\u30a2\u30bd\u30ea\u30e5\u30fc\u30b7\u30e7\u30f3',
    promo: '3\u30f6\u6708\u30e9\u30a4\u30bb\u30f3\u30b9\uff1a+1\u30f6\u6708\u7121\u6599 | \u5e74\u9593\u30e9\u30a4\u30bb\u30f3\u30b9\uff1a15%\u5272\u5f15',
    unsub: '\u3053\u306e\u30e1\u30fc\u30eb\u306e\u914d\u4fe1\u505c\u6b62\u3092\u3054\u5e0c\u671b\u306e\u5834\u5408\u306f\u3001\u300c\u914d\u4fe1\u505c\u6b62\u300d\u3068\u3054\u8fd4\u4fe1\u304f\u3060\u3055\u3044\u3002',
    eng_note: '<p style="margin:0 0 20px;font-size:12px;color:#888;font-style:italic;">Note: All meetings and communications will be conducted in English.</p>'
  },
  ko: {
    st_label: '\uc804\ub7b5\uc801 \uc758\uc0ac\uacb0\uc815 \uc9c0\uc6d0 \ud50c\ub7ab\ud3fc',
    al_label: '\uc6b4\uc601 \ud0c1\uc6d4\uc131 \ud50c\ub7ab\ud3fc',
    innov_label: '\ud601\uc2e0 \ubc0f \uc138\uacc4 \ucd5c\ucd08',
    svc_label: '\uc790\ub3d9\ud654, \ubaa8\ubc14\uc77c & \uc6f9 \uc571, \ub9de\ucda4\ud615 \uc18c\ud504\ud2b8\uc6e8\uc5b4 \uc194\ub8e8\uc158',
    promo: '3\uac1c\uc6d4 \ub77c\uc774\uc120\uc2a4: +1\uac1c\uc6d4 \ubb34\ub8cc | \uc5f0\uac04 \ub77c\uc774\uc120\uc2a4: 15% \ud560\uc778',
    unsub: '\uc774 \uc774\uba54\uc77c \uc218\uc2e0\uc744 \uc6d0\uce58 \uc54a\uc73c\uc2dc\uba74 \'cancelar suscripcion\'\ub85c \ud68c\uc2e0\ud574 \uc8fc\uc138\uc694.',
    eng_note: '<p style="margin:0 0 20px;font-size:12px;color:#888;font-style:italic;">Note: All meetings and communications will be conducted in English.</p>'
  },
  ar: {
    st_label: '\u0645\u0646\u0635\u0629 \u062f\u0639\u0645 \u0627\u0644\u0642\u0631\u0627\u0631 \u0627\u0644\u0627\u0633\u062a\u0631\u0627\u062a\u064a\u062c\u064a',
    al_label: '\u0645\u0646\u0635\u0629 \u0627\u0644\u062a\u0645\u064a\u0632 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a',
    innov_label: '\u0627\u0644\u0627\u0628\u062a\u0643\u0627\u0631 \u0648\u0627\u0644\u0631\u064a\u0627\u062f\u0629 \u0627\u0644\u0639\u0627\u0644\u0645\u064a\u0629',
    svc_label: '\u0627\u0644\u0623\u062a\u0645\u062a\u0629\u060c \u062a\u0637\u0628\u064a\u0642\u0627\u062a \u0627\u0644\u0647\u0627\u062a\u0641 \u0648\u0627\u0644\u0648\u064a\u0628\u060c \u062d\u0644\u0648\u0644 \u0628\u0631\u0645\u062c\u064a\u0629 \u0645\u062e\u0635\u0635\u0629',
    promo: '\u0631\u062e\u0635\u0629 3 \u0623\u0634\u0647\u0631: +1 \u0634\u0647\u0631 \u0645\u062c\u0627\u0646\u064b\u0627 | \u0631\u062e\u0635\u0629 \u0633\u0646\u0648\u064a\u0629: \u062e\u0635\u0645 15%',
    unsub: '\u0625\u0630\u0627 \u0644\u0645 \u062a\u0631\u063a\u0628 \u0641\u064a \u062a\u0644\u0642\u064a \u0647\u0630\u0647 \u0627\u0644\u0631\u0633\u0627\u0626\u0644\u060c \u064a\u0631\u062c\u0649 \u0627\u0644\u0631\u062f \u0628\u0640 \'\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\'.',
    eng_note: '<p style="margin:0 0 20px;font-size:12px;color:#888;font-style:italic;">Note: All meetings and communications will be conducted in English.</p>'
  }
};
const EN_L10N = {
  st_label: 'Strategic Decision Support Platform',
  al_label: 'Operational Excellence System Platform',
  innov_label: 'Innovation and World Firsts',
  svc_label: 'Automation, Mobile & Web Apps, Custom Software Solutions',
  promo: '3-month license: +1 month free | Annual license: 15% discount',
  unsub: "If you'd prefer not to receive these emails, simply reply with 'unsubscribe'.",
  eng_note: '<p style="margin:0 0 20px;font-size:12px;color:#888;font-style:italic;">Note: All meetings and communications will be conducted in English.</p>'
};

const LOGO_URL = 'https://www.ataolai.tech/images/ataol-logo.png';
const LINKEDIN_URL = 'https://www.linkedin.com/company/ataol-ai-techs';
const LINKEDIN_ICON = 'https://cdn-icons-png.flaticon.com/512/174/174857.png';

// ---- Gist read/write ----
async function readGist() {
  const resp = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: { Authorization: `token ${GIST_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (!resp.ok) throw new Error(`Gist read failed: ${resp.status}`);
  const gist = await resp.json();
  const fileInfo = gist.files['emails.json'];
  let content;
  if (fileInfo.truncated && fileInfo.raw_url) {
    const r2 = await fetch(fileInfo.raw_url);
    content = await r2.text();
  } else {
    content = fileInfo.content;
  }
  return JSON.parse(content);
}

async function writeGist(data) {
  const resp = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      Authorization: `token ${GIST_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ files: { 'emails.json': { content: JSON.stringify(data) } } })
  });
  if (!resp.ok) throw new Error(`Gist write failed: ${resp.status}`);
}

// ---- Retry wrapper for Gemini API (handles 429/503 rate limits) ----
async function fetchWithRetry(url, options, label, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fetch(url, options);
    if (resp.ok) return resp;
    if ((resp.status === 429 || resp.status === 503) && attempt < maxRetries) {
      const wait = Math.pow(3, attempt + 1) * 2000; // 6s, 18s, 54s
      console.log(`    ${label} ${resp.status}, retry ${attempt + 1}/${maxRetries} in ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    const errBody = await resp.text();
    throw new Error(`${label} ${resp.status}: ${errBody.substring(0, 200)}`);
  }
}

// ---- Gemini research (Google Search grounding) ----
async function researchCompany(lead) {
  const name = lead.company_name;
  const website = lead.website || '';
  const notes = lead.notes || '';

  const prompt = `Research the company "${name}" in detail.
${website ? 'Website: ' + website : ''}
${notes ? 'Additional info: ' + notes : ''}

Find the following information:
1. What does the company do? (detailed description)
2. What industry/sector are they in?
3. Company size (employee count, revenue, etc.)
4. HEADQUARTERS COUNTRY: Which country is the company headquartered in? (give the 2-letter country code: TR, DE, FR, US, GB, JP, etc.)
5. Challenges the company faces, operational issues
6. Digital transformation status, operational efficiency
7. KEY DECISION-MAKER: Find the CEO, founder, managing director, CTO, or COO. Search LinkedIn, Crunchbase, company about page, and press releases. Provide their full name, title, and personal work email (NOT info@, contact@, or generic addresses).
8. Recent news or developments

Provide real and current information. If unknown, say so - do not fabricate.
IMPORTANT: Start your response with "HEADQUARTERS: XX" where XX is the 2-letter country code.
IMPORTANT: Include the decision-maker as "DECISION_MAKER: Full Name | Title | email@domain.com" on a separate line.
IMPORTANT: If you can only find a generic email, still provide it as "CONTACT_EMAIL: xxx@yyy.com" but try harder to find a personal email first.`;

  const resp = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'You are a company research specialist. You research companies using the internet and provide real, accurate information. Always respond in English. Always start with the headquarters country code.' }]
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } }
      })
    },
    'Gemini Research API'
  );

  const data = await resp.json();
  const parts = data.candidates[0].content.parts;
  return parts.filter(p => p.text).map(p => p.text).join('\n');
}

// ---- Country detection ----
function detectCountryFromResearch(research) {
  if (!research) return 'INT';
  const hqMatch = research.match(/HEADQUARTERS:\s*([A-Z]{2})/i);
  if (hqMatch) {
    const code = hqMatch[1].toUpperCase();
    if (COUNTRY_LANGCODE[code]) return code;
  }
  const patterns = [
    [/t\u00fcrk|istanbul|ankara|izmir|antalya|t\u00fcrkiye|turkey/i, 'TR'],
    [/deutschland|m\u00fcnchen|berlin|hamburg|frankfurt|german/i, 'DE'],
    [/france|paris|lyon|marseille|fran[\u00e7c]ais/i, 'FR'],
    [/espa\u00f1a|madrid|barcelona|spanish|spain/i, 'ES'],
    [/italia|milano|roma|italian|italy/i, 'IT'],
    [/nederland|amsterdam|dutch|netherlands/i, 'NL'],
    [/portugal|lisboa|portuguese/i, 'PT'],
    [/sverige|stockholm|swedish|sweden/i, 'SE'],
    [/norge|oslo|norwegian|norway/i, 'NO'],
    [/danmark|copenhagen|danish|denmark/i, 'DK'],
    [/suomi|helsinki|finnish|finland/i, 'FI'],
    [/polska|warsaw|polish|poland/i, 'PL'],
    [/\u010desk|prague|czech/i, 'CZ'],
    [/rom\u00e2nia|bucharest|romanian/i, 'RO'],
    [/\u03b5\u03bb\u03bb|athens|greek|greece/i, 'GR'],
    [/japan|tokyo|osaka|\u65e5\u672c/i, 'JP'],
    [/korea|seoul|\ud55c\uad6d/i, 'KR'],
    [/china|beijing|shanghai|\u4e2d\u56fd/i, 'CN'],
    [/brasil|s\u00e3o paulo|brazil/i, 'BR'],
    [/united arab|dubai|abu dhabi/i, 'AE'],
    [/saudi|riyadh/i, 'SA'],
    [/australia|sydney|melbourne/i, 'AU'],
    [/india|mumbai|bangalore|delhi/i, 'IN'],
    [/singapore/i, 'SG'],
    [/united kingdom|london|british|uk\b|england/i, 'GB'],
    [/united states|new york|california|american|\busa\b|\bu\.s\./i, 'US'],
  ];
  for (const [re, code] of patterns) {
    if (re.test(research)) return code;
  }
  return 'INT';
}

// ---- Gemini email generation ----
async function generateEmail(lead, research, country, lang, emailType = 'initial', prevSubject = '') {
  const name = lead.company_name;
  const email = lead.contact_email || lead.email || '';
  const contactName = lead.contact_name || '';
  const contactTitle = lead.contact_title || '';
  const website = lead.website || '';
  const notes = lead.notes || '';

  const langNames = {
    tr: 'Turkish',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
    it: 'Italian',
    pt: 'Portuguese',
    nl: 'Dutch',
    sv: 'Swedish',
    no: 'Norwegian',
    da: 'Danish',
    fi: 'Finnish',
    pl: 'Polish',
    cs: 'Czech',
    ro: 'Romanian',
    el: 'Greek',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    id: 'Indonesian',
    th: 'Thai',
    vi: 'Vietnamese',
    ar: 'Arabic',
    en: 'English'
  };
  const langName = langNames[lang] || 'English';

  let emailSpecificInstructions = '';
  if (emailType === 'initial') {
    emailSpecificInstructions = `
EMAIL TYPE: INITIAL OUTREACH
- Write a complete initial business development proposal.
- Cover StrategyThrust and ActLedger sections, as well as digital services or institute notes (TR only).
- Keep it highly customized to the research.
- Subject line must be max 60 chars.
`;
  } else if (emailType === 'followup_1') {
    emailSpecificInstructions = `
EMAIL TYPE: FOLLOW-UP 1
- You are writing a short, polite follow-up email (max 80 words) to our previous message.
- Subject line MUST be "Re: ${prevSubject}".
- Reference the previous outreach and ask if they had a chance to look at the customized platform solutions (StrategyThrust, ActLedger, ATAOL AI Lab/Institute) we sent.
- Briefly highlight a different angle of how we solve their specific pain points.
- Do NOT repeat the full initial proposal. Keep it very concise.
- Set all other platform-specific solution values (st_value_prop, al_value_prop, st_solutions, al_solutions, innovation_highlights, services_note, institute_note, ataol_intro) to empty strings/arrays.
- Put the entire follow-up message body in the "intro" field, and a short closing in "closing".
`;
  } else if (emailType === 'followup_2') {
    emailSpecificInstructions = `
EMAIL TYPE: FOLLOW-UP 2 (FINAL BUMP)
- You are writing an extremely brief "bump" email (max 50 words).
- Subject line MUST be "Re: ${prevSubject}".
- Write a direct query (e.g. "Hi [Name], I know you're busy. Just wanted to check if you had a moment to review my previous note, or if there is a better person on your team to connect with regarding this?").
- The tone should remain highly consultative and professional.
- Do NOT include value propositions, just ask for a quick redirect or feedback.
- Set all other platform-specific solution values (st_value_prop, al_value_prop, st_solutions, al_solutions, innovation_highlights, services_note, institute_note, ataol_intro) to empty strings/arrays.
- Put the entire follow-up message body in the "intro" field, and a short closing in "closing".
`;
  }

  const prompt = `You write corporate business development emails for ATAOL AI Techs.
${ATAOL_INFO}

${emailSpecificInstructions}

LANGUAGE & COUNTRY REQUIREMENT (CRITICAL):
The target company is located in "${country}" and the target language is "${langName}" (language code: "${lang}").
You MUST write ALL email fields in "${langName}". Do NOT use English or Turkish unless "${langName}" is English or Turkish.

LANGUAGE RULES:
1. Write ALL email fields (subject, greeting, intro, etc.) in "${langName}".
2. Set the "country" field in the JSON to "${country}".
3. Set the "language" field in the JSON to "${lang}".
4. Use formal business register appropriate for "${langName}" corporate culture.
5. GREETING: Use standard formal greeting in "${langName}". If contact name is known, address by name. NEVER use placeholder brackets like [Name].
6. For Turkish companies (lang="tr" and type="initial"): fill "institute_note". For others: empty string "".
7. NEVER use "AI", "yapay zeka", or "artificial intelligence" (or their translations in the target language) in the email text.
8. Em-dash/en-dash forbidden, use only short hyphen (-).
9. McKinsey/BCG/Bain corporate tone.
10. Shorter timeframe and 1/150 cost advantage: mention each ONLY ONCE total. Emphasize that our consulting output is delivered in a much shorter timeframe and at a much lower cost compared to traditional consulting.
11. Campaign details ONLY in ActLedger section, NOT in closing.
12. Include real facts from the research.

SPAM PREVENTION & POSTMASTER DELIVERY RULES:
- To prevent spam filter triggers, avoid overly promotional/sales-y words such as "free", "discount", "campaign", "no risk", "opportunity" in the subject and body. Keep the tone executive and advisory.
- Avoid using exclamation marks (!), ALL CAPS words, or emojis in the subject line or email body.
- The subject line (for INITIAL outreach) must be highly professional and specific to their company/challenges (e.g. "Operational Excellence Proposal for [Company]" or "Strategic Efficiency Project for [Company]").

PRODUCT ROUTING & SUBLIMINAL MESSAGE RULES (CRITICAL - NO GENERIC TEXT):
- Do NOT use generic value propositions or template-like text for our platforms (ActLedger, StrategyThrust, ATAOL AI Institute, ATAOL AI Lab).
- Customize each section (StrategyThrust, ActLedger, ATAOL AI Lab, ATAOL AI Institute) to directly address the company's specific researched pain points.
- Map the company's problems to the respective platforms:
  - If they face strategic, market positioning, or decision-making bottlenecks -> StrategyThrust is the hero. The StrategyThrust section should highlight how StrategyThrust solves their exact market/sector challenges.
  - If they face operational inefficiency, KPI tracking gaps, saha (field) coordination issues, workflow tracking gaps -> ActLedger is the hero. Customize ActLedger value props and solutions to their exact department or operational metrics.
  - If they lack digital transformation, B2B software integration, custom workflows, or AI tools -> ATAOL AI Lab is the hero. Mention custom B2B software and workflow automation under "services_note" as the custom AI Lab solution for their exact automation gap.
  - If they need team training, AI literacy, or management upskilling -> ATAOL AI Institute is the hero. Customize the "institute_note" (TR only) to propose a tailored AI literacy or executive training program for their team.
- Integrate these recommendations smoothly ("subliminal" / contextual routing) so that the transition from their problem to our specific platform/service feels natural, inevitable, and highly compelling.

--- FIRMA BILGILERI ---
Firma: ${name}
\${website ? 'Website: ' + website : ''}
\${email ? 'Iletisim email: ' + email : ''}
\${contactName ? 'Karar verici: ' + contactName + (contactTitle ? ' (' + contactTitle + ')' : '') : ''}
\${notes ? 'Ek bilgi: ' + notes : ''}

--- COMPANY RESEARCH ---
\${research}
--- END RESEARCH ---

Respond ONLY in valid JSON (no markdown, no code blocks):
{
  "lead": {
    "company_name": "...", "company_summary": "2-3 sentences",
    "industry": "...", "company_size": "small/medium/large",
    "country": "${country}", "pain_points": ["..."], "service_match": ["..."]
  },
  "email": {
    "subject": "max 60 chars", "language": "${lang}",
    "greeting": "...", "intro": "max 60 words",
    "ataol_intro": "max 30 words", "st_value_prop": "max 35 words",
    "st_solutions": ["..."], "al_value_prop": "max 35 words",
    "al_solutions": ["..."], "innovation_highlights": ["...","...","..."],
    "services_note": "max 20 words", "institute_note": "TR only or empty",
    "closing": "no campaign", "cta_text": "localized CTA"
  }
}`;

  const resp = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } }
      })
    },
    'Gemini Email API'
  );

  const data = await resp.json();
  const text = data.candidates[0].content.parts[0].text;
  let jsonStr = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) jsonStr = codeBlockMatch[1];
  return JSON.parse(jsonStr.trim());
}

// ---- Email HTML builder (matches dashboard template) ----
function buildEmailHtml(d, lang, emailType = 'initial') {
  if (emailType && emailType.startsWith('followup')) {
    const l = TEMPLATE_L10N[lang] || EN_L10N;
    const booking = d._booking_url || 'mailto:sertacgul@ataolai.tech';
    return `<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2d2d2d;line-height:1.6;padding:20px;background:#ffffff;border:1px solid #eee;border-radius:8px;">
      <p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;font-weight:600;">${d.greeting || ''}</p>
      <p style="margin:0 0 16px;font-size:14px;color:#444;white-space:pre-line;">${d.intro || ''}</p>
      <p style="margin:0 0 20px;font-size:14px;color:#444;white-space:pre-line;">${d.closing || ''}</p>
      <div style="margin:24px 0;">
        <a href="${booking}" style="display:inline-block;background:linear-gradient(135deg,#1a1a2e,#0f3460);color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">${d.cta_text || 'Schedule a Call'}</a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="margin:0;font-size:13px;color:#333;font-weight:600;">Sertac Gul<br><span style="color:#888;font-size:12px;font-weight:normal;">Founder, ATAOL AI Techs</span></p>
      <p style="margin:12px 0 0;font-size:10px;color:#aaa;font-style:italic;">${l.unsub}</p>
    </div>`;
  }

  const l = TEMPLATE_L10N[lang] || EN_L10N;
  const st_items = (d.st_solutions || []).map(s => `<p style="margin:0 0 6px;font-size:13px;color:#555;padding-left:8px;">&#10004; ${s}</p>`).join('');
  const al_items = (d.al_solutions || []).map(s => `<p style="margin:0 0 6px;font-size:13px;color:#555;padding-left:8px;">&#10004; ${s}</p>`).join('');
  const innov_items = (d.innovation_highlights || []).map(h => `<p style="margin:0 0 8px;font-size:13px;color:#e0e0e0;padding-left:8px;">&#9733; ${h}</p>`).join('');
  const booking = d._booking_url || 'mailto:sertacgul@ataolai.tech';

  let institute_block = '';
  if (lang === 'tr' && d.institute_note) {
    institute_block = `<div style="background:#fef3c7;border-radius:10px;padding:20px 24px;margin:20px 0;border-left:4px solid #f59e0b;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1a1a2e;">&#9670; ATAOL AI <span style="color:#f59e0b;">Institute</span></p>
      <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">Kurumsal Yapay Zeka Egitim Programlari</p>
      <p style="margin:8px 0 0;font-size:13px;color:#444;">${d.institute_note}</p>
    </div>`;
  }

  return `<div style="max-width:620px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2d2d2d;line-height:1.6;">
  <div style="background:linear-gradient(135deg,#0a0a1a 0%,#1a1a3e 50%,#0f2460 100%);padding:24px 30px 20px;border-radius:12px 12px 0 0;">
    <img src="${LOGO_URL}" alt="ATAOL AI Techs" style="height:48px;" />
    <div style="margin-top:12px;height:3px;background:linear-gradient(90deg,#4fc3f7,#22d3ee,#1976d2,transparent);border-radius:2px;"></div>
  </div>
  <div style="background:#ffffff;padding:30px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
    <p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;">${d.greeting || ''}</p>
    <p style="margin:0 0 14px;font-size:14px;color:#444;">${d.intro || ''}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555;font-style:italic;">${d.ataol_intro || ''}</p>
    <div style="background:#f8f9fc;border-radius:10px;padding:20px 24px;margin:20px 0;border-left:4px solid #1976d2;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1a1a2e;">&#9670; Strategy<span style="color:#1976d2;">Thrust</span></p>
      <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">${l.st_label}</p>
      <p style="margin:8px 0 12px;font-size:13px;color:#444;">${d.st_value_prop || ''}</p>
      ${st_items}
    </div>
    <div style="background:#f0fdf4;border-radius:10px;padding:20px 24px;margin:20px 0;border-left:4px solid #22d3ee;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1a1a2e;">&#9670; Act<span style="color:#22d3ee;">Ledger</span></p>
      <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">${l.al_label}</p>
      <p style="margin:8px 0 12px;font-size:13px;color:#444;">${d.al_value_prop || ''}</p>
      ${al_items}
      <div style="margin:14px 0 0;padding:10px 14px;background:linear-gradient(135deg,#e0f7fa,#e8f5e9);border-radius:6px;border:1px dashed #22d3ee;">
        <p style="margin:0;font-size:12px;font-weight:600;color:#0e7490;">&#127381; ${l.promo}</p>
      </div>
    </div>
    ${institute_block}
    <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);border-radius:10px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#4fc3f7;text-transform:uppercase;letter-spacing:1px;">${l.innov_label}</p>
      ${innov_items}
    </div>
    <p style="margin:16px 0 8px;font-size:13px;color:#555;">${d.services_note || ''}</p>
    <p style="margin:0 0 20px;font-size:12px;"><a href="https://www.ataolai.tech" style="color:#1976d2;text-decoration:none;font-weight:600;">www.ataolai.tech</a></p>
    <p style="margin:4px 0 12px;font-size:14px;color:#444;">${d.closing || ''}</p>
    ${l.eng_note}
    <div style="text-align:center;margin:24px 0;">
      <a href="${booking}" style="display:inline-block;background:linear-gradient(135deg,#1a1a2e,#0f3460);color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">${d.cta_text || 'Schedule a Call'}</a>
    </div>
    <p style="margin:0;font-size:13px;color:#333;">Sertac Gul<br><span style="color:#888;font-size:12px;">Founder, ATAOL AI Techs</span></p>
  </div>
  <div style="background:#f8f9fa;padding:20px 30px;border-radius:0 0 12px 12px;border:1px solid #e8e8e8;border-top:none;">
    <table style="width:100%;" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;">
        <p style="margin:0 0 2px;font-size:12px;color:#666;font-weight:600;">ATAOL AI Techs</p>
        <p style="margin:0 0 2px;font-size:11px;color:#888;">${l.svc_label}</p>
        <p style="margin:0 0 2px;font-size:12px;color:#666;">+90 532 201 3416</p>
        <p style="margin:0 0 4px;font-size:11px;color:#888;">Istanbul Technical University Technokent, Maslak, Istanbul TÜRKİYE</p>
        <p style="margin:0 0 4px;font-size:11px;">
          <a href="https://maps.google.com/?q=ARI+Teknokent+Resitpasa+Mah+Katar+Cad+No+4+34467+Maslak+Istanbul" style="color:#4285F4;text-decoration:none;font-size:11px;">📍 Google Maps</a>
          &nbsp;|&nbsp;
          <a href="https://maps.apple.com/?q=ARI+Teknokent+Resitpasa+Mah+Katar+Cad+No+4+34467+Maslak+Istanbul" style="color:#333;text-decoration:none;font-size:11px;">🗺️ Apple Maps</a>
        </p>
        <p style="margin:0;font-size:12px;">
          <a href="https://www.ataolai.tech" style="color:#1a1a2e;text-decoration:none;font-weight:600;">ataolai.tech</a>
          &nbsp;|&nbsp;<a href="https://strategythrust.com" style="color:#1976d2;text-decoration:none;">strategythrust.com</a>
          &nbsp;|&nbsp;<a href="https://actledger.com" style="color:#22d3ee;text-decoration:none;">actledger.com</a>
        </p>
      </td>
      <td style="vertical-align:middle;text-align:right;">
        <a href="${LINKEDIN_URL}" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
          <img src="${LINKEDIN_ICON}" alt="LinkedIn" style="height:16px;width:16px;" />
          <span style="color:#0a66c2;font-size:11px;">Follow us</span>
        </a>
      </td>
    </tr></table>
    <p style="margin:12px 0 0;font-size:10px;color:#aaa;font-style:italic;">${l.unsub}</p>
  </div>
</div>`;
}

// ---- Extract contact from research (prefer decision-maker over generic) ----
function extractContactFromResearch(research, lead) {
  // Try DECISION_MAKER first: "Full Name | Title | email@domain.com"
  const dmMatch = research.match(/DECISION_MAKER:\s*([^|]+)\|\s*([^|]+)\|\s*(\S+@\S+)/i);
  if (dmMatch) {
    const email = dmMatch[3].replace(/[.,;)>]+$/, '');
    const genericRe = /^(info|contact|hello|office|sales|business|press|legal|privacy|support|hcp|cs|memberservices|dataprotection|notifications)@/i;
    if (!genericRe.test(email)) {
      lead.contact_name = dmMatch[1].trim();
      lead.contact_title = dmMatch[2].trim();
      lead.contact_email = email;
      return email;
    }
  }
  // Fallback to CONTACT_EMAIL
  const ceMatch = research.match(/CONTACT_EMAIL:\s*(\S+@\S+)/i);
  if (ceMatch) return ceMatch[1].replace(/[.,;)>]+$/, '');
  // Last resort: any business email in the text
  const emailMatch = research.match(/(?:info|contact|hello|office|sales|business)@[\w.-]+\.\w{2,}/i);
  return emailMatch ? emailMatch[0] : '';
}

// ---- Find decision-maker via Gemini + Google Search ----
const GENERIC_RE = /^(info|contact|hello|office|sales|business|press|legal|privacy|support|hcp|cs|memberservices|dataprotection|notifications|ult|emko|kontakt|jobs|careers|hr|billing|finance|admin|marketing)@/i;

async function findDecisionMaker(companyName, website) {
  const domain = website ? website.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : '';

  const prompt = `Research the C-level executives (CEO, Founder, General Manager, Board Members, Managing Director, CTO, COO, CFO) of the company "${companyName}"${domain ? ' (' + domain + ')' : ''}.

We need to contact a decision-maker directly. Search LinkedIn, Google, Crunchbase, company about pages, and press releases to find:
1. Full name
2. Job title
3. Personal direct professional work email address (NOT a generic address like info@, hello@, contact@, sales@, etc.)
4. LinkedIn profile URL

IMPORTANT: Respond in this exact format, one field per line:
NAME: <full name>
TITLE: <job title>
EMAIL: <personal work email>
LINKEDIN: <linkedin url>

EMAIL RETRIEVAL STRATEGY:
- Try to find the exact direct work email of the person (e.g., name@domain.com, name.surname@domain.com).
- If you cannot find their email directly but found their name, guess the email pattern for the domain "${domain || 'company.com'}" (e.g., first.last@domain, first@domain, etc.) and perform a web search to verify it.
- If you cannot find a personal direct email, do NOT return a generic address under "EMAIL:". Write EMAIL: NONE.
- Do NOT return generic/department addresses starting with: info@, contact@, sales@, hello@, support@, office@, careers@, hr@, marketing@, jobs@, billing@.`;

  const resp = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'You are a professional B2B lead generation specialist. You search the web to find direct, personal corporate email addresses of C-level executives (Founders, Board Members, CEOs, General Managers, CTOs, COOs). You never return generic or department emails, and you write NONE if a direct email cannot be verified.' }]
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } }
      })
    },
    'Gemini Contact API'
  );

  const data = await resp.json();
  const parts = data.candidates[0].content.parts;
  const text = parts.filter(p => p.text).map(p => p.text).join('\n');

  const nameMatch = text.match(/NAME:\s*(.+)/i);
  const titleMatch = text.match(/TITLE:\s*(.+)/i);
  const emailMatch = text.match(/EMAIL:\s*(\S+@\S+)/i);
  const linkedinMatch = text.match(/LINKEDIN:\s*(https?:\/\/\S+)/i);

  const email = emailMatch ? emailMatch[1].replace(/[.,;)>]+$/, '') : null;
  if (!email || email === 'NONE' || GENERIC_RE.test(email)) return null;

  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    title: titleMatch ? titleMatch[1].trim() : null,
    email: email,
    linkedin: linkedinMatch ? linkedinMatch[1].trim() : null
  };
}

// ---- Main ----
async function main() {
  const serviceFilter = process.env.SERVICE || process.argv.find(arg => arg.startsWith('--service='))?.split('=')[1] || '';
  console.log(`[${new Date().toISOString()}] Starting outreach generation (batch: ${BATCH_SIZE}, service: ${serviceFilter || 'all'})`);

  const data = await readGist();
  const leads = data.leads || [];
  const emails = data.emails || [];
  console.log(`Current: ${leads.length} leads, ${emails.length} emails`);

  const emailLeadIds = new Set(emails.map(e => e.lead_id));
  let unprocessed = leads.filter(l => !emailLeadIds.has(l.id));
  
  if (serviceFilter === 'institute') {
    const originalCount = unprocessed.length;
    unprocessed = unprocessed.filter(l => !l.country || l.country === 'TR');
    console.log(`Filter applied for service 'institute': kept ${unprocessed.length} of ${originalCount} leads (filtered out known non-TR countries)`);
  }

  // Identify leads needing follow-ups
  const followUpLeads = [];
  const now = new Date();
  
  for (const lead of leads) {
    const leadEmails = emails.filter(e => e.lead_id === lead.id);
    if (leadEmails.length === 0) continue; // Needs initial email, handled in unprocessed
    
    // Sort emails by generation date
    leadEmails.sort((a, b) => new Date(a.generated_at) - new Date(b.generated_at));
    const lastEmail = leadEmails[leadEmails.length - 1];
    
    // Only follow-up if the last email was sent, and has no pending follow-ups
    if (lastEmail.status !== 'sent') continue;
    
    const daysSinceSent = (now - new Date(lastEmail.sent_at)) / (1000 * 60 * 60 * 24);
    
    // Follow-up interval: 4 days
    if (daysSinceSent >= 4) {
      if (lastEmail.email_type === 'initial') {
        followUpLeads.push({ lead, emailType: 'followup_1', prevSubject: lastEmail.subject });
      } else if (lastEmail.email_type === 'followup_1') {
        followUpLeads.push({ lead, emailType: 'followup_2', prevSubject: lastEmail.subject });
      }
    }
  }

  console.log(`Leads needing follow-ups: ${followUpLeads.length}`);
  console.log(`Unprocessed leads (initial): ${unprocessed.length}`);

  // Build the batch (prioritize follow-ups first)
  const batch = [];
  
  // 1. Add follow-up leads
  for (const item of followUpLeads) {
    if (batch.length >= BATCH_SIZE) break;
    batch.push({
      lead: item.lead,
      emailType: item.emailType,
      prevSubject: item.prevSubject
    });
  }
  
  // 2. Add unprocessed leads
  if (batch.length < BATCH_SIZE) {
    const remainingCount = BATCH_SIZE - batch.length;
    const unprocessedBatch = unprocessed.slice(0, remainingCount);
    for (const lead of unprocessedBatch) {
      batch.push({
        lead,
        emailType: 'initial',
        prevSubject: ''
      });
    }
  }

  console.log(`Processing batch of ${batch.length}: ${batch.map(item => `${item.lead.company_name} (${item.emailType})`).join(', ')}`);

  let generated = 0;
  let skipped = 0;
  let hasUpdates = false;
  for (const item of batch) {
    const { lead, emailType, prevSubject } = item;
    try {
      console.log(`\n--- ${lead.company_name} (${emailType}) ---`);

      let research = '';
      let detectedCountry = lead.country || 'INT';

      if (emailType === 'initial') {
        // Step 1: Find decision-maker FIRST (1 Gemini call)
        console.log('  Step 1: Finding decision-maker...');
        const dm = await findDecisionMaker(lead.company_name, lead.website);

        if (!dm) {
          console.log('  SKIPPED: No decision-maker email found. Saving tokens.');
          skipped++;
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        console.log(`  Found: ${dm.name} (${dm.title}) <${dm.email}>`);
        lead.contact_name = dm.name;
        lead.contact_email = dm.email;
        lead.contact_title = dm.title;
        if (dm.linkedin) lead.contact_linkedin = dm.linkedin;
        hasUpdates = true;

        // Step 2: Research company (1 Gemini call)
        console.log('  Step 2: Researching company...');
        research = await researchCompany(lead);
        console.log('  Research complete.');

        detectedCountry = detectCountryFromResearch(research);
        console.log(`  Detected Country: ${detectedCountry}`);

        // If service is 'institute' and company is not in Turkey (TR), skip email generation
        if (serviceFilter === 'institute' && detectedCountry !== 'TR') {
          console.log(`  SKIPPED: Country is ${detectedCountry} (not TR) and service is 'institute'. Updating country and skipping email generation.`);
          lead.country = detectedCountry;
          hasUpdates = true;
          skipped++;
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
      } else {
        console.log(`  Reusing contact details: ${lead.contact_name} <${lead.contact_email}>`);
        // Mini research text using lead database fields for followup context
        research = `Company Summary: ${lead.company_summary || ''}
Pain Points: ${lead.pain_points || '[]'}
Service Match: ${lead.service_match || '[]'}`;
      }

      // Step 3: Generate email (1 Gemini call)
      console.log(`  Step 3: Generating email (${emailType})...`);
      const detectedLang = COUNTRY_LANGCODE[detectedCountry] || 'en';
      const result = await generateEmail(lead, research, detectedCountry, detectedLang, emailType, prevSubject);
      console.log('  Email generated.');

      // Update lead details if it was an initial research
      if (emailType === 'initial') {
        const leadResult = result.lead;
        lead.company_summary = leadResult.company_summary;
        lead.industry = leadResult.industry || lead.industry;
        lead.company_size = leadResult.company_size;
        lead.country = leadResult.country || lead.country;
        lead.pain_points = JSON.stringify(leadResult.pain_points || []);
        lead.service_match = JSON.stringify(leadResult.service_match || []);
      }

      // Build email HTML
      const ed = result.email;
      const finalCountry = lead.country || detectCountryFromResearch(research);
      const lang = ed.language || COUNTRY_LANGCODE[finalCountry] || 'en';
      const tzOffset = COUNTRY_TZ[finalCountry] || 0;
      const queryParams = new URLSearchParams({
        company: lead.company_name,
        tz: tzOffset,
        lang: lang,
        summary: lead.company_summary || '',
        pain_points: lead.pain_points || '[]',
        services: lead.service_match || '[]',
        name: lead.contact_name || '',
        email: lead.contact_email || ''
      });
      ed._booking_url = `https://sertacgul.github.io/ataol-dashboard/book.html?${queryParams.toString()}`;
      ed.body_html = buildEmailHtml(ed, lang, emailType);
      ed.body_text = ed.body_html.replace(/<[^>]*>/g, '');

      const newEmail = {
        lead_id: lead.id,
        to_email: lead.contact_email,
        to_name: lead.contact_name,
        from_email: 'sertacgul@ataolai.tech',
        subject: ed.subject,
        body_html: ed.body_html,
        body_text: ed.body_text,
        language: ed.language || 'en',
        email_type: emailType,
        status: 'pending_review',
        generated_at: new Date().toISOString()
      };
      emails.push(newEmail);
      generated++;
      console.log(`  OK (${emailType}): "${ed.subject}" (${lang}) -> ${lead.contact_email}`);

      // Rate limit: Gemini free tier = 15 RPM
      await new Promise(r => setTimeout(r, 5000));
    } catch (err) {
      console.error(`  FAILED for ${lead.company_name}: ${err.message}`);
    }
  }

  if (generated > 0 || hasUpdates) {
    data.leads = leads;
    data.emails = emails;
    data.updated_at = new Date().toISOString();
    await writeGist(data);
    console.log(`\nWrote ${generated} new emails and updated lead info in Gist.`);
  }

  console.log(`\nDone. Generated: ${generated}, Skipped (no contact): ${skipped}, Failed: ${batch.length - generated - skipped}. Remaining queue: ${unprocessed.length - batch.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
