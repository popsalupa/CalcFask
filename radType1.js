let currentView = 'program';
let edgeMode = 'g1';
let lastCalculatedParam = null;

// Универсальная смена знака ± для мобильных
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

// Автозамена запятой на точку
document.querySelectorAll('input[type="text"]').forEach(input => {
  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(',', '.');
    updateBlueprintPreview();
  });
});

// Чекбокс опции на кромке B
const chkEdgeB = document.getElementById('chk-edge-b');
const edgeBFields = document.getElementById('edge-b-fields');
const valEdgeB = document.getElementById('val-edge-b');
const hintEdgeB = document.getElementById('hint-edge-b');

if (chkEdgeB) {
  chkEdgeB.addEventListener('change', () => {
    const active = chkEdgeB.checked;
    edgeBFields.style.display = active ? 'flex' : 'none';
    if (!active && valEdgeB) valEdgeB.value = '';
    if (hintEdgeB) hintEdgeB.style.display = active ? 'none' : 'block';
    calculate();
  });
}

function setEdgeMode(mode) {
  edgeMode = mode;
  document.getElementById('btn-edge-g1').classList.toggle('active', mode === 'g1');
  document.getElementById('btn-edge-arc').classList.toggle('active', mode === 'arc');
  calculate();
}

function setViewMode(mode) {
  currentView = mode;
  document.getElementById('tab-program').classList.toggle('active', mode === 'program');
  document.getElementById('tab-point').classList.toggle('active', mode === 'point');
  calculate();
}

// Кнопка Clean
document.getElementById('btn-clean').addEventListener('click', () => {
  ['in-d', 'in-r', 'in-l', 'in-cr', 'val-edge-b'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('in-z0').value = '0.0';
  lastCalculatedParam = null;

  if (chkEdgeB) chkEdgeB.checked = false;
  if (edgeBFields) edgeBFields.style.display = 'none';
  if (hintEdgeB) hintEdgeB.style.display = 'block';

  document.getElementById('output-box').querySelector('code').textContent = 'Нажмите «Рассчитать G-код»...';
  updateBlueprintPreview();
});

// Расчет геометрии купола (3 параметра: D, R, L)
function calcParam(target, silent = false) {
  let d = parseFloat(document.getElementById('in-d').value);
  let r = parseFloat(document.getElementById('in-r').value);
  let l = parseFloat(document.getElementById('in-l').value);

  if (target === 'R') {
    // 2*R*L = (D/2)^2 + L^2 => R = (D^2/4 + L^2) / (2*L)
    if (!isNaN(d) && !isNaN(l) && l > 0 && d > 0) {
      const radD = d / 2;
      const calcR = (radD * radD + l * l) / (2 * l);
      document.getElementById('in-r').value = calcR.toFixed(3);
      lastCalculatedParam = 'R';
    } else if (!silent) alert('Для расчёта R укажите диаметр D и длину L');
  } else if (target === 'L') {
    // L = R - sqrt(R^2 - (D/2)^2)
    if (!isNaN(d) && !isNaN(r) && r > 0 && d > 0) {
      const radD = d / 2;
      if (r >= radD) {
        const calcL = r - Math.sqrt(r * r - radD * radD);
        document.getElementById('in-l').value = calcL.toFixed(3);
        lastCalculatedParam = 'L';
      } else if (!silent) alert('Геометрически невозможно: радиус R сферы не может быть меньше радиуса детали D/2');
    } else if (!silent) alert('Для расчёта L укажите диаметр D и радиус R');
  } else if (target === 'D') {
    // (D/2)^2 = 2*R*L - L^2 => D = 2 * sqrt(2*R*L - L^2)
    if (!isNaN(r) && !isNaN(l) && r > 0 && l > 0) {
      const under = 2 * r * l - l * l;
      if (under >= 0) {
        document.getElementById('in-d').value = (2 * Math.sqrt(under)).toFixed(3);
        lastCalculatedParam = 'D';
      } else if (!silent) alert('Геометрически невозможно: длина L не может превышать 2*R');
    } else if (!silent) alert('Для расчёта D укажите радиус R и длину L');
  }

  updateBlueprintPreview();
}

// Масштабирование чертежа купола
function updateBlueprintPreview() {
  const d = parseFloat(document.getElementById('in-d').value) || 6;
  const l = parseFloat(document.getElementById('in-l').value) || 1;

  const svgContour = document.getElementById('part-contour');
  const svgArc = document.getElementById('part-arc');
  const ptB = document.getElementById('pt-b');
  const lblB = document.getElementById('lbl-b');
  const ptA = document.getElementById('pt-a');
  const lblA = document.getElementById('lbl-a');
  const dimL = document.getElementById('dim-l');
  const extLb = document.getElementById('ext-l-b');
  const txtL = document.getElementById('txt-l');
  const dimD = document.getElementById('dim-d');
  const extD = document.getElementById('ext-d');
  const txtD = document.getElementById('txt-d');
  const ptCenter = document.getElementById('pt-center');
  const lineR = document.getElementById('line-r');
  const txtR = document.getElementById('txt-r-lbl');

  if (!svgContour) return;

  const zFace = 260;
  const zAxis = 85;
  const pyB = 35;

  const deltaZ = Math.min(Math.max((l / (d || 6)) * 140, 24), 85);
  const pxB = zFace - deltaZ;
  const radY = zAxis - pyB;

  svgContour.setAttribute('d', `M 45 ${zAxis} L 45 ${pyB} L ${pxB} ${pyB} A ${deltaZ} ${radY} 0 0 1 ${zFace} ${zAxis} Z`);
  svgArc.setAttribute('d', `M ${pxB} ${pyB} A ${deltaZ} ${radY} 0 0 1 ${zFace} ${zAxis}`);

  ptB.setAttribute('cx', pxB);
  ptB.setAttribute('cy', pyB);
  lblB.setAttribute('x', pxB - 6);
  lblB.setAttribute('y', pyB - 9);

  ptA.setAttribute('cx', zFace);
  ptA.setAttribute('cy', zAxis);
  lblA.setAttribute('x', zFace + 6);
  lblA.setAttribute('y', zAxis + 4);

  dimL.setAttribute('x1', pxB);
  dimL.setAttribute('x2', zFace);
  extLb.setAttribute('x1', pxB);
  extLb.setAttribute('x2', pxB);
  txtL.setAttribute('x', (pxB + zFace) / 2);

  ptCenter.setAttribute('cx', pxB);
  ptCenter.setAttribute('cy', zAxis);
  lineR.setAttribute('x1', pxB);
  lineR.setAttribute('y1', zAxis);
  lineR.setAttribute('x2', pxB + deltaZ * 0.65);
  lineR.setAttribute('y2', zAxis - radY * 0.65);
  txtR.setAttribute('x', pxB + 10);
  txtR.setAttribute('y', zAxis - 18);
}

// Главная функция расчета УП (вызывается кнопкой «Рассчитать G-код»)
function calculate() {
  let d = parseFloat(document.getElementById('in-d').value);
  let r = parseFloat(document.getElementById('in-r').value);
  let l = parseFloat(document.getElementById('in-l').value);

  // 1. Автоматический расчет недостающего параметра или актуализация зависимого
  if (isNaN(r) && !isNaN(d) && !isNaN(l)) {
    calcParam('R', true);
  } else if (isNaN(l) && !isNaN(d) && !isNaN(r)) {
    calcParam('L', true);
  } else if (isNaN(d) && !isNaN(r) && !isNaN(l)) {
    calcParam('D', true);
  } else if (lastCalculatedParam) {
    calcParam(lastCalculatedParam, true);
  }

  // Обновляем числа после расчета
  d = parseFloat(document.getElementById('in-d').value);
  r = parseFloat(document.getElementById('in-r').value);
  l = parseFloat(document.getElementById('in-l').value);

  const rawCr = document.getElementById('in-cr').value.trim();
  const cr = rawCr !== '' ? (parseFloat(rawCr) || 0) : 0;
  const z0 = parseFloat(document.getElementById('in-z0').value) || 0;

  const hasEdgeB = chkEdgeB && chkEdgeB.checked && parseFloat(valEdgeB.value) > 0;
  const edgeVal = hasEdgeB ? parseFloat(valEdgeB.value) : 0;

  const out = document.getElementById('output-box').querySelector('code');

  if (isNaN(d) || isNaN(r) || isNaN(l) || d <= 0 || r <= 0 || l <= 0) {
    out.textContent = '; Заполните минимум 2 параметра из 3 (D, R, L)';
    return;
  }

  // Эквидистанта инструмента T3
  const effR = r + cr;
  const effL = l + cr;
  const xPipCut = cr > 0 ? -(2 * cr) : 0; // Срез центрального выступа пластиной
  const zEndDome = z0 - effL;

  if (currentView === 'point') {
    out.textContent = 
`[ Опорные точки купола ]
D детали: ${d.toFixed(3)} мм | R сферы: ${r.toFixed(3)} мм | L купола: ${l.toFixed(3)} мм
Пластина r: ${cr > 0 ? cr.toFixed(3) + ' мм (T3)' : 'Без коррекции'}

Точка A (вершина сферы):
  X: ${xPipCut.toFixed(3)} мм
  Z: ${z0.toFixed(3)} мм

Точка B (выход на диаметр D):
  X: ${d.toFixed(3)} мм
  Z: ${zEndDome.toFixed(3)} мм
  R в кадре УП: ${effR.toFixed(3)} мм`;
    return;
  }

  let lines = [];
  lines.push(`; --- ВИД 01: СФЕРИЧЕСКИЙ КУПОЛ R${fmt(r)} ---`);
  lines.push(`G00 X${fmt(xPipCut)} Z${fmt(z0 + 1.0)}`);
  lines.push(`G01 Z${fmt(z0)} F0.1`);

  // Движение по сфере из центра к диаметру детали
  if (!hasEdgeB) {
    lines.push(`G02 X${fmt(d)} Z${fmt(zEndDome)} R${fmt(effR)} F0.04`);
  } else {
    // С микроэлементом на кромке B
    if (edgeMode === 'g1') {
      const zDomeCut = zEndDome + edgeVal;
      const xDomeCut = d - 2 * edgeVal;
      lines.push(`G02 X${fmt(xDomeCut)} Z${fmt(zDomeCut)} R${fmt(effR)} F0.04`);
      lines.push(`G01 X${fmt(d)} Z${fmt(zEndDome - edgeVal)} F0.03`);
    } else {
      const effEdgeR = edgeVal + cr;
      const zDomeCut = zEndDome + edgeVal;
      const xDomeCut = d - 2 * edgeVal;
      lines.push(`G02 X${fmt(xDomeCut)} Z${fmt(zDomeCut)} R${fmt(effR)} F0.04`);
      lines.push(`G03 X${fmt(d)} Z${fmt(zEndDome - edgeVal)} R${fmt(effEdgeR)} F0.03`);
    }
  }

  lines.push(`G01 Z${fmt(zEndDome - 1.5)} F0.06`);
  lines.push(`G00 X${fmt(d + 1.5)} Z${fmt(z0 + 2.0)}`);

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