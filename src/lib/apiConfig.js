// API yapılandırması.
//
// Boş taban adres = yerel mod (localStorage). Varsayılan bu; demo hiçbir
// ayar yapılmadan çalışır. Gerçek API'ye geçmek için build zamanında:
//   VITE_LINEPULSE_API=https://platform.enerpulse.tech/linepulseApi/api
//
// KRİTİK KISIT: LinePulse kimlik doğrulamayı cookie/session ile yapıyor.
// Tarayıcı çapraz-origin isteklerde bu cookie'yi göndermez. Yani uygulama
// GitHub Pages'ten (batikanakdenizz.github.io) servis edildiği sürece gerçek
// API'ye BAĞLANAMAZ — entegrasyon ancak uygulama platform.enerpulse.tech
// altından servis edildiğinde çalışır.

export const API_BASE = (import.meta.env?.VITE_LINEPULSE_API ?? '').replace(/\/+$/, '')

export const isApiMode = () => API_BASE.length > 0
