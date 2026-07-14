# 🎡 Tuğba Kuruyemiş Hediye Çarkı — Versiyon Geçmişi

> **Proje:** `cark` · **Firebase Project ID:** `tugba-cark`
> **Platform:** React + Vite · **Deployment:** Firebase Hosting
> **Otomatik Versiyon:** `/public/version.json` (her build'de güncellenir)

---

## [v1.0.0] — 2026-07-10

**Commit:** `344e9e6` · **Tag:** `release/v1.0.0`

### ✨ Yeni Özellikler

- **Ekran Koruyucu (Screensaver)**
  30 saniye dokunulmadığında devreye giren, Ken Burns efektli ürün tanıtım slaytı.
  Antep Fıstığı · Gül Lokumu · Türk Kahvesi · Gurme Kuruyemiş görselleri içerir.

- **Otomatik Sürüm Kontrolü (Hard Reload)**
  `/version.json` üzerinden her 60 saniyede bir yeni deploy kontrolü yapılır.
  Yeni sürüm algılandığında kiosk cihazı önbelleği temizleyerek otomatik yenilenir.

- **Admin Çark Önizlemesi**
  Yöneticiler çark ayarlarını URL değiştirmeden, canlı olarak test edebilir.

### 🔄 Değişiklikler ve İyileştirmeler

- **Hash Routing Geçişi** — Fully Kiosk Browser uyumluluğu için `#/`, `#/admin`, `#/login`
- **Firestore Gerçek Zamanlı Güncelleme** — `onSnapshot` ile anlık senkronizasyon
- **Ses Efektleri ve AudioContext** — Gerçekçi mekanik tıklama sesi; autoplay block çözümü
- **Giriş ve Oturum Yönetimi** — Mağaza/admin oturumları ayrıştırıldı, güvenli çıkış
- **Mobil Klavye Optimizasyonu** — `inputMode="numeric"` ile sayısal klavye
- **Premium Glassmorphism Tasarımı** — Kurumsal yeşil (`--yesil`) + altın sarısı (`--altin`)

### 🐛 Düzeltmeler

- AudioContext ilk etkileşimde kilit açma ve otomatik başlatma
- `onSnapshot` canlı güncelleme yeniden etkinleştirildi, logout state temizlendi
- Hash routing ile yeşil ekran (green screen) sorunu giderildi
- JSON session parse hataları güvence altına alındı
- Fiş numarası zorunlu doğrulama ve yalnızca rakam kısıtlaması

---

## [v0.x — Geliştirme Aşaması] — 2026-06-15 → 2026-07-09

| Commit | Açıklama |
|--------|----------|
| `9ac35b5` | Firebase entegrasyonu ve Vite React SPA yapısı kurulumu |
| `60bad24` | Firestore güvenlik kuralları (`firestore.rules`) |
| `7c5132b` | Birleşik giriş seçim ekranı (ikonlarla) |
| `0ea8199` | Büyük çark bölünmüş ekran (split screen) düzeni |
| `46e8d00` | `/login` route kaldırıldı, doğrudan kök yolu ağ geçidi |
| `a00ad8d` | Hoşgeldin sayfası + Web Audio API sentezleyici |
| `30a9307` | Tuğba Kuruyemiş Hediye Çarkı ilk tasarım |
| `0be64ca` | İlk commit |

---

## 📦 Build & Deploy

```bash
# Üretim build oluştur
npm run build

# Firebase Hosting yayınla
firebase deploy --only hosting

# Yalnızca Firestore kurallarını güncelle
firebase deploy --only firestore:rules
```

## 🔗 Bağlantılar

- **Firebase Console:** https://console.firebase.google.com/project/tugba-cark
- **Hosting URL:** https://tugba-cark.web.app
- **Proje Dizini:** `c:\Users\PC\Desktop\cark`
