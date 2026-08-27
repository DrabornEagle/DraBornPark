import fs from 'node:fs';
const dkd_read=dkd_file=>fs.readFileSync(dkd_file,'utf8');
const dkd_write=(dkd_file,dkd_text)=>fs.writeFileSync(dkd_file,dkd_text);
const dkd_replace=(dkd_text,dkd_from,dkd_to,dkd_label)=>{if(!dkd_text.includes(dkd_from))throw new Error(`v1.0.21 server transform missing: ${dkd_label}`);return dkd_text.replace(dkd_from,dkd_to)};

const dkd_google_file='supabase/functions/dkd-drabornpark-google-play/index.ts';
let dkd_google=dkd_read(dkd_google_file).replace('const VERSION="1.0.20";','const VERSION="1.0.21";');
dkd_google=dkd_replace(dkd_google,'if(existing&&existing.user_id!==user.id)return json({error:"purchase_already_claimed"},409);','if(existing&&existing.user_id!==user.id)return json({error:"purchase_already_claimed",accountBound:true,requiresDifferentGooglePlayAccount:true},409);','claimed-token response');
dkd_google=dkd_replace(dkd_google,'const obfuscated=String(google?.externalAccountIdentifiers?.obfuscatedExternalAccountId??"");const expectedObfuscated=user.id.replace(/-/g,"");const externalAccountMatched=!obfuscated||obfuscated===expectedObfuscated;if(!externalAccountMatched&&!existing&&action!=="restore")return json({error:"account_mismatch",legacyRestoreRequired:true},403);','const obfuscated=String(google?.externalAccountIdentifiers?.obfuscatedExternalAccountId??"");const expectedObfuscated=user.id.replace(/-/g,"");const externalAccountMatched=Boolean(obfuscated)&&obfuscated===expectedObfuscated;if(!existing&&!externalAccountMatched)return json({error:obfuscated?"account_mismatch":"purchase_missing_account_binding",accountBound:true,requiresFreshPurchase:true},403);','strict Google account binding');
dkd_write(dkd_google_file,dkd_google);

const dkd_version_file='supabase/functions/dkd-drabornpark-app-version/index.ts';
let dkd_version=dkd_read(dkd_version_file).replace('const FALLBACK_VERSION="1.0.20";','const FALLBACK_VERSION="1.0.21";').replace('const FALLBACK_VERSION_CODE=20;','const FALLBACK_VERSION_CODE=21;');
dkd_write(dkd_version_file,dkd_version);
console.log('DraBornPark v1.0.21 server billing transform complete.');
