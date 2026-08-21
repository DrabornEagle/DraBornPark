# DraBornPark

**“Aracına numaranı değil, DraBornPark’ı bırak.”**

DraBornPark; araç ön camındaki NFC + QR etiketini gizlilik odaklı araç iletişimi, park hafızası, güvenlik, araç geçmişi, aile paylaşımı ve premium dijital servislerle birleştiren kişisel araç ağıdır.

## v0.5.0

- Expo SDK 57 / React Native 0.86 / Expo Router
- Supabase Postgres + RLS + Storage + Edge Functions
- Android paket adı: `com.draborneagle.drabornpark`
- Android `versionCode`: `15`
- Kullanıcı adı + opsiyonel profil fotoğrafı
- Canlı Araç kokpiti, Park Ettim, Aracıma Git, Hızlı Erişim ve Merkezim
- Bildirim Merkezi, Aile, Geçici Sürücü, Vale/Servis, zaman kuralları ve acil durum zinciri
- NFC + QR aktivasyon, devir ve yeniden bağlama
- İstatistiklerim, araç geçmişi, gizlilik/veri ve hesap silme akışları
- Yönetici korumalı Üretim Paneli
- Production uygulamasında eski etkileşimli demo rotaları kaldırılmıştır

## Geliştirme çalışma şekli

DraBornPark’ın günlük geliştirme istemcisi **Expo Go**’dur. Projede `expo-dev-client` bulunmaz ve standart başlangıç komutu şudur:

```bash
npx expo start --clear
```

`expo-notifications` Android uzak push desteği Expo Go içinde SDK 53+ sürümlerinde sağlanmadığı için uygulama Expo Go’da push modülünü başlangıçta yüklemez. Böylece Expo Go açılışı hata vermeden devam eder.

Native-only işlevleri test etmek için GitHub Actions ayrıca ayrı bir **Developer APK** üretir. Bu APK Android debug build’idir ve Metro ile çalışır. Önerilen Metro komutu yine:

```bash
npx expo start --clear
```

Developer APK dosya adı:

```text
DraBornPark-v0.5.0-vc15-developer-debug.apk
```

Uzak Expo push tokenı üretmek için ayrıca geçerli EAS `projectId` ve Android push kimlik bilgileri gerekir. Bunlar yoksa uygulama çökmek yerine açık bir yapılandırma sonucu döndürür.

## v0.5.0 arayüz ve kararlılık notları

- Uzun ekran başlıkları tek satırda ölçeklenir.
- Loading göstergesi sabit merkezli, hareketli ve renkli yapıdadır.
- Giriş/kayıt ve park formlarında kontrollü TextInput odağı korunur.
- Deprecated `ImagePicker.MediaTypeOptions` kullanılmaz.
- Ana ekrandaki ikinci özellik kartı `Merkezim` olarak tüm modüllere gider.
- `Merkezim` içinde kaldırılmış demo rotalarına giden ölü bağlantılar bulunmaz.
- Production arayüzü gerçek hesap/veri akışını kullanır; eski demo sağlayıcısı root layout’a bağlanmaz.

## Backend

Temel kullanıcı ve araç tabloları `drabornpark_*` ad alanındadır. Önemli tablolar:

- `drabornpark_profiles`
- `drabornpark_vehicles`
- `drabornpark_tags`
- `drabornpark_parks`
- `drabornpark_reports`
- `drabornpark_contact_sessions`
- `drabornpark_messages`
- `drabornpark_timeline_events`
- `drabornpark_family_members`
- `drabornpark_guest_drivers`
- `drabornpark_vehicle_modes`
- `drabornpark_routing_rules`
- `drabornpark_emergency_contacts`
- `drabornpark_subscriptions`
- `drabornpark_push_tokens`
- `drabornpark_factory_events`
- `drabornpark_support_requests`

### v0.5.0 Supabase migration zinciri

Repository aşağıdaki v0.5.0 migration’larını içerir:

- `20260820211711_drabornpark_v050_profile_username_avatar_admin.sql`
- `20260820211832_drabornpark_v050_admin_session_access.sql`
- `20260820223248_drabornpark_v050_release_hardening.sql`
- `20260821010000_drabornpark_v050_production_cleanup.sql`
- `20260821011000_drabornpark_v050_factory_status_flow_guard.sql`

Yönetici erişimi istemci tarafındaki sabit e-posta kontrolleri yerine sunucu tarafı admin doğrulaması/RPC akışlarıyla korunur.

## Profil fotoğrafları

Profil görselleri `drabornpark-avatars` bucket’ında tutulur. Yazma/güncelleme/silme işlemleri kullanıcı kimliğinin kendi klasörüyle sınırlandırılır. Dosya boyutu ve tip kontrolleri backend politikalarıyla korunur.

## Termux — GitHub ile birebir eşitleme

Lokal `projects/DraBornPark` klasörünü GitHub `main` ile birebir yapmak için:

```bash
cd ~/projects/DraBornPark && \
git fetch origin && \
git reset --hard origin/main && \
git clean -fd && \
npm install --no-audit --no-fund
```

Ardından Expo Go için:

```bash
npx expo start --clear
```

> `git reset --hard` ve `git clean -fd` lokal, commit edilmemiş değişiklikleri siler. DraBornPark için kaynak gerçekliği GitHub `main` kabul edilir.

## Release doğrulaması

GitHub Actions `.github/workflows/ci.yml` şu kontrolleri çalıştırır:

1. `npm run check`
2. `npx expo install --check`
3. `npm run typecheck`
4. `npx expo export --platform web`
5. tracked kaynak dosyalarının temiz kaldığının doğrulanması
6. Android debug / Developer APK üretimi
7. APK package name ve imza doğrulaması
8. APK + SHA256 + build bilgisinin artifact olarak yüklenmesi

`npm run check` ayrıca sürüm eşleşmesini, `versionCode` değerini, Expo Go’nun varsayılan istemci olduğunu, `expo-dev-client` kalmadığını, `expo-notifications` için Expo Go güvenlik bariyerini, Expo Router route export’larını, demo rotalarının kaldırılmasını, UI okunabilirliğini ve v0.5.0 migration aynasını denetler.

## Güvenlik ilkeleri

- Telefon numarası, e-posta ve tam ad public tag ekranında yayınlanmaz.
- Etiket ilk okutma ile sahiplenilemez; Tag ID + gizli aktivasyon PIN gerekir.
- Aktivasyon PIN’inin açık hali veritabanında tutulmaz.
- Kullanıcı varlıkları RLS ile hesap bazında ayrılır.
- Profil fotoğrafı dışındaki kullanıcı dosyalarında private-storage kuralları korunur.
- Public iletişim akışı kişisel iletişim bilgisini ziyaretçiye açmaz.
- DraBornPark migration’ları `drabornpark_*` adlandırmasını kullanır.

## Sürüm

Aktif sürüm: **v0.5.0**
