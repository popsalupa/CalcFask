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
  });
});

const chkCr = document.getElementById('chk-cr');
const boxCr = document.getElementById('box-cr');
const valCr = document.getElementById('val-cr');

if (chkCr) {
  chkCr.addEventListener('change', () => {
    boxCr.style.display = chkCr.checked ? 'block' : 'none';
    if (!chkCr.checked && valCr) valCr.value = '';
    calculate();
  });
}

function setViewMode(mode) {
  currentView = mode;
  document.getElementById('tab-program').classList.toggle('active', mode === 'program');
  document.getElementById('tab-point').classList.toggle('active', mode === 'point');
  calculate();
}

document.getElementById('btn-clean').addEventListener('click', () => {
  ['in-d-big', 'in-d-small', 'in-l', 'in-r', 'val-cr', 'in-z0'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  if (chkCr) {
    chkCr.checked = false;
    boxCr.style.display = 'none';
  }

  document.getElementById('output-box').querySelector('code').textContent = 'Нажмите «Рассчитать G-код»...';
  updateBlueprintPreview();
});

function updateBlueprintPreview() {
  const D = parseFloat(document.getElementById('in-d-big').value) || 12;
  const d = parseFloat(document.getElementById('in-d-small').value) || 5.5;
  const L = parseFloat(document.getElementById('in-l').value) || 12;
  const R = parseFloat(document.getElementById('in-r').value) || 1;

  const svgContour = document.getElementById('part-contour');
  const arcEl = document.getElementById('part-arc');
  const ptA = document.getElementById('pt-a');
  const lblA = document.getElementById('lbl-a');
  const ptB = document.getElementById('pt-b');
  const lblB = document.getElementById('lbl-b');
  const ptC = document.getElementById('pt-c');
  const lblC = document.getElementById('lbl-c');
  const ptCenter = document.getElementById('pt-center');
  const lineR = document.getElementById('line-r');
  const txtR = document.getElementById('txt-r-lbl');

  if (!svgContour) return;

  const zAxis = 130;
  const pyD = 35;

  const deltaDia = Math.max(0.2, (D - d) / 2);
  const scaleY = 60 / (deltaDia || 3);
  const pyDsmall = Math.min(Math.max(pyD + deltaDia * scaleY, 65), 105);

  const pxFace = 260;
  const deltaZ = Math.min(Math.max((L / (D || 12)) * 130, 60), 125);
  const pxShoulder = pxFace - deltaZ;

  const rSvg = Math.min(Math.max((R / (D || 12)) * 130, 15), 35);
  const pxA = pxShoulder + rSvg;
  const pyB = pyDsmall - rSvg;

  svgContour.setAttribute('d', `M 45 ${zAxis} L 45 ${pyD} L ${pxShoulder} ${pyD} L ${pxShoulder} ${pyB} A ${rSvg} ${rSvg} 0 0 0 ${pxA} ${pyDsmall} L ${pxFace} ${pyDsmall} L ${pxFace} ${zAxis} Z`);
  arcEl.setAttribute('d', `M ${pxA} ${pyDsmall} A ${rSvg} ${rSvg} 0 0 1 ${pxShoulder} ${pyB}`);

  ptA.setAttribute('cx', pxA);
  ptA.setAttribute('cy', pyDsmall);
  lblA.setAttribute('x', pxA + 5);
  lblA.setAttribute('y', pyDsmall + 12);

  ptB.setAttribute('cx', pxShoulder);
  ptB.setAttribute('cy', pyB);
  lblB.setAttribute('x', pxShoulder - 12);
  lblB.setAttribute('y', pyB + 4);

  ptC.setAttribute('cx', pxShoulder);
  ptC.setAttribute('cy', pyD);
  lblC.setAttribute('x', pxShoulder - 12);
  lblC.setAttribute('y', pyD - 4);

  ptCenter.setAttribute('cx', pxShoulder);
  ptCenter.setAttribute('cy', pyDsmall);
  lineR.setAttribute('x1', pxShoulder);
  lineR.setAttribute('y1', pyDsmall);
  lineR.setAttribute('x2', pxShoulder + rSvg * 0.7);
  lineR.setAttribute('y2', pyDsmall - rSvg * 0.7);
  txtR.setAttribute('x', pxShoulder + rSvg * 0.35);
  txtR.setAttribute('y', pyDsmall - 6);

  document.getElementById('dim-l').setAttribute('x1', pxShoulder);
  document.getElementById('dim-l').setAttribute('x2', pxFace);
  document.getElementById('ext-l-shoulder').setAttribute('x1', pxShoulder);
  document.getElementById('ext-l-shoulder').setAttribute('x2', pxShoulder);
  document.getElementById('ext-l-face').setAttribute('x1', pxFace);
  document.getElementById('ext-l-face').setAttribute('x2', pxFace);
  document.getElementById('txt-l').setAttribute('x', (pxShoulder + pxFace) / 2);

  document.getElementById('dim-d-small').setAttribute('y1', pyDsmall);
  document.getElementById('ext-d-small').setAttribute('y1', pyDsmall);
  document.getElementById('ext-d-small').setAttribute('y2', pyDsmall);
  document.getElementById('txt-d-small').setAttribute('y', (pyDsmall + zAxis) / 2 + 3);
}

function calculate() {
  const D = parseFloat(document.getElementById('in-d-big').value);
  const d = parseFloat(document.getElementById('in-d-small').value);
  const L = parseFloat(document.getElementById('in-l').value);
  const R = parseFloat(document.getElementById('in-r').value);
  const z0 = parseFloat(document.getElementById('in-z0').value) || 0;

  const crActive = chkCr && chkCr.checked;
  const rawCr = valCr ? valCr.value.trim() : '';
  const cr = (crActive && rawCr !== '' && !isNaN(parseFloat(rawCr)) && parseFloat(rawCr) > 0)
    ? parseFloat(rawCr)
    : 0;

  const out = document.getElementById('output-box').querySelector('code');

  if (isNaN(D) || isNaN(d) || isNaN(L) || isNaN(R)) {
    return;
  }

  if (D <= d || L <= 0 || R <= 0) {
    out.textContent = '; Ошибка: D должен быть больше d, размеры L и R > 0';
    return;
  }

  if (cr >= R && cr > 0) {
    out.textContent = `; Ошибка: радиус пластины r (${cr}) должен быть меньше радиуса скругления R (${R})`;
    return;
  }

  const R1 = R - cr;
  const z1Rel = L - R1;
  const x2 = d + 2 * R1;
  const z2Rel = L;

  const Z_startArc = z0 - z1Rel;
  const Z_endArc = z0 - z2Rel;

  if (currentView === 'point') {
    out.textContent = 
`[ Опорные точки по методичке ]
D буртика:    ${D.toFixed(3)} мм
d шейки:      ${d.toFixed(3)} мм
L до буртика: ${L.toFixed(3)} мм
R галтели:    ${R.toFixed(3)} мм
Пластина r:   ${cr > 0 ? cr.toFixed(3) + ' мм (T3)' : 'Отключена'}

R1 (в УП) = R - r = ${R1.toFixed(3)} мм
Точка A (старт радиуса): X: ${d.toFixed(3)}   Z: ${Z_startArc.toFixed(3)}
Точка B (конец радиуса): X: ${x2.toFixed(3)}   Z: ${Z_endArc.toFixed(3)}
Точка C (выход на D):    X: ${D.toFixed(3)}  Z: ${Z_endArc.toFixed(3)}`;
    return;
  }

  const lines = [
    `; --- ВИД 03: ВНУТРЕННЯЯ ГАЛТЕЛЬ R${fmt(R)}${cr > 0 ? ` (T3 r=${fmt(cr)})` : ''} ---`,
    `G00 X${fmt(d)} Z${fmt(z0 + 1.0)}`,
    `G01 Z${fmt(z0)} F0.1`,
    `G01 Z${fmt(Z_startArc)} F0.08`,
    `G02 X${fmt(x2)} Z${fmt(Z_endArc)} R${fmt(R1)} F0.04`,
    `G01 X${fmt(D)} F0.08`
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