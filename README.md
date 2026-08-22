# DraBornPark

**“Aracına numaranı değil, DraBornPark’ı bırak.”**

DraBornPark; araç ön camındaki NFC + QR etiketini gizlilik odaklı araç iletişimi, park hafızası, güvenlik, araç geçmişi, aile paylaşımı ve premium dijital servislerle birleştiren kişisel araç ağıdır.

## Aktif sürüm — v0.5.5

- Expo SDK 57 / React Native 0.86 / Expo Router
- Android paket adı: `com.draborneagle.drabornpark`
- Android `versionCode`: `21`
- Özel URI scheme: `drabornpark`
- Expo Developer APK + Metro geliştirme akışı
- Supabase Postgres + RLS + private Storage + Edge Functions
- NFC + QR aktivasyon, devir, yeniden bağlama ve özel kullanıcı bağlantısı
- Park hafızası, araç geçmişi, aile paylaşımı ve anonim araç iletişimi
- Bildirim Merkezi: ilk 5 kayıt + `Daha Fazla` ile 5’er kayıt
- Bildirim silme ve bağlı anonim konuşma/kanıt temizliği
- Realtime anonim mesajlaşma + polling fallback
- Kategoriye göre Türkçe bildirim başlığı
- Android bildirim kanalı: `drabornpark-alerts-v3`

## v0.5.3 — anlık kanıt fotoğrafı

Güvenli Araç İletişimi sayfasında ziyaretçi isteğe bağlı kanıt fotoğrafı gönderebilir.

- Galeriden seçim yapılmaz.
- Fotoğraf yalnızca o anda canlı kameradan çekilir.
- Çekim tarih ve saati JPEG’in içine işlenir.
- Göndermeden önce önizleme yapılabilir, fotoğraf kaldırılabilir veya yeniden çekilebilir.
- Kanıt özel storage alanında tutulur.
- Araç sahibi uygulamada küçük önizlemeye dokunup fotoğrafı tam ekran açabilir.
- Uygulama kısa süreli imzalı URL kullanır; kalıcı public dosya adresi yayınlanmaz.
- Bildirim silindiğinde ilişkili özel kanıt dosyalarının temizlenmesi de release akışına dahildir.

## Canlı mesajlaşma ve bildirimler

- Güvenli Araç İletişimi ile uygulamadaki Bildirim Merkezi aynı anonim konuşmayı kullanır.
- İlk mesajdan sonraki yeni ziyaretçi mesajları da aynı konuşma içinde gösterilir.
- Uygulamadaki cevaplar web tarafına Realtime ile yansır; polling fallback bağlantı kopmalarına karşı devrededir.
- Uygulama ön plandayken yeni ziyaretçi mesajı için yerel Android bildirimi üretme katmanı bulunur.
- Push token kaydı `drabornpark_push_tokens` üzerinden yapılır.
- `expo-notifications` Expo Go’da native push için kullanılmaz; push/yerel bildirim testleri Developer APK ile yapılmalıdır.

## Demo durumu

Eski üretim demosu kapatılmıştır. `app/public-demo.tsx`, `app/demo/[section].tsx` ve eski demo doğrulama dokümanları release hijyen kontrolünde yasaklıdır.

## Backend / Supabase

Temel kullanıcı ve araç tabloları `drabornpark_*` ad alanındadır. v0.5.1–v0.5.3 iletişim zincirinde aşağıdaki migration’lar zorunludur:

- `20260821083000_drabornpark_v051_live_chat_realtime.sql`
- `20260821131500_dkd_drabornpark_v052_realtime_broadcast.sql`
- `20260821143000_dkd_drabornpark_v053_evidence_photo.sql`

v0.5.3 migration’ı mesajlara kanıt metadata alanlarını, Realtime broadcast katmanını ve private kanıt akışını ekler. Public iletişim Edge Function kaynağı `supabase/functions/drabornpark-public-contact/index.ts` içindedir.

## Termux — sıfırdan kurulum ve GitHub ile birebir eşitleme

Aşağıdaki komut lokal `~/projects/DraBornPark` klasörünü GitHub `main` ile birebir yapar. Lokal, commit edilmemiş değişiklikler silinir.

```bash
pkg update -y && pkg upgrade -y && \
pkg install -y git nodejs-lts && \
mkdir -p ~/projects && \
if [ ! -d ~/projects/DraBornPark/.git ]; then \
  rm -rf ~/projects/DraBornPark && \
  git clone https://github.com/DrabornEagle/DraBornPark.git ~/projects/DraBornPark; \
fi && \
cd ~/projects/DraBornPark && \
git fetch origin && \
git reset --hard origin/main && \
git clean -fd && \
npm install --no-audit --no-fund && \
npm run check && \
npm run typecheck && \
npx expo start --dev-client --clear
```

Aynı Wi‑Fi üzerinde bağlantı sorununda:

```bash
cd ~/projects/DraBornPark && npx expo start --dev-client --clear --tunnel
```

Developer APK zaten kuruluysa bundan sonraki JavaScript/TypeScript/UI değişikliklerinin büyük bölümü için tekrar APK almak gerekmez; `npx expo start --dev-client --clear` ile Metro’yu başlatmak yeterlidir. Native dependency, Expo plugin, Android izinleri veya native config değiştiğinde yeni Developer APK gerekir.

## Yerel doğrulama

```bash
cd ~/projects/DraBornPark && \
npm run check && \
npx expo install --check && \
npm run typecheck
```

## GitHub Actions / Developer APK

`.github/workflows/ci.yml` push ve manuel çalıştırmada şu kontrolleri yapar:

1. `npm run check`
2. `npx expo install --check`
3. `npm run typecheck`
4. `npx expo export --platform web`
5. Tracked kaynakların build sırasında değişmediğinin doğrulanması
6. Android development prebuild
7. `:app:assembleDebug`
8. APK package ve imza doğrulaması
9. `DraBornPark-v0.5.5-vc21-developer-apk` artifact üretimi

## Release hijyeni

`npm run check` v0.5.3 için sürüm/versionCode eşleşmesini, Expo Router route’larını, demo kalıntılarının kaldırıldığını, deprecated ImagePicker kullanımını, Developer APK ayarlarını, Worklets sürüm eşleşmesini, Realtime/push işaretlerini, kanıt fotoğrafı viewer’ını, public contact Edge Function işaretlerini ve v0.5.1–v0.5.3 migration zincirini doğrular.

## Güvenlik ilkeleri

- Telefon numarası, e-posta ve açık kimlik bilgileri public etiket ekranında yayınlanmaz.
- Etiket ilk okutma ile sahiplenilemez; Tag ID + gizli aktivasyon PIN gerekir.
- Aktivasyon PIN’inin açık hali veritabanında tutulmaz.
- Kullanıcı varlıkları RLS ile hesap bazında ayrılır.
- Kanıt fotoğrafları private storage alanında tutulur ve sahibi tarafından kısa süreli imzalı URL ile görüntülenir.
- Public iletişim akışı kişisel iletişim bilgisini ziyaretçiye açmaz.
- Yeni backend tanımları `drabornpark_*` / `dkd_drabornpark_*` adlandırmasını korur.

**Aktif sürüm: v0.5.5 — Android vc21**

## v0.5.4 — destek, izinler ve DraBornPark+

- Kayıtta zorunlu telefon numarası, kullanıcı adı ve opsiyonel profil resmi.
- Araç ekleme, konum/bildirim izinleri ve etiket Premium ödülü için renkli animasyonlu uygulama popup’ları.
- Alt menü: Ana Sayfa / Park Alanı / Bildirimler / Merkezim.
- Destek Merkezi aynı uygulama içinde; admin yeni kayıt bildirimi ve detay ekranı.
- Yeni etiket aktivasyonu 14 günlük DraBornPark+ ödülü verir.
- Google Play ürünü `drabornpark_plus`; base plan kimlikleri `monthly` ve `yearly`. Fiyatlar Play Store’dan yerel para birimiyle okunur.
- Satın alma tokenı Edge Function tarafından Google Play Developer API ile doğrulanmadan Premium hakkı açılmaz ve token veritabanında yalnızca SHA-256 hash olarak saklanır.
- Gerçek Play testi Developer/Internal Test build ve Play Console servis hesabı gerektirir. Supabase secret adı: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
