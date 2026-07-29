import { mapSeniority } from './normalize.js'

const BASE = 'https://api.prospeo.io'

// Prospeo job_history seniority -> AskDesk vocab (SENIORITY_RANK in index.js).
// Unmapped values fall through to classifySeniority(title).
const PROSPEO_SENIORITY = {
  'C-Suite': 'C-Level', 'Owner': 'C-Level', 'Partner': 'C-Level', 'Founder': 'C-Level',
  'VP': 'VP', 'Director': 'Director', 'Head': 'Director', 'Manager': 'Manager',
  'Senior': 'Staff', 'Entry': 'Staff', 'Intern': 'Staff', 'Training': 'Staff',
}

export function createProspeoProvider(apiKey, { classifySeniority, classifyDepartment }) {
  async function call(path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-KEY': apiKey },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = new Error(`prospeo ${res.status}`)
      err.status = res.status
      throw err
    }
    const data = await res.json()
    if (data && data.error) {
      const err = new Error('prospeo api error')
      err.status = res.status
      throw err
    }
    return data
  }

  // Pull the current (or first) job entry for title/seniority/department signals.
  function currentJob(person) {
    const jobs = person.job_history || []
    return jobs.find(j => j.current) || jobs[0] || {}
  }

  function mapPerson(entry) {
    const person = entry.person || {}
    const job = currentJob(person)
    const title = person.current_job_title || job.title || ''
    const name = person.full_name || [person.first_name, person.last_name].filter(Boolean).join(' ')
    const mappedSeniority = PROSPEO_SENIORITY[job.seniority] || classifySeniority(title)
    return {
      first_name: person.first_name || '',
      last_name: person.last_name || '',
      name,
      title,
      // Prospeo's raw department vocabulary is unknown until the Task 4 live
      // probe; classify from title for now and add a PROSPEO_DEPARTMENT map later.
      department: classifyDepartment(title),
      // mappedSeniority is already in AskDesk vocab; mapSeniority just returns it
      // (first arg null — no raw Hunter seniority to consult here).
      seniority: mapSeniority(null, mappedSeniority),
      email: null,               // Prospeo search does not return emails
      email_type: 'personal',
      confidence: 0,
      phone: null,
      linkedin: person.linkedin_url || null,
      sources: [],
      verification_status: null,
      prospeo_person_id: person.person_id || null,
      source: 'prospeo',
    }
  }

  // enrich-person returns a masked email ("a.****@x.com") when no credit is
  // spent / privacy applies. Reject those: only a real, unmasked address counts.
  function extractEmail(data) {
    const em = data?.person?.email
    if (!em || em.status !== 'VERIFIED') return null
    const value = em.email
    if (!value || value.includes('*')) return null
    return value
  }

  return {
    async domainSearch(domain) {
      const data = await call('/search-person', {
        page: 1,
        filters: { company: { websites: { include: [domain] } } },
      })
      const results = data?.results || []
      const people = results.map(mapPerson)
      const firstCompany = results[0]?.company || {}
      const company = {
        name: firstCompany.name || domain,
        domain,
        description: '',
        sector: firstCompany.industry || '',
        location: [firstCompany.city, firstCompany.country].filter(Boolean).join(', '),
        employee_count: '',
        company_phones: [],
        mx_valid: true,
      }
      return { company, people }
    },

    async revealEmail(person) {
      if (!person?.prospeo_person_id) return null
      const data = await call('/enrich-person', {
        data: { person_id: person.prospeo_person_id },
        only_verified_email: true,
      })
      const email = extractEmail(data)
      if (!email) return null
      return { email, verification_status: 'verified', confidence: 90, source: 'prospeo' }
    },

    async findEmail(firstName, lastName, domain) {
      const data = await call('/enrich-person', {
        data: { first_name: firstName, last_name: lastName, company_website: domain },
        only_verified_email: true,
      })
      const email = extractEmail(data)
      if (!email) return null
      return { email, confidence: 90, source: 'prospeo' }
    },
  }
}
