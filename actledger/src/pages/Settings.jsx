import { useAuth } from '../contexts/AuthContext'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-base font-semibold text-[#111827] mb-4">Ayarlar</h1>
      <div className="bg-white border border-[#E5E7EB] rounded-md p-6 max-w-md">
        <div className="text-xs font-semibold text-[#374151] mb-4">Hesap Bilgileri</div>
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">Ad</div>
            <div className="text-sm text-[#111827]">{user?.name || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">Email</div>
            <div className="text-sm text-[#111827]">{user?.email || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">Şirket</div>
            <div className="text-sm text-[#111827]">{user?.company_name || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">Rol</div>
            <div className="text-sm text-[#111827]">{user?.role || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">Kayıt Tarihi</div>
            <div className="text-sm text-[#111827]">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
