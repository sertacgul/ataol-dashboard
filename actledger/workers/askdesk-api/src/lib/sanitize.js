// Remove markdown formatting artifacts and normalize dashes from AI-generated
// text so outputs (emails, competitor analysis, posts, etc.) read as clean plain
// text with no *, markdown # headings, or em/en dashes.
//
// Inline hashtags (#word, e.g. social media tags) are preserved on purpose;
// only markdown heading markers ("# Title", "## Title") are stripped.
export function cleanAiText(text) {
  if (typeof text !== 'string') return text
  return text
    .replace(/\r\n/g, '\n')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')     // "## Başlık" -> "Başlık"
    .replace(/\*\*([^*]+)\*\*/g, '$1')      // **kalın** -> kalın
    .replace(/\*([^*\n]+)\*/g, '$1')        // *italik* -> italik
    .replace(/^[ \t]*\*[ \t]+/gm, '- ')     // "* madde" -> "- madde"
    .replace(/\*/g, '')                     // kalan tüm yıldızlar
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')  // `kod` -> kod
    .replace(/`/g, '')                      // kalan backtick
    .replace(/[—–]/g, '-')        // em/en dash -> tire
    .replace(/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F0FF}️]/gu, '') // emoji temizle
    .replace(/[ \t]+\n/g, '\n')             // satır sonu boşlukları
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
