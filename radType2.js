let currentView = 'program';
let lastCalculatedParam = null;

// Универсальная смена знака ± для мобильных устройств
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

// Слушатели инпутов
document.querySelectorAll('input[type="text"]').forEach(input => {
  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(',', '.');
    updateBlueprintPreview();
  });
});

// Чекбокс r пластины (T3)
const chkCr = document.getElementById('chk-cr');
const boxCr = document.getElementById('box-cr');
const valCr = document.getElementById('val-cr');

if (chkCr) {
  chkCr.addEventListener('change', () => {
    boxCr.style.display = chkCr.checked ? 'block' : 'none';
    if (!chkCr.checked) valCr.value = '';
    calculate();
  });
}

// Чекбокс R2 (микроскругление)
const chkR2 = document.getElementById('chk-r2');
const boxR2 = document.getElementById('box-r2');
const valR2 = document.getElementById('val-r2');

if (chkR2) {
  chkR2.addEventListener('change', () => {
    boxR2.style.display = chkR2.checked ? 'block' : 'none';
    if (!chkR2.checked) valR2.value = '';
    updateBlueprintPreview();
    calculate();
  });
}

function setViewMode(mode) {
  currentView = mode;
  document.getElementById('tab-program').classList.toggle('active', mode === 'program');
  document.getElementById('tab-point').classList.toggle('active', mode === 'point');
  calculate();
}

// Очистка формы
document.getElementById('btn-clean').addEventListener('click', () => {
  ['in-d1', 'in-d2', 'in-r1', 'in-l1', 'val-r2', 'val-cr'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('in-z0').value = '0.0';
  lastCalculatedParam = null;

  if (chkR2) {
    chkR2.checked = false;
    boxR2.style.display = 'none';
  }
  if (chkCr) {
    chkCr.checked = false;
    boxCr.style.display = 'none';
  }

  document.getElementById('output-box').querySelector('code').textContent = 'Нажмите «Рассчитать G-код»...';
  updateBlueprintPreview();
});

// Расчет 3 из 4 параметров геометрии (D1, d2, R1, L1)
function calcParam(target, silent = false) {
  let d1 = parseFloat(document.getElementById('in-d1').value);
  let d2 = parseFloat(document.getElementById('in-d2').value);
  let r1 = parseFloat(document.getElementById('in-r1').value);
  let l1 = parseFloat(document.getElementById('in-l1').value);

  if (target === 'D1') {
    if (!isNaN(d2) && !isNaN(r1) && !isNaN(l1) && r1 >= l1 && l1 > 0) {
      const under = Math.max(0, r1 * r1 - l1 * l1);
      let delta = r1 - Math.sqrt(under);
      if (document.getElementById('in-d1').value && parseFloat(document.getElementById('in-d1').value) > d2 + 2 * r1) {
        delta = r1 + Math.sqrt(under);
      }
      document.getElementById('in-d1').value = (d2 + 2 * delta).toFixed(3);
      lastCalculatedParam = 'D1';
    } else if (!silent) {
      alert('Для расчёта D1 укажите d2, R1 и L1');
    }
  } else if (target === 'd2') {
    if (!isNaN(d1) && !isNaN(r1) && !isNaN(l1) && r1 >= l1 && l1 > 0) {
      const under = Math.max(0, r1 * r1 - l1 * l1);
      let delta = r1 - Math.sqrt(under);
      if (d1 - 2 * delta < 0 || (d1 - d2) / 2 > r1) {
        delta = r1 + Math.sqrt(under);
      }
      document.getElementById('in-d2').value = (d1 - 2 * delta).toFixed(3);
      lastCalculatedParam = 'd2';
    } else if (!silent) {
      alert('Для расчёта d2 укажите D1, R1 и L1');
    }
  } else if (target === 'R1') {
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(l1) && d1 > d2 && l1 > 0) {
      const delta = (d1 - d2) / 2;
      const calcR = (l1 * l1 + delta * delta) / (2 * delta);
      document.getElementById('in-r1').value = calcR.toFixed(3);
      lastCalculatedParam = 'R1';
    } else if (!silent) {
      alert('Для расчёта R1 укажите D1, d2 и L1');
    }
  } else if (target === 'L1') {
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(r1) && d1 > d2 && r1 > 0) {
      const delta = (d1 - d2) / 2;
      const underSqrt = 2 * r1 * delta - delta * delta;
      if (underSqrt >= 0) {
        document.getElementById('in-l1').value = Math.sqrt(underSqrt).toFixed(3);
        lastCalculatedParam = 'L1';
      } else if (!silent) {
        alert('Радиус R1 слишком мал для такого перепада диаметров');
      }
    } else if (!silent) {
      alert('Для расчёта L1 укажите D1, d2 и R1');
    }
  }

  updateBlueprintPreview();
}

// Сглаженный аналитический чертеж без искажений
function updateBlueprintPreview() {
  const d1 = parseFloat(document.getElementById('in-d1').value) || 5;
  const d2 = parseFloat(document.getElementById('in-d2').value) || 2;
  const l1 = parseFloat(document.getElementById('in-l1').value) || 0.999;
  const hasR2 = chkR2 && chkR2.checked && parseFloat(valR2.value) > 0;

  const svgContour = document.getElementById('part-contour');
  const arcMain = document.getElementById('part-arc-main');
  const arcMicro = document.getElementById('part-arc-micro');
  const ptC = document.getElementById('pt-c');
  const lblC = document.getElementById('lbl-c');
  const ptB = document.getElementById('pt-b');
  const lblB = document.getElementById('lbl-b');
  const ptA = document.getElementById('pt-a');
  const lblA = document.getElementById('lbl-a');
  const grpR2 = document.getElementById('group-r2-lbl');

  if (!svgContour) return;

  const zFace = 260; 
  const zAxis = 130;
  const pyC = 38;

  const deltaDia = Math.max(0.1, (d1 - d2) / 2);
  const deltaZ = Math.min(Math.max((l1 / (d1 || 5)) * 140, 24), 85);
  const deltaX = Math.min(Math.max((deltaDia / (d1 || 5)) * 140, 18), 65);

  const pxC = zFace - deltaZ;
  const pxA = zFace;
  const pyA = pyC + deltaX;

  if (!hasR2) {
    svgContour.setAttribute('d', `M 45 ${zAxis} L 45 ${pyC} L ${pxC} ${pyC} A ${deltaZ} ${deltaX} 0 0 1 ${pxA} ${pyA} L ${pxA} ${zAxis} Z`);
    arcMain.setAttribute('d', `M ${pxC} ${pyC} A ${deltaZ} ${deltaX} 0 0 1 ${pxA} ${pyA}`);
    arcMicro.style.display = 'none';

    ptC.setAttribute('cx', pxC);
    ptC.setAttribute('cy', pyC);
    lblC.textContent = 'B';
    lblC.setAttribute('x', pxC - 6);
    lblC.setAttribute('y', pyC - 9);

    ptB.style.display = 'none';
    lblB.style.display = 'none';

    ptA.setAttribute('cx', pxA);
    ptA.setAttribute('cy', pyA);
    lblA.setAttribute('x', pxA + 6);
    lblA.setAttribute('y', pyA + 4);

    grpR2.style.display = 'none';
  } else {
    const tB = 0.62;
    const pxB = pxA - deltaZ * Math.cos(tB * (Math.PI / 2));
    const pyB = pyC + deltaX * (1 - Math.sin(tB * (Math.PI / 2)));

    svgContour.setAttribute('d', `M 45 ${zAxis} L 45 ${pyC} L ${pxC} ${pyC} A ${deltaZ} ${deltaX} 0 0 1 ${pxB} ${pyB} A ${deltaZ} ${deltaX} 0 0 1 ${pxA} ${pyA} L ${pxA} ${zAxis} Z`);
    arcMain.setAttribute('d', `M ${pxC} ${pyC} A ${deltaZ} ${deltaX} 0 0 1 ${pxB} ${pyB}`);
    arcMicro.setAttribute('d', `M ${pxB} ${pyB} A ${deltaZ} ${deltaX} 0 0 1 ${pxA} ${pyA}`);
    arcMicro.style.display = 'inline';

    ptC.setAttribute('cx', pxC);
    ptC.setAttribute('cy', pyC);
    lblC.textContent = 'C';
    lblC.setAttribute('x', pxC - 6);
    lblC.setAttribute('y', pyC - 9);

    ptB.style.display = 'inline';
    lblB.style.display = 'inline';
    ptB.setAttribute('cx', pxB);
    ptB.setAttribute('cy', pyB);
    lblB.setAttribute('x', pxB + 6);
    lblB.setAttribute('y', pyB - 6);

    ptA.setAttribute('cx', pxA);
    ptA.setAttribute('cy', pyA);
    lblA.setAttribute('x', pxA + 6);
    lblA.setAttribute('y', pyA + 4);

    grpR2.style.display = 'inline';
  }

  document.getElementById('dim-l1').setAttribute('x1', pxC);
  document.getElementById('dim-l1').setAttribute('x2', pxA);
  document.getElementById('ext-l1-b').setAttribute('x1', pxC);
  document.getElementById('ext-l1-b').setAttribute('x2', pxC);
  document.getElementById('txt-l1').setAttribute('x', (pxC + pxA) / 2);

  document.getElementById('dim-d2').setAttribute('y1', pyA);
  document.getElementById('ext-d2').setAttribute('y1', pyA);
  document.getElementById('ext-d2').setAttribute('y2', pyA);
  document.getElementById('txt-d2').setAttribute('y', (pyA + zAxis) / 2 + 3);
}

// Расчет опорных точек и G-кода Fanuc
function calculate() {
  let d1 = parseFloat(document.getElementById('in-d1').value);
  let d2 = parseFloat(document.getElementById('in-d2').value);
  let r1 = parseFloat(document.getElementById('in-r1').value);
  let l1 = parseFloat(document.getElementById('in-l1').value);

  // 1. Автозаполнение 4-го параметра или пересчёт зависимого
  if (isNaN(l1) && !isNaN(d1) && !isNaN(d2) && !isNaN(r1)) {
    calcParam('L1', true);
  } else if (isNaN(d2) && !isNaN(d1) && !isNaN(r1) && !isNaN(l1)) {
    calcParam('d2', true);
  } else if (isNaN(r1) && !isNaN(d1) && !isNaN(d2) && !isNaN(l1)) {
    calcParam('R1', true);
  } else if (isNaN(d1) && !isNaN(d2) && !isNaN(r1) && !isNaN(l1)) {
    calcParam('D1', true);
  } else if (lastCalculatedParam) {
    calcParam(lastCalculatedParam, true);
  }

  // Обновляем числа после расчета
  d1 = parseFloat(document.getElementById('in-d1').value);
  d2 = parseFloat(document.getElementById('in-d2').value);
  r1 = parseFloat(document.getElementById('in-r1').value);
  l1 = parseFloat(document.getElementById('in-l1').value);

  const cr = chkCr && chkCr.checked && parseFloat(valCr.value) > 0 ? parseFloat(valCr.value) : 0;
  const hasR2 = chkR2 && chkR2.checked && parseFloat(valR2.value) > 0;
  const r2 = hasR2 ? parseFloat(valR2.value) : 0;
  const z0 = parseFloat(document.getElementById('in-z0').value) || 0;

  const out = document.getElementById('output-box').querySelector('code');

  if (isNaN(d1) || isNaN(d2) || isNaN(r1) || isNaN(l1) || d1 <= d2 || r1 <= 0 || l1 <= 0) {
    return;
  }

  const R1_prog = r1 + cr;
  const L1_prog = l1 + cr;

  // 1. Без микроскругления (3 строки)
  if (!hasR2) {
    let xStart;
    if (cr > 0) {
      const underSqrt = R1_prog * R1_prog - L1_prog * L1_prog;
      if (underSqrt < 0) {
        out.textContent = '; Ошибка: радиус пластины слишком велик';
        return;
      }
      xStart = d1 - 2 * R1_prog + 2 * Math.sqrt(underSqrt);
    } else {
      xStart = d2;
    }

    const zApp = z0 + 1.0;
    const zFinal = z0 - L1_prog;

    if (currentView === 'point') {
      out.textContent = 
`[ Опорные точки контура ]
Точка A (старт на торце):  X: ${xStart.toFixed(3)}  Z: ${z0.toFixed(3)}
Точка B (выход на диаметр): X: ${d1.toFixed(3)}  Z: ${zFinal.toFixed(3)}
R1 в УП: ${R1_prog.toFixed(3)}`;
      return;
    }

    const gcode = [
      `G00 X${fmt(xStart)} Z${fmt(zApp)}`,
      `G01 Z${fmt(z0)} F0.1`,
      `G03 X${fmt(d1)} Z${fmt(zFinal)} R${fmt(R1_prog)} F0.04`
    ];
    out.textContent = gcode.join('\n');
    return;
  }

  // 2. С микроскруглением R2 (4 строки, точки A -> B -> C)
  const R2_prog = r2 + cr;
  const xc1 = d1 / 2 - R1_prog;
  const zc1 = -L1_prog;
  const zc2 = -R2_prog;
  const dist = R1_prog - R2_prog;
  const deltaZ = zc2 - zc1;

  if (dist <= 0 || Math.abs(deltaZ) >= dist) {
    out.textContent = '; Ошибка: R2 слишком велик для сопряжения с R1';
    return;
  }

  const deltaX = Math.sqrt(dist * dist - deltaZ * deltaZ);
  const xc2 = xc1 + deltaX;

  const xA = 2 * xc2;
  const t = R1_prog / dist;
  const xB = 2 * (xc1 + t * deltaX);
  const zB = z0 + (zc1 + t * deltaZ);
  const xC = d1;
  const zC = z0 - L1_prog;
  const zApp = z0 + 1.0;

  if (currentView === 'point') {
    out.textContent = 
`[ Опорные точки сопряжения ]
Точка A (старт на торце):      X: ${xA.toFixed(3)}  Z: ${z0.toFixed(3)}
Точка B (сопряжение R2 -> R1): X: ${xB.toFixed(3)}  Z: ${zB.toFixed(3)}
Точка C (выход на цилиндр D1): X: ${xC.toFixed(3)}  Z: ${zC.toFixed(3)}
R2 в УП: ${R2_prog.toFixed(3)} мм | R1 в УП: ${R1_prog.toFixed(3)} мм`;
    return;
  }

  const gcode = [
    `G00 X${fmt(xA)} Z${fmt(zApp)}`,
    `G01 Z${fmt(z0)} F0.1`,
    `G03 X${fmt(xB)} Z${fmt(zB)} R${fmt(R2_prog)}`,
    `G03 X${fmt(xC)} Z${fmt(zC)} R${fmt(R1_prog)}`
  ];

  out.textContent = gcode.join('\n');
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