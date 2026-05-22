#!/usr/bin/env node
// Contact enrichment: finds decision-maker emails for today's generic contacts.
// Does NOT regenerate email content — only updates to_email, to_name, and
// lead.contact_* fields in the Gist.
//
// Usage: node scripts/enrich-contacts.mjs [--date 2026-05-22]
//
// Required env vars: GEMINI_API_KEY, GIST_TOKEN

const GIST_ID = '3a783c6e0d525a36da50cc4821e55552';
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GIST_TOKEN = process.env.GIST_TOKEN;

if (!GEMINI_KEY || !GIST_TOKEN) {
  console.error('Missing required env vars: GEMINI_API_KEY, GIST_TOKEN');
  process.exit(1);
}

const dateArg = process.argv.includes('--date')
  ? process.argv[process.argv.indexOf('--date') + 1]
  : new Date().toISOString().slice(0, 10);

const GENERIC_RE = /^(info|contact|hello|office|sales|business|press|legal|privacy|support|hcp|cs|memberservices|dataprotection|ult|emko|kontakt|notifications)@/i;

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

// ---- Retry wrapper ----
async function fetchWithRetry(url, options, label, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fetch(url, options);
    if (resp.ok) return resp;
    if ((resp.status === 429 || resp.status === 503) && attempt < maxRetries) {
      const wait = Math.pow(3, attempt + 1) * 2000;
      console.log(`    ${label} ${resp.status}, retry ${attempt + 1}/${maxRetries} in ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    const errBody = await resp.text();
    throw new Error(`${label} ${resp.status}: ${errBody.substring(0, 200)}`);
  }
}

// ---- Find decision-maker via Gemini + Google Search ----
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
  console.log(`[${new Date().toISOString()}] Contact enrichment for date: ${dateArg}`);

  const data = await readGist();
  const leads = data.leads || [];
  const emails = data.emails || [];

  // Find today's emails with generic addresses
  const todayEmails = emails.filter(e =>
    e.generated_at && e.generated_at.startsWith(dateArg) &&
    (GENERIC_RE.test(e.to_email) || !e.to_email)
  );

  console.log(`Found ${todayEmails.length} emails needing enrichment`);
  if (todayEmails.length === 0) return;

  let enriched = 0;
  for (const email of todayEmails) {
    const lead = leads.find(l => l.id === email.lead_id);
    if (!lead) continue;

    try {
      console.log(`\n--- ${lead.company_name} ---`);
      console.log(`  Current: ${email.to_email || 'none'}`);

      const dm = await findDecisionMaker(lead.company_name, lead.website);
      if (dm) {
        console.log(`  Found: ${dm.name} (${dm.title}) <${dm.email}>`);
        // Update lead
        lead.contact_name = dm.name;
        lead.contact_email = dm.email;
        lead.contact_title = dm.title;
        if (dm.linkedin) lead.contact_linkedin = dm.linkedin;
        // Update email record
        email.to_email = dm.email;
        email.to_name = dm.name;
        enriched++;
      } else {
        console.log('  No decision-maker found.');
      }

      // Rate limit: 15 RPM
      await new Promise(r => setTimeout(r, 5000));
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
    }
  }

  if (enriched > 0) {
    data.leads = leads;
    data.emails = emails;
    data.updated_at = new Date().toISOString();
    await writeGist(data);
    console.log(`\nUpdated ${enriched}/${todayEmails.length} contacts in Gist.`);
  } else {
    console.log('\nNo contacts enriched.');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
