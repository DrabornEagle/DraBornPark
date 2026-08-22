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
- Android bildirim kanalı: `drabornpark-alerts-v3`

## v0.5.5 — Premium, araç kartı, etiket devri ve web iletişimi

- Alt menü etiketleri daha dengeli konumlandı; `GÜVENLİ OTURUM` sola kaydırıldı.
- Aktif araç alanına ayrı `• CANLI •` göstergesi eklendi.
- Araç kartı daha minimalist, modern, renkli ve animasyonlu hale getirildi.
- Ana sayfa tekrar odaklandığında canlı dashboard yenilenir; ayrıca araç/etiket değişiklikleri Supabase Realtime ile anında senkronlanır, yeni eklenen araç manuel refresh gerektirmeden görünür.
- DraBornPark+ sahibi olmayan kullanıcı için modern Premium tanıtım popup’ı eklendi.
- DraBornPark+ plan ekranında aylık hedef fiyat `₺49,99 / ay`, yıllık hedef fiyat `₺399,99 / yıl` gösterilir. Google Play gerçek yerel fiyat döndürdüğünde mağaza fiyatı esas alınır.
- Google Play ürünü `drabornpark_plus`; base plan kimlikleri `monthly` ve `yearly`.
- Etiket `Devret / Devral` akışı Supabase pgcrypto `extensions` şemasıyla düzeltildi ve transfer RPC’leri yalnız authenticated kullanıcıya açıldı.
- Güvenli Araç İletişimi web ekranındaki `Mesaj Gönder` artık başka karta yönlendirme yapmaz; kendi içinde mesaj yazma alanı açar.
- Web iletişim ekranına fotoğraf ekleme alanı eklendi; masaüstü web JPG/JPEG dosyası seçebilir, mobil akış kamerayı kullanır ve kanıt private storage alanında tutulur.
- `ARAÇ SAHİBİ •` ve `NFC + QR • AKTİF` rozetleri büyütüldü.
- Trendyol, Hepsiburada ve Amazon örnek satış bağlantıları ile ileride kullanılacak DraBornPark Mağaza alanı hazırlandı. Bunlar resmi ortaklık olarak sunulmaz.
- Örnek satış alanlarının üstünde modern animasyonlu reklam/promosyon kartı bulunur.
- Loading ekranı korunmuştur.

## v0.5.4 — destek, izinler ve DraBornPark+

- Kayıtta zorunlu telefon numarası, kullanıcı adı ve opsiyonel profil resmi.
- Araç ekleme, konum/bildirim izinleri ve etiket Premium ödülü için renkli animasyonlu uygulama popup’ları.
- Alt menü: Ana Sayfa / Park Alanı / Bildirimler / Merkezim.
- Destek Merkezi aynı uygulama içinde; admin yeni kayıt bildirimi ve detay ekranı.
- Yeni etiket aktivasyonu 14 günlük DraBornPark+ ödülü verir.
- Satın alma tokenı Edge Function tarafından Google Play Developer API ile doğrulanmadan Premium hakkı açılmaz ve token veritabanında yalnızca SHA-256 hash olarak saklanır.
- Gerçek Play testi Developer/Internal Test build ve Play Console servis hesabı gerektirir. Supabase secret adı: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.

## v0.5.3 — anlık kanıt fotoğrafı

- Güvenli Araç İletişimi sayfasında ziyaretçi isteğe bağlı kanıt fotoğrafı gönderebilir.
- Galeriden seçim yapılmaz; fotoğraf canlı kameradan çekilir.
- Kanıt private storage alanında tutulur ve araç sahibi kısa süreli imzalı URL ile görüntüler.
- Bildirim silindiğinde ilişkili özel kanıt temizliği desteklenir.

## Canlı mesajlaşma ve bildirimler

- Güvenli Araç İletişimi ile uygulamadaki Bildirim Merkezi aynı anonim konuşmayı kullanır.
- Uygulamadaki cevaplar web tarafına Realtime ile yansır; polling fallback bağlantı kopmalarına karşı devrededir.
- Push token kaydı `drabornpark_push_tokens` üzerinden yapılır.
- `expo-notifications` native push testi Developer APK/dev build ile yapılmalıdır.

## Backend / Supabase

v0.5.5 için aşağıdaki migration’lar GitHub ile production Supabase’te eşleşir:

- `20260822113456_dkd_drabornpark_v054_support_plus_billing.sql`
- `20260822183736_dkd_drabornpark_v055_tag_transfer_pgcrypto_fix.sql`
- `20260822183752_dkd_drabornpark_v055_tag_transfer_acl_hardening.sql`

Etiket transferinde `extensions.gen_random_bytes` ve `extensions.digest` şema nitelikli kullanılır. Yeni v0.5.5 transfer RPC’leri anonim kullanıcılara kapalıdır.

## Termux — GitHub ile birebir kurulum/eşitleme

Aşağıdaki komut `~/projects/DraBornPark` klasöründeki takip edilen kaynakları GitHub `main` ile **birebir** yapar. Lokal commit edilmemiş kaynak değişiklikleri ve GitHub’da bulunmayan takip edilmeyen dosyalar silinir; `.env` gibi gitignore içindeki yerel secret dosyaları korunur.

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
npx expo start --dev-client --clear
```

Aynı Wi‑Fi üzerinde Metro bağlantısı sorun çıkarırsa:

```bash
cd ~/projects/DraBornPark && npx expo start --dev-client --clear --tunnel
```

> `expo-iap` native modül olduğu için Google Play abonelik testi Expo Go yerine Developer/Internal Test build ile yapılır.

## Yerel doğrulama

```bash
cd ~/projects/DraBornPark && \
npm run check && \
npx expo install --check && \
npm run typecheck
```

## GitHub Actions / Developer APK

Kalıcı `.github/workflows/ci.yml` şu kontrolleri yapar:

1. `npm run check`
2. `npx expo install --check`
3. `npm run typecheck`
4. `npx expo export --platform web`
5. Tracked kaynakların build sırasında değişmediğinin doğrulanması
6. Android development prebuild
7. `:app:assembleDebug`
8. APK package, `versionCode=21`, `versionName=0.5.5` ve imza doğrulaması
9. `DraBornPark-v0.5.5-vc21-developer-apk` artifact üretimi

## Release hijyeni

`npm run check`; v0.5.5/versionCode eşleşmesini, route’ları, v0.5.5 transfer migration’larını, Premium fiyat/Google Play işaretlerini, anlık araç yenilemeyi, web mesaj/fotoğraf alanını ve kalıcı CI metadata’sını doğrular. Geçici v0.5.4/v0.5.5 release workflow/marker dosyalarının repoda kalması build hatasıdır.

## Güvenlik ilkeleri

- Telefon numarası, e-posta ve açık kimlik bilgileri public etiket ekranında yayınlanmaz.
- Etiket ilk okutma ile sahiplenilemez; Tag ID + gizli aktivasyon PIN gerekir.
- Aktivasyon PIN’inin açık hali veritabanında tutulmaz.
- Kullanıcı varlıkları RLS ile hesap bazında ayrılır.
- Kanıt fotoğrafları private storage alanında tutulur ve sahibi kısa süreli imzalı URL ile görüntüler.
- Public iletişim akışı kişisel iletişim bilgisini ziyaretçiye açmaz.
- Yeni/yenilenen backend tanımları `dkd_` / `dkd.` standardını korur.

**Aktif sürüm: v0.5.5 — Android vc21**
