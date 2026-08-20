# DraBornPark

**“Aracına numaranı değil, DraBornPark’ı bırak.”**

DraBornPark; araç ön camındaki NFC + QR etiketini gizlilik odaklı araç iletişimi, park hafızası, güvenlik, araç geçmişi, aile paylaşımı ve premium dijital servislerle birleştiren kişisel araç ağıdır.

## v0.5.0

- Expo SDK 57 / React Native 0.86 / Expo Router
- Supabase Postgres + RLS + Storage + Edge Functions
- Android paket adı: `com.draborneagle.drabornpark`
- Android `versionCode`: `12`
- Kullanıcı adı + opsiyonel profil fotoğrafı
- Canlı Araç kokpiti, Park Ettim, Aracıma Git, Hızlı Erişim ve Merkezim
- Her ekranda durum duyarlı Bildirim zili
- Scroll konumuna göre saydam/normal alt menü
- NFC + QR aktivasyon, devir ve yeniden bağlama
- Aile, Geçici Sürücü, Vale/Servis, zaman kuralları ve acil durum zinciri
- İstatistiklerim, araç geçmişi, gizlilik/veri ve hesap silme akışları
- Etkileşimli Demo modu ve Test1 web iletişim demosu
- Yönetici korumalı Üretim Paneli

## v0.5.0 arayüz ve kararlılık notları

- Uzun ekran başlıkları tek satırda ölçeklenir; `Etiketlerim` ve `DraBornPark Aile` mobil genişlikte bölünmez.
- Loading göstergesinde dönen halka ve araç çekirdeği aynı sabit sahnede merkezlenir.
- Giriş/kayıt formunda kontrollü TextInput odağı korunur; klavye yazı sırasında kendiliğinden kapanmamalıdır.
- Expo Image Picker eski `MediaTypeOptions` API’si kullanılmaz.
- `GİRİŞ YAP / KAYIT OL` ve `YENİ ETİKET AKTİVE ET` aksiyonları solid renk katmanları ve hafif hareketlerle vurgulanır; gradient/shadow/glow kullanılmaz.
- Ana ekrandaki ikinci özellik kartı `Merkezim` olarak tüm modüllere gider.

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

Repository ve canlı DraBornPark projesi aşağıdaki v0.5.0 migration’larını içerir:

- `20260820211711_drabornpark_v050_profile_username_avatar_admin.sql`
- `20260820211832_drabornpark_v050_admin_session_access.sql`
- `20260820223248_drabornpark_v050_release_hardening.sql`

Bunlar kullanıcı adı/`avatar_url`, `drabornpark-avatars` bucket’ı, profil RPC’leri, admin erişimi, kullanıcı adı doğrulama constraint’i ve RPC izin daraltmalarını kapsar.

`draborneagle@gmail.com` üretim paneli yöneticisidir. Yönetici doğrulaması `drabornpark_is_admin()` üzerinden yapılır.

## Profil fotoğrafları

Profil görselleri `drabornpark-avatars` bucket’ında tutulur. Bucket yalnızca profil görselinin okunabilir URL ile gösterilebilmesi için public read kullanır; yazma/güncelleme/silme işlemleri kullanıcı kimliğinin kendi klasörüyle sınırlandırılmıştır. Dosya boyutu 5 MB ile, tipler JPEG/PNG/WebP ile sınırlandırılmıştır.

## Demo ve Test1

Demo modu gerçek hesaptan ayrıdır ve v0.5.0 verileriyle araç, park, bildirim, etiket, aile, mod, gizlilik ve istatistik akışlarının test edilmesini sağlar.

Test1 web deneyiminde `Başka bir mesaj` kartı ve `ARAÇ SAHİBİNE GÜVENLİ GÖNDER` aksiyonu v0.5.0 hareket katmanına sahiptir. Test1 demosu gerçek araç sahibine bildirim göndermez.

## Termux — GitHub ile birebir eşitleme

Lokal `projects/DraBornPark` klasörünü GitHub `main` ile birebir yapmak için:

```bash
cd ~/projects/DraBornPark && \
git fetch origin && \
git reset --hard origin/main && \
git clean -fd && \
npm install
```

Ardından:

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
5. Build sırasında tracked kaynak dosyalarının değişmediğinin doğrulanması

`npm run check` ayrıca v0.5.0 sürüm eşleşmesini, Android versionCode’u, Expo Router default export’larını, başlık taşmalarını, deprecated ImagePicker kullanımını, klavye kararlılığı işaretlerini, Loading merkezlemesini, `Merkezim` kartını, geçici release dosyalarının kaldırıldığını ve v0.5.0 Supabase migration aynasını denetler.

## Güvenlik ilkeleri

- Telefon numarası, e-posta ve tam ad public tag ekranında yayınlanmaz.
- Etiket ilk okutma ile sahiplenilemez; Tag ID + gizli aktivasyon PIN gerekir.
- Aktivasyon PIN’inin açık hali veritabanında tutulmaz.
- Kullanıcı varlıkları RLS ile hesap bazında ayrılır.
- Profil fotoğrafı dışındaki kullanıcı dosyalarında ilgili private-storage kuralları korunur.
- Profil bucket’ında yalnızca public read vardır; owner write path’i auth UID ile sınırlandırılır.
- Public iletişim akışı kişisel iletişim bilgisini ziyaretçiye açmaz.
- DraBornPark migration’ları `drabornpark_*` adlandırmasını kullanır.

## Sürüm

Aktif sürüm: **v0.5.0**
