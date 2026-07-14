const styles = {
  draft: 'bg-[#F3F4F6] text-[#374151]',
  pending: 'bg-[#FEF3C7] text-[#92400E]',
  approved: 'bg-[#DCFCE7] text-[#166534]',
  sent: 'bg-[#DBEAFE] text-[#1E40AF]',
  rejected: 'bg-[#FEE2E2] text-[#991B1B]',
}

const labels = {
  draft: 'Taslak',
  pending: 'Beklemede',
  approved: 'Onaylı',
  sent: 'Gönderildi',
  rejected: 'Reddedildi',
}

export default function Badge({ status }) {
  return (
    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  )
}
