# Changelog

Tüm sürüm değişiklikleri ve güncellemeler bu dosyada takip edilmektedir.

---

## [1.0.0] - 2026-07-10

### Eklenen Özellikler
* **Ekran Koruyucu (Screensaver):** 30 saniye boyunca ekrana dokunulmadığında devreye giren, Ken Burns efekti içeren ve Tuğba Kuruyemiş spesiyallerini (Antep Fıstığı, Gül Lokumu, Türk Kahvesi, Gurme Kuruyemiş) gösteren özel bir ekran koruyucu bileşeni ([Screensaver.jsx](file:///c:/Users/PC/Desktop/cark/src/pages/Screensaver.jsx)) eklendi.
* **Otomatik Sürüm Kontrolü:** Kiosk tabletlerinde ve TV'lerde tarayıcı önbelleğini temizleme zorunluluğunu ortadan kaldırmak için `/version.json` üzerinden her 60 saniyede bir çalışan, yeni deploy algılandığında sayfayı otomatik yenileyen (hard-reload) arka plan mekanizması kuruldu.
* **Admin Çark Önizlemesi:** Yöneticilerin çark ayarlarını canlı olarak test edebilmesi için URL değiştirmeden çalışan "Çarkı Önizle" modu eklendi.

### Değişiklikler ve İyileştirmeler
* **Hash Routing Geçişi:** Fully Kiosk Browser üzerindeki geçmiş (history) navigasyon sorunlarını çözmek amacıyla tüm yönlendirmeler Hash tabanlı (`#/`, `#/admin`, `#/login`) mimariye taşındı.
* **Firestore Gerçek Zamanlı Güncelleme:** Verilerin anlık senkronizasyonu için Firestore sorguları tek seferlik getirme yerine canlı dinleme (`onSnapshot`) mekanizmasıyla güncellendi. Çark ayarları ve mağaza durumları anlık yansımaktadır.
* **Ses Efektleri ve AudioContext:** Çarkın dönüş ses efekti (ticking sound) çok daha gerçekçi mekanik sesle güncellendi. Tarayıcıların otomatik ses çalma engeline (autoplay block) takılmamak adına ilk dokunmayla `AudioContext` başlatma/kilit açma mantığı eklendi ve ses şiddeti dengelendi.
* **Giriş ve Oturum Yönetimi:** Mağaza giriş ve yönetici giriş oturumları ayrıştırıldı, güvenli çıkış yapıldığında oturum state'leri temizlenip doğru yönlendirmeler (`#/login`) sağlandı.
* **Mobil Klavye Optimizasyonu:** Mağaza giriş ekranındaki fiş/makbuz numarası girişleri için mobil cihazlarda doğrudan sayı klavyesini açacak input nitelikleri (`inputMode="numeric"`, `pattern="[0-9]*"`) eklendi.
* **Tasarım ve Görsellik (Premium Glassmorphism):** Kurumsal yeşil (`--yesil`, `--koyu-yesil`) ve altın sarısı (`--altin`) tonlarına dayalı, yumuşak gradyanlar ve mikro animasyonlar içeren premium tasarım dili uygulandı.
