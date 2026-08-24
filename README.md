# DraBornPark

**“Aracına numaranı değil, DraBornPark’ı bırak.”**

DraBornPark; araç ön camındaki NFC + QR etiketi, gizlilik odaklı araç iletişimi, park hafızası, güvenlik bildirimleri ve kullanıcıya bağlı araç profilleriyle birleştiren mobil + web sistemidir.

## Aktif sürüm — v1.0.1

- Expo SDK 57 / React Native 0.86 / Expo Router
- Android paket adı: `com.draborneagle.drabornpark`
- Uygulama sürümü: `1.0.1`
- Android `versionCode`: `2`
- Production URI scheme: `drabornpark`
- Web: `https://www.draborneagle.com/DraBornPark/`
- Google Play: `https://play.google.com/store/apps/details?id=com.draborneagle.drabornpark`
- Supabase Postgres + RLS + private Storage + Edge Functions
- Production kaynakta `expo-dev-client` yoktur.
- `SYSTEM_ALERT_WINDOW` ve `RECORD_AUDIO` production config içinde engellenmiştir.

## v1.0.1 — yeni marka, NFC/QR public token ve Android App Links

- Kullanıcının sağladığı DraBornPark görseli yeni uygulama ikonu ve native splash görselinin kaynağıdır.
- Eski araç görünümlü tracked ikon/splash dosyaları kaldırıldı.
- Kaynak görsel `assets/branding/v101/part01.b64`, `part02.b64`, `part03.b64` parçalarından `scripts/materialize-v101-brand.mjs` ile yeniden oluşturulur.
- `npm install`, `npm run check`, `npm run typecheck` ve Metro başlangıcında `icon.png`, `adaptive-icon.png`, `splash-icon.png` otomatik hazırlanır.
- Native splash statik marka görselini gösterir; JS hazır olduğunda `DkdStartupSplash` yaklaşık 1.85 saniyelik animasyonlu açılışa geçer.
- Android App Links `https://www.draborneagle.com/DraBornPark/t/*` için `autoVerify` ile tanımlıdır.

## NFC + QR public etiket sistemi

Her fiziksel etiket için tahmin edilmesi zor, kalıcı bir UUID public token üretilir. NFC ve basılı QR **aynı URL'yi** taşır:

```text
https://www.draborneagle.com/DraBornPark/t/<PUBLIC_TOKEN>
```

Bu URL içinde plaka, kullanıcı UUID'si, telefon veya e-posta bulunmaz.

Akış:

1. NFC okutulur veya QR taranır.
2. Android doğrulanmış App Link uygunsa DraBornPark açılır.
3. Uygulama yoksa veya App Link devreye girmezse public web etiket sayfası açılır.
4. Etiket aktifse yalnız araç sahibinin paylaşmaya izin verdiği araç alanları gösterilir.
5. Ziyaretçi güvenli kategori seçerek araç sahibine DraBornPark üzerinden bildirim gönderebilir.
6. Telefon numarası ziyaretçiye verilmez.
7. Etiket aktif değilse uygulamadaki güvenli aktivasyon akışına yönlendirilir.

## Aktivasyon eşleştirmesi

Etiket ilk okutan kişiye otomatik olarak verilmez. Sahiplik için üçlü doğrulama gerekir:

- Public token / fiziksel etiket
- Kutudaki gizli aktivasyon PIN'i
- Kullanıcının hesabındaki seçili araç

Mobil aktivasyon RPC'si:

```text
dkd_drabornpark_activate_public_token_v101
```

RPC anonim kullanıcıya kapalıdır. Aktivasyon sonunda fiziksel NFC/QR URL'si değişmez; etiket başka araca yeniden bağlansa bile NFC yeniden programlanmak zorunda değildir.

## Public web sayfası

Web repository'sinde aşağıdaki yapı production Vercel deployment'ına bağlıdır:

```text
DraBornPark/t/index.html
DraBornPark/public-tag-v101.js
DraBornPark/public-tag-v101.css
.well-known/assetlinks.json
vercel.json
```

`vercel.json`, `/DraBornPark/t/:token` adresini public tag sayfasına yönlendirir.

## Android App Links

Android intent filter:

```text
scheme: https
host: www.draborneagle.com
pathPrefix: /DraBornPark/t/
autoVerify: true
```

Web tarafındaki `.well-known/assetlinks.json` paket adı:

```text
com.draborneagle.drabornpark
```

Mevcut kalıcı Google Play upload sertifikası SHA-256:

```text
95:4C:F9:A8:E0:DB:09:46:A2:63:18:D6:95:7B:DF:0B:72:2D:51:7B:40:67:67:F8:3E:4C:37:BE:84:67:6B:C6
```

Google Play App Signing üretim uygulaması farklı bir Google app-signing sertifikasıyla imzalanırsa Play Console'daki **App signing certificate SHA-256** değeri de `.well-known/assetlinks.json` listesine eklenmelidir.

## Supabase v1.0.1

Production Supabase tarafında:

- `drabornpark_tags.dkd_public_token` kalıcı UUID public token alanı eklendi.
- Mevcut etiketlere token üretildi ve `nfc_url` canonical `/DraBornPark/t/<token>` biçimine taşındı.
- Yeni fabrika etiketleri aynı public URL standardıyla oluşturulur.
- `drabornpark_public_tag_snapshot(text)` token/tag code/public alias çözümlemesi yapar.
- Public snapshot yalnız ACTIVE etikette izin verilen araç alanlarını döndürür.
- `dkd_drabornpark_activate_public_token_v101` yalnız authenticated kullanıcıya açıktır.
- Public-token yardımcı RPC ACL'leri ayrıca harden edilmiştir; doğrudan anonim aktivasyon kapalıdır.

Migration'lar:

```text
supabase/migrations/20260824121000_dkd_drabornpark_v101_public_tag_links.sql
supabase/migrations/20260824122200_dkd_drabornpark_v101_public_rpc_acl_hardening.sql
```

## Termux — GitHub ile birebir eşitle ve mevcut Developer APK ile test et

> Bu akış APK/AAB üretmez. Mevcut Developer APK yalnız Metro/JS güncellemelerini test etmek için kullanılır.

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
git checkout main && \
git reset --hard origin/main && \
git clean -fd && \
npm install --no-audit --no-fund && \
npm run check && \
npx expo install --check && \
npm run typecheck && \
printf '\nDraBornPark sürüm: ' && node -p "require('./package.json').version" && \
printf 'Git commit: ' && git rev-parse --short HEAD && \
npx expo start --dev-client --lan --clear
```

Aynı Wi-Fi üzerinde Metro bağlantısı sorun çıkarırsa:

```bash
cd ~/projects/DraBornPark
npx expo start --dev-client --tunnel --clear
```

## Mevcut Developer APK ile ne test edilebilir?

Metro üzerinden test edilebilir:

- Animasyonlu JS başlangıç ekranı
- Public token mobil route'u
- Token + PIN aktivasyon ekranı
- Supabase lookup / notify / aktivasyon akışı
- Web public tag sayfası
- `drabornpark:///activate-token/<token>` uygulama içi yönlendirmesi, mevcut Developer APK bu scheme'i içeriyorsa

Native binary yeniden oluşturulmadan değişmeyecek alanlar:

- Android launcher ikonu
- Android native splash'in paketlenmiş görseli
- `versionCode=2` manifest değeri
- Yeni HTTPS `autoVerify` Android App Links intent filter'ı

Bu nedenle mevcut Developer APK ile JS/backend/web testleri yapılabilir; yeni ikon/native splash/App Links final doğrulaması sonraki native build'de yapılır.

## GitHub Actions

### `v101-source-check.yml`

Kaynak doğrulama içindir ve **APK/AAB üretmez**:

- branding asset materialization
- `npm run check`
- `npx expo install --check`
- `npm run typecheck`
- `git diff --check`

### `google-play-release.yml`

Yalnız manuel `workflow_dispatch` ile çalışır. v1.0.1 sırasında otomatik build başlatılmaz. Gelecekte release alındığında yeni/random keystore üretmek yasaktır; kalıcı DraBornPark upload key GitHub Secrets üzerinden geri yüklenir ve SHA-256 fingerprint'i build başlamadan doğrulanır.

Gerekli secret adları:

```text
DRABORNPARK_UPLOAD_KEYSTORE_B64
DRABORNPARK_UPLOAD_STORE_PASSWORD
DRABORNPARK_UPLOAD_KEY_PASSWORD
DRABORNPARK_UPLOAD_KEY_ALIAS
```

Fingerprint uyuşmazsa workflow build'i durdurur. Böylece sonraki Google Play güncellemeleri yanlış imzayla üretilemez.

## Güvenlik ilkeleri

- Telefon, e-posta ve kullanıcı UUID'si public URL'ye yazılmaz.
- Public token sahiplik kanıtı değildir.
- Aktivasyon PIN'inin açık hali veritabanında tutulmaz.
- Public bildirimler rate-limit ve güvenli mesaj filtresinden geçer.
- Ziyaretçi araç sahibinin telefon numarasını görmez.
- Yeni/yenilenen backend tanımları `dkd_` / `dkd.` standardını korur.

**Aktif sürüm: v1.0.1 — Android versionCode 2**
