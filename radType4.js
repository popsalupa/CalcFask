let currentView = 'program';

function toggleSign(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  let val = input.value.trim();
  if (val.startsWith('-')) {
    input.value = val.substring(1);
  } else if (val !== '') {
    input.value = '-' + val;
  } else {
    input.value = '-';
  }
  input.dispatchEvent(new Event('input'));
}

document.querySelectorAll('input[type="text"]').forEach(input => {
  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(',', '.');
    updateBlueprintPreview();
    calculate();
  });
});

function setViewMode(mode) {
  currentView = mode;
  document.getElementById('tab-program').classList.toggle('active', mode === 'program');
  document.getElementById('tab-point').classList.toggle('active', mode === 'point');
  calculate();
}

document.getElementById('btn-clean').addEventListener('click', () => {
  ['in-d', 'in-l', 'in-len-head', 'in-r', 'in-cr', 'in-n', 'in-xa', 'in-z0'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.getElementById('output-box').querySelector('code').textContent = 'Нажмите «Рассчитать G-код»...';
  updateBlueprintPreview();
});

// Интерактивный чертеж: R выполнен сноской со стрелкой к дуге
function updateBlueprintPreview() {
  const D = parseFloat(document.getElementById('in-d').value) || 5.4;
  const L = parseFloat(document.getElementById('in-l').value) || 7;
  const lHead = parseFloat(document.getElementById('in-len-head').value) || 1.5;
  const R = parseFloat(document.getElementById('in-r').value) || 4;

  const svgContour = document.getElementById('part-contour');
  const arcEl = document.getElementById('part-arc');
  const ptA = document.getElementById('pt-a');
  const ptC = document.getElementById('pt-c');
  const leaderR = document.getElementById('leader-r');
  const txtR = document.getElementById('txt-r-lbl');

  if (!svgContour) return;

  const zAxis = 115;
  const radHead = 48;
  const pyA = zAxis - radHead;

  const radShank = 22;
  const pyShank = zAxis - radShank;

  const ratioR = Math.max(R / (D / 2.0), 1.02);
  const R_svg = radHead * ratioR;

  const pxTip = 85;
  const cx = pxTip + R_svg;

  const underA = Math.max(0, R_svg * R_svg - radHead * radHead);
  const pxA = cx - Math.sqrt(underA);

  const cylLand = Math.max(12, (lHead / (D || 5.4)) * 35);
  const pxShoulder = pxA + cylLand;

  const pxRight = pxTip + Math.min(Math.max((L / (D || 5.4)) * 70, 140), 195);

  svgContour.setAttribute('d', `M ${pxTip} ${zAxis} A ${R_svg} ${R_svg} 0 0 1 ${pxA} ${pyA} L ${pxShoulder} ${pyA} L ${pxShoulder} ${pyShank} L ${pxRight} ${pyShank} L ${pxRight} ${zAxis} Z`);
  arcEl.setAttribute('d', `M ${pxTip} ${zAxis} A ${R_svg} ${R_svg} 0 0 1 ${pxA} ${pyA}`);

  // Опорные точки C и A
  ptC.setAttribute('cx', pxTip);
  ptC.setAttribute('cy', zAxis);

  ptA.setAttribute('cx', pxA);
  ptA.setAttribute('cy', pyA);

  // Динамическая выноска (сноска) R — всегда указывает на середину дуги и не касается контура
  const targetX = (pxTip + pxA) / 2 - 2;
  const targetY = (zAxis + pyA) / 2 - 2;
  const bendX = targetX - 16;
  const bendY = pyA - 15;
  const shelfX = bendX - 18;

  leaderR.setAttribute('d', `M ${shelfX} ${bendY} L ${bendX} ${bendY} L ${targetX} ${targetY}`);
  txtR.setAttribute('x', shelfX + 4);
  txtR.setAttribute('y', bendY - 4);

  // Размеры
  document.getElementById('dim-d').setAttribute('y1', pyA);
  document.getElementById('dim-d').setAttribute('y2', zAxis);
  document.getElementById('ext-d').setAttribute('y1', pyA);
  document.getElementById('ext-d').setAttribute('y2', pyA);
  document.getElementById('ext-d').setAttribute('x2', pxA);
  document.getElementById('txt-d').setAttribute('y', (pyA + zAxis) / 2 + 4);

  document.getElementById('dim-len-head').setAttribute('x1', pxTip);
  document.getElementById('dim-len-head').setAttribute('x2', pxShoulder);
  document.getElementById('ext-lh-tip').setAttribute('x1', pxTip);
  document.getElementById('ext-lh-tip').setAttribute('x2', pxTip);
  document.getElementById('ext-lh-sh').setAttribute('x1', pxShoulder);
  document.getElementById('ext-lh-sh').setAttribute('x2', pxShoulder);
  document.getElementById('ext-lh-sh').setAttribute('y1', pyShank);
  document.getElementById('txt-lh').setAttribute('x', (pxTip + pxShoulder) / 2);

  document.getElementById('dim-l').setAttribute('x1', pxTip);
  document.getElementById('dim-l').setAttribute('x2', pxRight);
  document.getElementById('ext-l-end').setAttribute('x1', pxRight);
  document.getElementById('ext-l-end').setAttribute('x2', pxRight);
  document.getElementById('ext-l-end').setAttribute('y1', pyShank);
  document.getElementById('txt-l').setAttribute('x', (pxTip + pxRight) / 2);
}

// Расчет G-кода в строгом соответствии с формулами методички
function calculate() {
  const D1 = parseFloat(document.getElementById('in-d').value);
  const L = parseFloat(document.getElementById('in-l').value);
  const l = parseFloat(document.getElementById('in-len-head').value);
  const R = parseFloat(document.getElementById('in-r').value);
  const r = parseFloat(document.getElementById('in-cr').value) || 0;
  const n = parseFloat(document.getElementById('in-n').value) || 0;
  const z0 = parseFloat(document.getElementById('in-z0').value) || 0;

  // Если Xa не введен, подставляем стандартное значение (1.2 для небольших диаметров или 2.0)
  const rawXa = document.getElementById('in-xa').value.trim();
  const Xa = rawXa !== '' ? parseFloat(rawXa) : (D1 <= 6 ? 1.2 : 2.0);

  const out = document.getElementById('output-box').querySelector('code');

  if (isNaN(D1) || isNaN(L) || isNaN(l) || isNaN(R)) {
    return;
  }

  if (D1 <= 0 || L <= 0 || l <= 0 || R <= 0 || Xa <= 0) {
    out.textContent = '; Ошибка: проверьте размеры (значения должны быть > 0)';
    return;
  }

  // Формулы из методички:
  // 1. R1 = R + r
  // 2. Za = R1 - sqrt(R1^2 - (Xa/2)^2)
  // 3. Z_буртик = L
  // 4. Z_торец = L + l
  // 5. Z1 (точка сопряжения) = L + n - Za
  // 6. Z_вершина = L + l
  const R1 = R + r;
  const halfXa = Xa / 2;

  if (halfXa >= R1) {
    out.textContent = '; Ошибка: диаметр зареза Xa превышает диаметр сферы 2*R1';
    return;
  }

  const Za = R1 - Math.sqrt(R1 * R1 - halfXa * halfXa);

  const Z_shoulder = z0 + L;
  const Z_face = z0 + L + l;
  const Z1 = z0 + L + n - Za;
  const Z_apex = Z_face;

  const X_lead = D1 + 0.5;
  const X_turn = D1 + 0.2;

  if (currentView === 'point') {
    out.textContent = 
`[ Расчетные параметры по методичке ]
R1 (в УП) = R + r = ${R1.toFixed(3)} мм
Za (стрела прогиба) = ${Za.toFixed(3)} мм
Z1 (координата скругления) = ${Z1.toFixed(3)} мм

[ Опорные точки ]
Торец / подвод:     X: ${X_lead.toFixed(3)}   Z: ${Z_face.toFixed(3)}
Глубина зареза:     X: ${Xa.toFixed(3)}   Z: ${Z_face.toFixed(3)}
Буртик головки:     X: ${X_turn.toFixed(3)}   Z: ${Z_shoulder.toFixed(3)}
Точка сопряжения B: X: ${Xa.toFixed(3)}   Z: ${Z1.toFixed(3)}
Вершина сферы C:    X: 0.000   Z: ${Z_apex.toFixed(3)}
Срез бобышки:       X: -0.500  Z: ${Z_apex.toFixed(3)}`;
    return;
  }

  // G-код в точности как в эталонном расчете
  const lines = [
    `G00 X${fmt(X_lead)} Z${fmt(Z_face)}`,
    `G01 X${fmt(Xa)} F0.08`,
    `G01 X${fmt(X_turn)} F0.15`,
    `G01 Z${fmt(Z_shoulder)} F0.08`,
    `G03 X${fmt(Xa)} Z${fmt(Z1)} R${fmt(R1)} F0.04`,
    `G03 X0 Z${fmt(Z_apex)} R${fmt(R1)} F0.04`,
    `G01 X-0.5 F0.05`
  ];

  out.textContent = lines.join('\n');
}

function fmt(n) {
  return Number(n.toFixed(3)).toString();
}

function copyCode() {
  const code = document.getElementById('output-box').querySelector('code').textContent;
  if (!code || code.startsWith('Нажмите') || code.startsWith(';')) return;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('btn-copy');
    const old = btn.textContent;
    btn.textContent = 'Скопировано!';
    setTimeout(() => btn.textContent = old, 1500);
  });
}

window.addEventListener('DOMContentLoaded', updateBlueprintPreview);