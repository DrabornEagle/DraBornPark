const replacements = [
  ['PRIVATE VEHICLE NETWORK', 'ÖZEL ARAÇ AĞI'],
  ['NOVA CONTROL', 'NOVA KONTROL'],
  ['Factory Panel', 'Üretim Paneli'],
  ['DraBorn Insights', 'DraBorn İstatistikleri'],
  ['Demo state\'iyle', 'Demo durumuyla'],
  ['Tam Demo Workspace', 'Tam Demo Çalışma Alanı'],
  ['TAM DEMO WORKSPACE', 'TAM DEMO ÇALIŞMA ALANI'],
  ['WEB DEMO', 'WEB DEMOSU'],
  ['Privacy First', 'Gizlilik Öncelikli'],
  ['Tag ID', 'Etiket ID'],
  ['Timeline', 'Araç Geçmişi'],
  ['Family', 'Aile'],
  ['Insights', 'İstatistikler'],
  ['Workspace', 'Çalışma Alanı'],
  ['Factory', 'Üretim'],
  ['Pulse', 'Durum Özeti'],
  ['BASIC', 'TEMEL'],
  ['Basic', 'Temel'],
  ['Premium özellikler', 'Gelişmiş özellikler'],
  ['Premium', 'Gelişmiş'],
  ['Care', 'Destek'],
  ['Dashboard', 'Gösterge Paneli'],
  ['v0.4.0', 'v0.4.3'],
  ['v0.4.1', 'v0.4.3'],
  ['v0.4.2', 'v0.4.3'],
];
const DISPLAY_KEYS = new Set(['title','subtitle','detail','body','label','caption','eyebrow','placeholder','description','text','message']);

function translate(value) {
  if (typeof value !== 'string') return value;
  let next = value;
  for (const [from, to] of replacements) next = next.split(from).join(to);
  return next;
}
function isDisplayString(path){
  if(path.findParent(p=>p.isJSXExpressionContainer?.()||p.isJSXAttribute?.())) return true;
  const parent=path.parentPath;
  if(parent?.isObjectProperty?.()){
    const key=parent.node.key;
    const name=key?.name||key?.value;
    return DISPLAY_KEYS.has(String(name));
  }
  if(parent?.isCallExpression?.()){
    const callee=parent.node.callee;
    return callee?.type==='MemberExpression'&&callee.property?.name==='alert';
  }
  return false;
}

module.exports = function drabornparkTurkishUi() {
  return {
    name: 'drabornpark-turkish-ui',
    visitor: {
      StringLiteral(path) {
        if(!isDisplayString(path)) return;
        const next = translate(path.node.value);
        if (next !== path.node.value) path.node.value = next;
      },
      JSXText(path) {
        const next = translate(path.node.value);
        if (next !== path.node.value) path.node.value = next;
      },
      TemplateElement(path) {
        if(!path.findParent(p=>p.isJSXExpressionContainer?.())) return;
        const raw = translate(path.node.value.raw);
        const cooked = translate(path.node.value.cooked);
        if (raw !== path.node.value.raw || cooked !== path.node.value.cooked) {
          path.node.value.raw = raw;
          path.node.value.cooked = cooked;
        }
      },
    },
  };
};
