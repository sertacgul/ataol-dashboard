const FROM_EMAIL = 'AskDesk <info@ataolai.tech>'

export async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email send')
    return { ok: false, error: 'Email service not configured' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Email send failed:', err)
    return { ok: false, error: err }
  }

  return { ok: true }
}

export function passwordResetEmail(name, resetCode) {
  return {
    subject: 'AskDesk - Şifre Sıfırlama Kodu',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: #2563EB; border-radius: 8px; padding: 8px 12px;">
            <span style="color: white; font-weight: bold; font-size: 16px;">AskDesk</span>
          </div>
        </div>
        <p style="color: #111827; font-size: 15px;">Merhaba ${name},</p>
        <p style="color: #6B7280; font-size: 14px;">Şifre sıfırlama talebiniz alındı. Aşağıdaki kodu kullanarak yeni şifrenizi belirleyebilirsiniz:</p>
        <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
          <span style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #2563EB;">${resetCode}</span>
        </div>
        <p style="color: #6B7280; font-size: 13px;">Bu kod 30 dakika geçerlidir. Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">ATAOL AI Techs - askdesk.app</p>
      </div>
    `,
  }
}

export function welcomeEmail(name, trialEndDate) {
  const formattedDate = new Date(trialEndDate).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  return {
    subject: 'AskDesk\'e Hoş Geldiniz!',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: #2563EB; border-radius: 8px; padding: 8px 12px;">
            <span style="color: white; font-weight: bold; font-size: 16px;">AskDesk</span>
          </div>
        </div>
        <p style="color: #111827; font-size: 15px;">Merhaba ${name},</p>
        <p style="color: #6B7280; font-size: 14px;">AskDesk'e hoş geldiniz! 14 günlük ücretsiz deneme süreniz başladı.</p>
        <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #1D4ED8; font-size: 14px; margin: 0;"><strong>Deneme süreniz:</strong> ${formattedDate} tarihine kadar</p>
          <p style="color: #6B7280; font-size: 13px; margin: 8px 0 0 0;">Deneme süresi sonunda seçtiğiniz plana göre ödeme otomatik olarak alınacaktır.</p>
        </div>
        <p style="color: #6B7280; font-size: 14px;">Hemen başlamak için:</p>
        <ul style="color: #6B7280; font-size: 14px; padding-left: 20px;">
          <li>Firma profilinizi oluşturun</li>
          <li>Leadlerinizi ekleyin</li>
          <li>İlk outreach kampanyanızı başlatın</li>
        </ul>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://askdesk.app/login" style="display: inline-block; background: #2563EB; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px; font-weight: 500;">Hemen Başla</a>
        </div>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">ATAOL AI Techs - askdesk.app</p>
      </div>
    `,
  }
}

export function trialExpiryReminderEmail(name, daysLeft) {
  return {
    subject: `AskDesk - Deneme sürenizin bitmesine ${daysLeft} gün kaldı`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: #2563EB; border-radius: 8px; padding: 8px 12px;">
            <span style="color: white; font-weight: bold; font-size: 16px;">AskDesk</span>
          </div>
        </div>
        <p style="color: #111827; font-size: 15px;">Merhaba ${name},</p>
        <p style="color: #6B7280; font-size: 14px;">Ücretsiz deneme sürenizin bitmesine <strong>${daysLeft} gün</strong> kaldı. Deneme süresi sonunda seçtiğiniz plana göre ödeme otomatik olarak alınacaktır.</p>
        <p style="color: #6B7280; font-size: 14px;">Kesintisiz erişim için planınızı şimdi yükseltin:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://askdesk.app/app/settings" style="display: inline-block; background: #2563EB; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px; font-weight: 500;">Planımı Yükselt</a>
        </div>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">ATAOL AI Techs - askdesk.app</p>
      </div>
    `,
  }
}
