# DraBornPark

**“Aracına numaranı değil, DraBornPark’ı bırak.”**

DraBornPark; araç ön camındaki NFC + QR etiketini gizlilik odaklı araç iletişimi, park hafızası, güvenlik, araç Timeline’ı, Family ve premium dijital servislerle birleştiren platformdur.

## v0.1.0 test stack

- Expo SDK 57 / React Native 0.86
- Expo Router
- Expo Go 57.0.9 odaklı test akışı
- Supabase Postgres + RLS + Storage + Edge Functions
- DraBornGarage verilerinden tamamen ayrı `drabornpark_*` veri alanı
- Fiziksel etiket hedefi: NTAG213 + benzersiz QR + değişmeyen Tag ID

## Expo Go’da şu anda test edilebilenler

- Premium DraBornPark ana ekranı
- Gerçek cihaz konumuyla **Park Ettim**
- Kapalı otopark kat / bölge / sıra / park numarası
- Park fotoğrafı seçme
- **Aracıma Git** ile yürüyüş rotasını harita uygulamasında açma
- Son Park ve park geçmişi demo akışı
- Bildirim merkezi ve anonim hazır cevap UI’si
- Araç Timeline
- Family, Geçici Sürücü, Vale, Servis, zaman kuralları, acil zincir, gizlilik, etiket ve destek modülleri
- 14 günlük DraBornPark+ deneme/paket vitrini
- Güvenli aktivasyon akışı
- DraBornPark Factory Panel üretim demosu
- Uygulama yüklemeden açılan `/t/[id]` QR/NFC web iletişim ekranı
- DraBornPark Moto’ya uygun araç tipi altyapısı
- Supabase’ten canlı demo senaryosu; bağlantı yoksa offline fallback demo

## Backend

`supabase/migrations/` altında DraBornPark’a ait tablolar, RLS politikaları, güvenli RPC’ler, private storage ve demo verileri bulunur.

Temel tablolar:

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
- `drabornpark_routing_rules`
- `drabornpark_emergency_contacts`
- `drabornpark_subscriptions`
- `drabornpark_push_tokens`
- `drabornpark_factory_events`
- `drabornpark_scan_events`
- `drabornpark_abuse_limits`
- `drabornpark_support_requests`
- `drabornpark_demo_scenarios`

Güvenli RPC’ler:

- `drabornpark_factory_create_tag`
- `drabornpark_activate_tag`
- `drabornpark_public_tag_snapshot`

Public Edge Function:

- `drabornpark-public-contact`
  - güvenli tag lookup
  - araç bildirimi oluşturma
  - geçici anonim chat oturumu
  - telefon/e-posta maskeleme
  - kaba/saldırgan metin nötrleştirme
  - hashed-IP rate limit
  - Timeline olayı
  - push dağıtım backend’i

## Demo

Ana uygulama Supabase’teki `drabornpark_demo_scenarios/default` kaydını okur.

Dış kullanıcı etiketi:

```text
DP-K7M4X2P9
```

Uygulama içinden **Daha Fazla → Etiket Test Merkezi** ile açılabilir.

## Çalıştırma

```bash
npm install
npx expo start --clear
```

Expo Go ile QR kodu okut ve uygulamayı cihazda aç.

## Native development-build katmanı

Expo Go’nun sağlamadığı native yetenekler için ayrı development build kullanılacak. Veri modeli ve UI giriş noktaları hazırdır:

- Android remote push token/notification testi
- Google Play Billing `drabornpark_plus`
- NTAG213 Factory NFC writer + read-back verification
- background Bluetooth park algılama
- VoIP anonim çağrı
- gelişmiş native harita
- gerektiğinde BLE fiziksel yakınlık doğrulaması

Bu sınırlama fiziksel DraBornPark etiketinin QR/NFC URL mantığını değiştirmez; araca ulaşan kişi yine uygulama yüklemek zorunda değildir.

## Güvenlik ilkeleri

- Telefon numarası, e-posta ve tam ad public tag ekranında yayınlanmaz.
- Etiket ilk okutma ile sahiplenilemez; Tag ID + gizli aktivasyon PIN gerekir.
- Aktivasyon PIN’inin açık hali veritabanında tutulmaz.
- Kullanıcı varlıkları RLS ile hesap bazında ayrılır.
- Medya bucket’ı private’tır.
- Public iletişim fonksiyonu servis rolünü yalnızca sunucu içinde kullanır.
- DraBornGarage tablolarına DraBornPark migration’ları dokunmaz.
