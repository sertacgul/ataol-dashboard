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

Kendi platformlarimiz:
1. StrategyThrust - Stratejik Karar Destek Platformu:
- 72 saat icinde geleneksel danismanligin 3-6 aylik isini tamamlar
- Geleneksel yonetim danismanliginin yaklasik 150'de 1 fiyatina ayni kalitede cikti
- Sektor analizi, rekabet konumlandirmasi, pazar dinamikleri ve stratejik projeksiyonlar

2. ActLedger - Operasyonel Mukemmellik Sistem Platformu:
- 15 sektor, 576+ departman, 7800+ hazir KPI - dunyanin en kapsamli sektor-spesifik KPI kutuphanesi
- 5 katmanli performans olcum cercevesi (Performance, Quality, Time, Risk, AI Insight)
- Dakikalar icinde tam operasyonel cerceve kurulumu
- Saha operasyonlari, envanter, is akislari, otomasyon, IoT entegrasyonu
- Mobil-first: iOS native app + PWA
- Kampanya: 3 aylik lisans alanlara +1 ay ucretsiz | Yillik lisans alanlara %15 indirim

Kurumsal hizmetlerimiz:
- Otomasyon cozumleri, mobil uygulama gelistirme (iOS/Android), web uygulama gelistirme

ATAOL AI Institute - Kurumsal egitim programlari

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

const LOGO_URL = 'https://sertacgul.github.io/ataol-dashboard/ataol-logo.png';
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
async function generateEmail(lead, research) {
  const name = lead.company_name;
  const email = lead.contact_email || lead.email || '';
  const contactName = lead.contact_name || '';
  const contactTitle = lead.contact_title || '';
  const website = lead.website || '';
  const notes = lead.notes || '';

  const prompt = `You write corporate business development emails for ATAOL AI Techs.
${ATAOL_INFO}

LANGUAGE RULES - THIS IS THE MOST IMPORTANT RULE:
1. First, determine the company's country from the research data below.
2. Set "country" field to the 2-letter country code.
3. Then write ALL email fields in that country's primary business language:
   - TR -> Turkish ("tr"), DE/AT/CH -> German ("de"), FR/BE -> French ("fr")
   - ES/MX/AR/CO/CL -> Spanish ("es"), IT -> Italian ("it"), PT/BR -> Portuguese ("pt")
   - NL -> Dutch ("nl"), JP -> Japanese ("ja"), KR -> Korean ("ko")
   - SA/EG -> Arabic ("ar"), All others -> English ("en")
4. CRITICAL: ALL email fields must be in the determined language.
5. Use formal business register appropriate for that language's corporate culture.
6. GREETING: Use standard formal greeting. If contact name is known, address by name. NEVER use placeholder brackets.
7. For Turkish companies: fill "institute_note". For others: empty string "".
8. NEVER use "AI", "yapay zeka", or "artificial intelligence".
9. Em-dash/en-dash forbidden, use only short hyphen (-).
10. McKinsey/BCG/Bain corporate tone.
11. 72 hours and 1/150 cost advantage: mention each ONLY ONCE.
12. Campaign details ONLY in ActLedger section, NOT in closing.
13. Include real facts from the research.

--- FIRMA BILGILERI ---
Firma: ${name}
${website ? 'Website: ' + website : ''}
${email ? 'Iletisim email: ' + email : ''}
${contactName ? 'Karar verici: ' + contactName + (contactTitle ? ' (' + contactTitle + ')' : '') : ''}
${notes ? 'Ek bilgi: ' + notes : ''}

--- COMPANY RESEARCH ---
${research}
--- END RESEARCH ---

Respond ONLY in valid JSON (no markdown, no code blocks):
{
  "lead": {
    "company_name": "...", "company_summary": "2-3 sentences",
    "industry": "...", "company_size": "small/medium/large",
    "country": "XX", "pain_points": ["..."], "service_match": ["..."]
  },
  "email": {
    "subject": "max 60 chars", "language": "xx",
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
function buildEmailHtml(d, lang) {
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
const GENERIC_RE = /^(info|contact|hello|office|sales|business|press|legal|privacy|support|hcp|cs|memberservices|dataprotection|notifications|ult|emko|kontakt)@/i;

async function findDecisionMaker(companyName, website) {
  const domain = website ? website.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : '';

  const prompt = `Find the CEO, founder, managing director, or CTO of "${companyName}"${domain ? ' (' + domain + ')' : ''}.

I need their:
1. Full name
2. Job title
3. Professional email address (NOT info@, contact@, or generic addresses — their personal work email)
4. LinkedIn profile URL

Search LinkedIn, company website, Crunchbase, press releases, and news articles.

IMPORTANT: Respond in this exact format, one field per line:
NAME: <full name>
TITLE: <job title>
EMAIL: <personal work email>
LINKEDIN: <linkedin url>

If you cannot find a personal email, try the common pattern: firstname@${domain || 'company.com'} or firstname.lastname@${domain || 'company.com'}.
If you truly cannot determine any email, write EMAIL: NONE.
Do NOT return info@, contact@, hello@, support@, or any generic address.`;

  const resp = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'You find real decision-makers at companies using web search. Return verified information only. Never fabricate emails — if unsure, say NONE.' }]
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
  console.log(`[${new Date().toISOString()}] Starting daily outreach generation (batch: ${BATCH_SIZE})`);

  const data = await readGist();
  const leads = data.leads || [];
  const emails = data.emails || [];
  console.log(`Current: ${leads.length} leads, ${emails.length} emails`);

  const emailLeadIds = new Set(emails.map(e => e.lead_id));
  const unprocessed = leads.filter(l => !emailLeadIds.has(l.id));
  console.log(`Unprocessed leads: ${unprocessed.length}`);

  if (unprocessed.length === 0) {
    console.log('No unprocessed leads remaining. Exiting.');
    return;
  }

  const batch = unprocessed.slice(0, BATCH_SIZE);
  console.log(`Processing batch of ${batch.length}: ${batch.map(l => l.company_name).join(', ')}`);

  let generated = 0;
  let skipped = 0;
  for (const lead of batch) {
    try {
      console.log(`\n--- ${lead.company_name} ---`);

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

      // Step 2: Research company (1 Gemini call)
      console.log('  Step 2: Researching company...');
      const research = await researchCompany(lead);
      console.log('  Research complete.');

      // Step 3: Generate email (1 Gemini call)
      console.log('  Step 3: Generating email...');
      const result = await generateEmail(lead, research);
      console.log('  Email generated.');

      // Update lead with research data
      const leadResult = result.lead;
      lead.company_summary = leadResult.company_summary;
      lead.industry = leadResult.industry || lead.industry;
      lead.company_size = leadResult.company_size;
      lead.country = leadResult.country || lead.country;
      lead.pain_points = JSON.stringify(leadResult.pain_points || []);
      lead.service_match = JSON.stringify(leadResult.service_match || []);

      // Build email HTML
      const ed = result.email;
      const finalCountry = leadResult.country || detectCountryFromResearch(research);
      const lang = ed.language || COUNTRY_LANGCODE[finalCountry] || 'en';
      const tzOffset = COUNTRY_TZ[finalCountry] || 0;
      ed._booking_url = `https://sertacgul.github.io/ataol-dashboard/book.html?company=${encodeURIComponent(lead.company_name)}&tz=${tzOffset}&lang=${lang}`;
      ed.body_html = buildEmailHtml(ed, lang);
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
        email_type: 'initial',
        status: 'pending_review',
        generated_at: new Date().toISOString()
      };
      emails.push(newEmail);
      generated++;
      console.log(`  OK: "${ed.subject}" (${lang}) -> ${lead.contact_email}`);

      // Rate limit: Gemini free tier = 15 RPM
      await new Promise(r => setTimeout(r, 5000));
    } catch (err) {
      console.error(`  FAILED for ${lead.company_name}: ${err.message}`);
    }
  }

  if (generated > 0) {
    data.leads = leads;
    data.emails = emails;
    data.updated_at = new Date().toISOString();
    await writeGist(data);
    console.log(`\nWrote ${generated} new emails to Gist.`);
  }

  console.log(`\nDone. Generated: ${generated}, Skipped (no contact): ${skipped}, Failed: ${batch.length - generated - skipped}. Remaining queue: ${unprocessed.length - batch.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
