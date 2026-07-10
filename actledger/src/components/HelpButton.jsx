import { Link } from 'react-router-dom'

export default function HelpButton({ section }) {
  return (
    <Link
      to={`/app/guide#${section}`}
      className="fixed bottom-6 right-6 w-10 h-10 bg-[#2563EB] text-white rounded-full flex items-center justify-center text-sm font-semibold hover:bg-[#1D4ED8] shadow-md z-50"
      title="Yardim"
    >
      ?
    </Link>
  )
}
