# DraBornPark v0.5.4

Android `versionCode`: `20`  
Paket: `com.draborneagle.drabornpark`

## Tamamlanan v0.5.4 kapsamı

- Kayıt ekranına zorunlu telefon numarası eklendi. Numara E.164 biçimine normalize edilir ve QR/NFC ziyaretçisinden gizli tutulur.
- Yeni kullanıcı hesapları Basic başlar. 14 günlük DraBornPark+ ödülü hesap açılışında değil, yeni bir fiziksel etiket başarıyla aktive edildiğinde sunucu tarafından eklenir.
- Araç ekleme sonucu standart sistem mesajı yerine renkli ve animasyonlu DraBornPark modalı kullanılır.
- Ana sayfadaki Aktif Araç kartı renkli, hareketli ve etiket/Plus durumlarını canlı gösterir.
- Alt menü adları `Ana Sayfa`, `Park Alanı`, `Bildirimler`, `Merkezim` olarak düzenlendi.
- Bugünkü Durum alanındaki eski İstatistiklerim kartı yerine animasyonlu DraBornPark+ kartı eklendi.
- Son Park kartı kaydedilen gerçek mekan adını, otopark kat/bölge/sıra/park numarasını ve varsa GPS koordinat/konum doğruluğunu özetler.
- Etiket devralma formu açılır/kapanır kategori haline getirildi ve ilk açılışta kapalıdır.
- Konum ve bildirim izinleri önce DraBornPark tasarımlı açıklama penceresi gösterir; sistem izni ancak kullanıcı devam ederse istenir.
- Etiket aktivasyonu sonrası `14 Gün DraBornPark+ Hediye` animasyonlu ödül penceresi açılır ve doğrudan DraBornPark+ sayfasına yönlendirebilir.
- Hesap ekranındaki DraBornPark Destek bağlantısı dahili Destek Merkezi'ni açar.
- Destek kaydı admin ekranında ayrıntılı görüntülenebilir, durum `İnceleniyor / Çözüldü / Kapalı` olarak yönetilebilir.
- Admin destek bildirimi iki katmanlıdır: kayıt oluşturulunca Edge Function uzak Expo push göndermeyi dener; admin uygulaması açıkken Realtime + kısa aralıklı yedek kontrol yerel sistem bildirimi üretir. Bildirime dokunulduğunda ilgili destek kaydı açılır.
- v0.5.3 güvenli web iletişimi, zorunlu kamera kanıtı, tam ekran kanıt görüntüleyici, güvenli arama talebi ve anonim mesajlaşma katmanları korunmuştur.

## DraBornPark+ / Google Play hazırlığı

Uygulama içi ürün kimliği:

- Subscription product: `drabornpark_plus`
- Aylık base plan: `monthly`
- Yıllık base plan: `yearly`

İstemci `expo-iap` ile Google Play'den canlı fiyat/teklif bilgisini okur, satın alma ve geri yükleme akışını başlatır. Satın alma istemcide tek başına yetki açmaz; DraBornPark sunucusu Google Android Publisher API üzerinden doğrulama yapar.

Sunucu Edge Function: `drabornpark-billing`

- Android package: `com.draborneagle.drabornpark`
- Google Play `subscriptionsv2` doğrulaması kullanılır.
- Ham purchase token veritabanında kalıcı tutulmaz; SHA-256 özeti saklanır.
- Ürün, sona erme zamanı, otomatik yenileme ve abonelik durumu sunucuda doğrulanır.

Gerçek mağaza ödemesinin açılması için Play Console tarafında bir defaya mahsus şu harici ayarlar gereklidir:

1. `drabornpark_plus` abonelik ürününü oluştur ve etkinleştir.
2. `monthly` ve `yearly` base planlarını oluştur ve fiyatlarını Play Console'da belirle.
3. Google Play Developer API erişimli bir service account tanımla ve uygulamaya gerekli abonelik/sipariş görüntüleme yetkisini ver.
4. Service account JSON içeriğini Supabase Edge Function secret olarak `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` adıyla ekle.
5. Satın alma testi için uygulamayı Play Console Internal testing kanalından yükle ve lisans test kullanıcısı kullan.

Bu Play Console adımları repository kodundan otomatik üretilemez; kod ve sunucu doğrulama köprüsü v0.5.4 içinde hazırdır.

## Bildirim notu

Uzak Expo push için native build'de EAS/Expo `projectId` yapılandırması ve cihazın `drabornpark_push_tokens` tablosuna kayıtlı Expo push token'ı gerekir. Uygulama açıkken admin destek bildirimi Realtime/polling yerel yedeğiyle ayrıca çalışır.

## Sıfırdan Termux

```bash
pkg update -y && pkg upgrade -y
pkg install -y git nodejs-lts openssh
cd ~
rm -rf DraBornPark
git clone https://github.com/DrabornEagle/DraBornPark.git
cd DraBornPark
npm install --no-audit --no-fund
npm run check
npm run typecheck
npx expo start --dev-client --clear --tunnel
```

Developer APK v0.5.4 / vc20 kurulu olmalıdır. `expo-iap`, image picker ve bildirim modülleri native olduğundan Expo Go yerine DraBornPark Developer APK kullanılmalıdır.
