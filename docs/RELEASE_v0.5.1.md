# DraBornPark v0.5.1 Release Verification

## Scope
- Güvenli Araç İletişimi web arayüzünde Remix Icon kullanımı.
- İlk bildirim + sonraki ziyaretçi mesajlarının aynı anonim oturumda saklanması.
- Web sohbetinin yaklaşık 1 saniyelik canlı yenilemesi ve ardışık mesaj desteği.
- Mobil Bildirim Merkezi'nde ilk 5 kayıt + her `Daha Fazla` dokunuşunda 5 ek kayıt.
- Mobil tarafta anonim mesaj dizisinin görünmesi, hızlı cevapların tekrar tekrar kullanılabilmesi ve serbest mesaj gönderimi.
- `drabornpark_messages` ve iletişim oturumlarının Supabase Realtime yayını.
- Uygulama açıkken yeni ziyaretçi mesajının Android sistem bildirimi olarak gösterilmesi.
- Canlı Edge Function ve repository migration aynasının eşit tutulması.

## Release identity
- App version: `0.5.1`
- Android versionCode: `17`
- Developer client: Expo SDK 57 / `--dev-client`
- Notification channel: `drabornpark-alerts-v2`
- Worklets native/JS parity: `0.10.1`

## CI gates
- `npm run check`
- `npx expo install --check`
- `npm run typecheck`
- Expo web export
- Git tracked-source cleanliness
- Android Developer APK build and signature verification
