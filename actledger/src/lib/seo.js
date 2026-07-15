// Set per-page SEO head tags at runtime. The prerender (Puppeteer) captures
// the final DOM, so these end up in the static HTML that Google crawls.

function setMeta(name, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setProperty(prop, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[property="${prop}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', prop)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  if (!href) return
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function setSeo({ title, description, canonical, jsonLd }) {
  if (title) document.title = title
  setMeta('description', description)
  setProperty('og:title', title)
  setProperty('og:description', description)
  if (canonical) setProperty('og:url', canonical)
  setCanonical(canonical)

  document.querySelectorAll('script[data-seo-jsonld]').forEach(n => n.remove())
  const items = Array.isArray(jsonLd) ? jsonLd : (jsonLd ? [jsonLd] : [])
  for (const obj of items) {
    const s = document.createElement('script')
    s.type = 'application/ld+json'
    s.setAttribute('data-seo-jsonld', '1')
    s.textContent = JSON.stringify(obj)
    document.head.appendChild(s)
  }
}
