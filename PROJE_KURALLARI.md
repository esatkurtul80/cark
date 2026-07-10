# Proje Kuralları & Ortam Notları

## Ortam
- **Tablet:** Android tablet + **Fully Kiosk Browser** (kiosk modu)
- **Admin Paneli:** PC'den normal masaüstü tarayıcı (Chrome/Edge)
- **Hosting:** Firebase Hosting → `https://tugba-cark.web.app`
- **Backend:** Firebase Firestore (NoSQL)

## Fully Kiosk Browser Kısıtlamaları & Davranışları
- HTML5 History API (`pushState`, `replaceState`) güvenilir çalışmaz → **Hash tabanlı routing kullanılmalı** (`#/`, `#/admin`)
- Hash değişimi (`window.location.hash = ...`) sayfa yenilemeye neden olabilir → **URL değiştirmeden React state toggle tercih edilmeli**
- Android sanal klavyesi açılınca viewport küçülür, sayfa yukarı kayar → **`position: fixed` navbar ve `visualViewport` ile scroll sıfırlama gerekli**
- `localStorage` çalışır ve session kalıcıdır
- Kiosk modunda `confirm()` / `alert()` diyaloglar görünmeyebilir

## Routing Mimarisi
- **Hash tabanlı routing** (`#/`, `#/admin`, `#/admin/login`)
- Admin çark önizlemesi URL değiştirmeden `adminPreviewWheel` React state ile yapılır
- Admin giriş session'ı: `localStorage.setItem('admin_session', 'true')`
- Mağaza giriş session'ı: `localStorage.setItem('store_session', JSON.stringify({...}))`

## Bileşen Yapısı
```
App.jsx              → Router, session yönetimi
├── Login.jsx        → Gateway seçimi, mağaza/admin girişi
├── Wheel.jsx        → Çark ekranı (tablet mağaza kullanımı)
│   └── isAdminPreview prop → Admin önizleme modu
│   └── onBackToAdmin prop  → Admin paneline dön (URL değiştirmez)
└── Admin.jsx        → Yönetici paneli (PC kullanımı)
    └── onPreviewWheel prop → Önizleme modunu aç
```

## Bilinen Sorunlar & Çözümler
| Sorun | Çözüm |
|-------|-------|
| Admin girişte "takılı kalıyor" | `localStorage.setItem('admin_session','true')` login sırasında çağrılmalı |
| Fully Kiosk hash navigasyon sorunu | React state ile navigate et, URL değiştirme |
| Sanal klavye açılınca navbar kaçıyor | Navbar `position: fixed`, `visualViewport` ile scroll sıfırla |

## Deploy Akışı & Otomatik Güncelleme (60 Saniye Kuralı)
```bash
npm run build   # public/version.json dosyasına yeni build zaman damgası yazılır
firebase deploy # Firebase Hosting üzerine yeni kodlar yüklenir
```

> [!IMPORTANT]
> **60 Saniye Güncelleme Kuralı:** 
> - Tabletlerde ve televizyonlarda tarayıcı önbelleğini (cache) manuel temizlemek mümkün olmadığından, uygulama arka planda **her 60 saniyede bir** `/version.json` dosyasını sunucudan (`no-store` önbelleksiz HTTP başlıkları ile) kontrol eder.
> - Eğer sunucudaki versiyon (timestamp) yerelde olandan farklı ise tarayıcıda otomatik olarak **hard reload (`window.location.reload()`)** tetiklenir.
> - Bu mekanizma sayesinde deploy yapıldıktan sonra en geç 60 saniye içerisinde tüm cihazlar otomatik olarak en güncel kodları yükler. Geliştirmeler sırasında bu mekanizmanın korunması zorunludur.

## Geliştirme Notları
- UI bileşenleri için harici kütüphane yok (vanilla React + CSS)
- Tasarım dili: glassmorphism, yeşil/altın renk paleti
- Font: Outfit (başlıklar), Inter (metin)
- CSS değişkenleri: `--yesil`, `--koyu-yesil`, `--altin`, `--krem`, `--kirmizi`, `--pembe`
