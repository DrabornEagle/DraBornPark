# DraBornPark

**“Aracına numaranı değil, DraBornPark’ı bırak.”**

DraBornPark; araç ön camındaki NFC + QR etiketini gizlilik odaklı araç iletişimi, park hafızası, güvenlik, araç geçmişi, aile paylaşımı ve premium dijital servislerle birleştiren kişisel araç ağıdır.

## Aktif sürüm — v0.6.0

- Expo SDK 57 / React Native 0.86 / Expo Router
- Android paket adı: `com.draborneagle.drabornpark`
- Android `versionCode`: **1**
- `versionCode` ilk yayın AAB çıktısı alınana kadar **1 olarak sabittir**.
- Özel URI scheme: `drabornpark`
- Expo Developer APK + Metro geliştirme akışı
- Supabase Postgres + RLS + Storage + Edge Functions
- NFC + QR aktivasyon, devir, yeniden bağlama ve özel kullanıcı bağlantısı
- Park Hafızası, araç geçmişi, Aile, Geçici Sürücü, Vale / Servis ve zaman kuralları
- DraBornPark+ Google Play aylık/yıllık abonelik istemcisi + sunucu doğrulama katmanı
- Android bildirim kanalı: `drabornpark-alerts-v3`

## v0.6.0 öne çıkanlar

- Kayıt sırasında kullanıcı adı + telefon numarası + isteğe bağlı profil resmi.
- Android profil resmi seçiminde ActivityResultLauncher/lifecycle koruması ve kontrollü tekrar deneme.
- Araç eklendi akışı için özel modern popup.
- Ana sayfada daha renkli/animasyonlu Aktif Araç ve DraBornPark+ kartları.
- Alt menü: `Ana Sayfa`, `Park Alanı`, `Bildirimler`, `Merkezim`.
- Uygulama içi destek merkezi: **Nasıl Yardımcı Olabiliriz?**
- Kullanıcının destek kayıt geçmişi ve yönetici destek kuyruğu.
- Yeni destek kaydında yönetici bildirimi ve bildirime dokununca `/admin/support/<id>` detay yönlendirmesi.
- Son Park kartında gerçekten kaydedilmiş yer/GPS/kat/bölge/sıra/park yeri özetinin gösterilmesi.
- Etiket devral alanının açılır/kapanır kategori olması ve ilk açılışta kapalı başlaması.
- Yeni uygun etiket aktivasyonunda backend tarafından verilen 14 günlük DraBornPark+ ödülü.
- Abonelik durumu yenileme/iptal/geri yükleme sonrası yeniden uzlaştırılır; süresi dolmuş Plus yetkisi profil üzerinde kalıcılaşmaz.

## DraBornPark+ / Google Play

Android istemcisi şu ürün kimliklerini bekler:

- `drabornpark_plus_monthly`
- `drabornpark_plus_yearly`

Satın alma tamamlandığında purchase token uygulamada Premium yetki açmak için tek başına yeterli değildir. `drabornpark-google-play-verify` Edge Function Google Android Publisher API üzerinden aboneliği doğrular, tokenın açık değerini kalıcı tabloda tutmak yerine SHA-256 özeti kullanır, aynı tokenın farklı kullanıcıya geçirilmesini engeller ve gerekirse Google Play acknowledgement işlemini sunucu tarafında tamamlar.

İlk Play yayını öncesinde Play Console tarafında iki abonelik ürününün/base planlarının aktif edilmesi ve Android Publisher yetkili servis hesabının JSON bilgisinin Supabase Edge secret olarak `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` adına bağlanması gerekir. Bu gizli anahtar repoya veya mobil uygulamaya kesinlikle yazılmaz.

## 14 günlük Premium ödül

Hesap oluşturmak tek başına trial başlatmaz. Kullanıcı uygun yeni DraBornPark etiketini güvenli PIN ile aktive ettiğinde backend:

- etiketi kullanıcı + araca bağlar,
- `PLUS_TRIAL` hakkını başlatır/uygun şekilde uzatır,
- bitiş zamanını döndürür,
- uygulama ödül popup'ında 14 günlük Premium bilgisini ve DraBornPark+ yönlendirmesini gösterir.

Premium bittiğinde temel NFC + QR ürün kimliği ve Basic güvenlik işlevleri çalışmaya devam eder.

## Destek ve yönetici bildirimi

Kullanıcı `Merkezim → Destek Merkezi` veya `Hesabım → DraBornPark Destek` yolundan kayıt oluşturabilir. Kayıt `drabornpark_support_requests` tablosuna eklenir. Trigger yönetici bildirim kaydı üretir; Developer APK cihazında yönetici push tokenı kayıtlıysa `drabornpark-support-notify-admin` Edge Function uzak push gönderir. Bildirimin route verisi doğrudan ilgili destek ayrıntısını açar.

## Gizlilik / Google Play yayın URL’leri

- Gizlilik Politikası: `https://www.draborneagle.com/DraBornPark/privacy/`
- Kullanım Koşulları: `https://www.draborneagle.com/DraBornPark/terms/`
- Veri Güvenliği: `https://www.draborneagle.com/DraBornPark/data-safety/`
- Hesap Silme: `https://www.draborneagle.com/DraBornPark/account-deletion/`
- Web Destek: `https://www.draborneagle.com/DraBornPark/support/`

Uygulama içindeki Gizlilik & Veri Merkezi de bu davranışlarla eşleştirilmiştir. Telefon/e-posta QR/NFC ziyaretçisine gösterilmez; park geçmişi kamusal değildir; kullanıcı hesabını ve hesaba bağlı kullanıcı verilerini uygulama veya herkese açık web silme sayfası üzerinden silebilir.

## Supabase v0.6.0 migration zinciri

v0.6.0 için kaynak repoda canlı backend ile eşleşen migration’lar bulunur. Özellikle:

- `20260821230000_drabornpark_v060_release.sql`
- `20260821233000_drabornpark_v060_entitlement_reconcile.sql`
- `20260821233500_drabornpark_v060_rpc_privilege_hardening.sql`

Yeni/yenilenen DraBornPark backend tanımları `drabornpark_*` ve yeni yerel değişken/yardımcı tanımlar `dkd_` / `dkd` adlandırmasını korur.

## Termux — GitHub ile birebir eşitle ve çalıştır

Aşağıdaki blok `~/projects/DraBornPark` klasörünü GitHub `main` ile birebir eşitler. Lokal commit edilmemiş değişiklikler silinir.

```bash
pkg update -y && pkg upgrade -y && \
pkg install -y git nodejs-lts ripgrep && \
mkdir -p ~/projects && \
if [ ! -d ~/projects/DraBornPark/.git ]; then \
  rm -rf ~/projects/DraBornPark && \
  git clone https://github.com/DrabornEagle/DraBornPark.git ~/projects/DraBornPark; \
fi && \
cd ~/projects/DraBornPark && \
git fetch --prune origin && \
git checkout -B main origin/main && \
git reset --hard origin/main && \
git clean -fd && \
rm -rf node_modules .expo && \
npm install --no-audit --no-fund && \
npm run check && \
npx expo install --check && \
npm run typecheck && \
npx expo start --dev-client --clear
```

Aynı Wi‑Fi bağlantısı sorun çıkarırsa:

```bash
cd ~/projects/DraBornPark && npx expo start --dev-client --clear --tunnel
```

Developer APK zaten kuruluysa JS/TS/UI değişikliklerinin büyük bölümünde yeniden APK gerekmez. Native dependency, Expo plugin, Android izinleri veya native config değiştiğinde yeni Developer APK gerekir.

## GitHub Actions / Developer APK

`.github/workflows/ci.yml` v0.6.0 için:

1. proje bütünlük kontrollerini,
2. Expo dependency uyumluluğunu,
3. web export doğrulamasını,
4. Android development prebuild’i,
5. `:app:assembleDebug` build’ini,
6. paket adı + `versionCode=1` + `versionName=0.6.0` doğrulamasını,
7. APK imza doğrulamasını,
8. `DraBornPark-v0.6.0-vc1-developer-apk` artifact üretimini

yapar.

## Güvenlik ilkeleri

- Telefon numarası, e-posta ve açık kimlik bilgileri public etiket ekranında yayınlanmaz.
- Etiket ilk okutma ile sahiplenilemez; Tag ID + gizli aktivasyon PIN gerekir.
- Aktivasyon PIN’inin açık hali veritabanında tutulmaz.
- Kullanıcı varlıkları RLS ve kullanıcı kimliği kontrolleriyle ayrılır.
- Public iletişim akışı kişisel iletişim bilgisini ziyaretçiye açmaz.
- Private/admin RPC’lerde anonymous EXECUTE yetkisi kapatılmıştır.
- Google Play purchase token açık biçimde abonelik tablosunda tutulmaz.
- Premium hakkı satın alma istemcisi tarafından değil, sunucu doğrulaması sonucu verilir.

**Aktif sürüm: v0.6.0 — Android vc1**
