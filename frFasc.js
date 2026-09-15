let currentMode = 'program';
let modes = { r1: 'arc', r2: 'arc' };
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

// Автозамена запятой на точку
document.querySelectorAll('input[type="text"]').forEach(input => {
  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(',', '.');
  });
});

// Безопасный вывод текста в терминал
function setTerminalOutput(text) {
  const box = document.getElementById('output-box');
  if (!box) return;
  const codeEl = box.querySelector('code') || box;
  codeEl.textContent = text;
}

// Безопасное получение числа из инпута
function getNum(id, altId = null) {
  const el = document.getElementById(id) || (altId ? document.getElementById(altId) : null);
  if (!el) return NaN;
  const v = el.value.trim();
  return v !== '' ? parseFloat(v) : NaN;
}

const chkR1 = document.getElementById('chk-r1');
const switchR1 = document.getElementById('switch-r1');
const valR1 = document.getElementById('val-r1');
const lblR1Svg = document.getElementById('lbl-r1-svg');

const chkR2 = document.getElementById('chk-r2');
const switchR2 = document.getElementById('switch-r2');
const valR2 = document.getElementById('val-r2');
const lblR2Svg = document.getElementById('lbl-r2-svg');

const contourSimple = document.getElementById('contour-simple');
const contourMicro = document.getElementById('contour-micro');

function syncBlueprint() {
  const isMicro = (chkR1 && chkR1.checked) || (chkR2 && chkR2.checked);
  if (contourSimple) contourSimple.style.display = isMicro ? 'none' : 'inline';
  if (contourMicro) contourMicro.style.display = isMicro ? 'inline' : 'none';
  if (lblR1Svg) lblR1Svg.style.display = (chkR1 && chkR1.checked) ? 'inline' : 'none';
  if (lblR2Svg) lblR2Svg.style.display = (chkR2 && chkR2.checked) ? 'inline' : 'none';
}

if (chkR1) {
  chkR1.addEventListener('change', () => {
    const active = chkR1.checked;
    if (switchR1) switchR1.style.display = active ? 'flex' : 'none';
    if (valR1) {
      valR1.style.display = active ? 'block' : 'none';
      if (!active) valR1.value = '';
    }
    syncBlueprint();
  });
}

if (chkR2) {
  chkR2.addEventListener('change', () => {
    const active = chkR2.checked;
    if (switchR2) switchR2.style.display = active ? 'flex' : 'none';
    if (valR2) {
      valR2.style.display = active ? 'block' : 'none';
      if (!active) valR2.value = '';
    }
    syncBlueprint();
  });
}

function toggleMicroMode(target, m) {
  modes[target] = m;
  const btnG1 = document.getElementById(`btn-${target}-g1`);
  const btnArc = document.getElementById(`btn-${target}-arc`);
  if (btnG1) btnG1.classList.toggle('active', m === 'g1');
  if (btnArc) btnArc.classList.toggle('active', m === 'arc');
}

// Кнопка Clean
const btnClean = document.getElementById('btn-clean');
if (btnClean) {
  btnClean.addEventListener('click', () => {
    ['in-d1', 'in-d2', 'in-angle', 'in-l1', 'in-radius-r', 'val-r1', 'val-r2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const startZ = document.getElementById('in-start-z') || document.getElementById('in-z0');
    if (startZ) startZ.value = '0';

    lastCalculatedParam = null;

    if (chkR1) chkR1.checked = false;
    if (chkR2) chkR2.checked = false;
    if (switchR1) switchR1.style.display = 'none';
    if (switchR2) switchR2.style.display = 'none';
    if (valR1) valR1.style.display = 'none';
    if (valR2) valR2.style.display = 'none';

    syncBlueprint();
    setTerminalOutput('; Очищено');
  });
}

// Расчет 3 из 4 параметров геометрии (поддерживает оба имени: calcParam и calculateMissingParam)
function calculateMissingParam(target) {
  let d1 = getNum('in-d1');
  let d2 = getNum('in-d2');
  let a = getNum('in-angle');
  let l1 = getNum('in-l1');

  const rad = deg => (deg * Math.PI) / 180;
  const deg = r => (r * 180) / Math.PI;

  if (target === 'D1') {
    if (!isNaN(d2) && !isNaN(a) && !isNaN(l1)) {
      document.getElementById('in-d1').value = (d2 + 2 * l1 * Math.tan(rad(a))).toFixed(3);
      lastCalculatedParam = 'D1';
    }
  } else if (target === 'd2') {
    if (!isNaN(d1) && !isNaN(a) && !isNaN(l1)) {
      document.getElementById('in-d2').value = (d1 - 2 * l1 * Math.tan(rad(a))).toFixed(3);
      lastCalculatedParam = 'd2';
    }
  } else if (target === 'angle') {
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(l1) && l1 > 0) {
      document.getElementById('in-angle').value = deg(Math.atan((d1 - d2) / (2 * l1))).toFixed(2);
      lastCalculatedParam = 'angle';
    }
  } else if (target === 'L1' || target === 'l1') {
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(a) && a > 0) {
      document.getElementById('in-l1').value = ((d1 - d2) / (2 * Math.tan(rad(a)))).toFixed(3);
      lastCalculatedParam = 'L1';
    }
  }
}
const calcParam = calculateMissingParam; // Алиас для совместимости с HTML

// Точный расчет и вывод УП
function performCalculation() {
  let d1 = getNum('in-d1');
  let d2 = getNum('in-d2');
  let a = getNum('in-angle');
  let l1 = getNum('in-l1');

  // Автоматический расчет, если заполнены 3 из 4 параметров
  if (isNaN(d1) && !isNaN(d2) && !isNaN(a) && !isNaN(l1)) {
    calculateMissingParam('D1');
  } else if (!isNaN(d1) && isNaN(d2) && !isNaN(a) && !isNaN(l1)) {
    calculateMissingParam('d2');
  } else if (!isNaN(d1) && !isNaN(d2) && isNaN(a) && !isNaN(l1)) {
    calculateMissingParam('angle');
  } else if (!isNaN(d1) && !isNaN(d2) && !isNaN(a) && isNaN(l1)) {
    calculateMissingParam('L1');
  } else if (lastCalculatedParam) {
    // Если все 4 заполнены, но меняли исходные числа — пересчитываем зависимый параметр
    calculateMissingParam(lastCalculatedParam);
  }

  // Обновляем значения после авторасчета
  d1 = getNum('in-d1');
  d2 = getNum('in-d2');
  a = getNum('in-angle');
  l1 = getNum('in-l1');

  if (isNaN(d1) || isNaN(d2) || isNaN(a) || isNaN(l1)) {
    setTerminalOutput('; Заполните минимум 3 параметра из 4');
    return;
  }

  const rawStartZ = getNum('in-start-z', 'in-z0');
  const startZ = !isNaN(rawStartZ) ? rawStartZ : 0;

  const rawR = getNum('in-radius-r', 'in-cr');
  const hasR = !isNaN(rawR) && rawR > 0;
  const rTool = hasR ? rawR : 0;

  const relEl = document.getElementById('radio-rel');
  const isRel = relEl ? relEl.checked : false;

  const radA = (a * Math.PI) / 180;

  const r1Active = chkR1 && chkR1.checked && getNum('val-r1') > 0;
  const r1Val = r1Active ? getNum('val-r1') : 0;

  const r2Active = chkR2 && chkR2.checked && getNum('val-r2') > 0;
  const r2Val = r2Active ? getNum('val-r2') : 0;

  const halfAngleFace = ((90 - a) / 2 * Math.PI) / 180;
  const T_face = r1Val * Math.tan(halfAngleFace);

  const X_c1 = d2 / 2 - T_face;
  const Z_c1 = startZ - r1Val;

  // 1. Начальная точка подхода на торце (Point A)
  let startX = 0;
  if (!r1Active) {
    if (hasR && rTool > 0) {
      const shiftX = 2 * rTool * (1 - Math.tan(halfAngleFace));
      startX = d2 - shiftX;
    } else {
      startX = d2;
    }
  } else {
    if (hasR && rTool > 0) {
      startX = 2 * (X_c1 - rTool);
    } else {
      startX = 2 * X_c1;
    }
  }

  // 2. Конец дуги R1 (Point B)
  let arc1_endX = 0;
  let arc1_endZ = 0;
  let arc1_R = r1Val + (hasR ? rTool : 0);

  if (r1Active) {
    if (hasR && rTool > 0) {
      const X_center = X_c1 + arc1_R * Math.cos(radA);
      const Z_center = Z_c1 + arc1_R * Math.sin(radA);
      arc1_endX = 2 * (X_center - rTool);
      arc1_endZ = Z_center - rTool;
    } else {
      arc1_endX = 2 * (X_c1 + r1Val * Math.cos(radA));
      arc1_endZ = Z_c1 + r1Val * Math.sin(radA);
    }
  }

  // 3. Выход на цилиндр D1 (Point C)
  const halfAngleCyl = ((a / 2) * Math.PI) / 180;
  let endChamferX = d1;
  let endChamferZ = 0;

  if (!r2Active) {
    if (hasR && rTool > 0) {
      const shiftZ = rTool * (1 - Math.tan(halfAngleCyl));
      endChamferZ = startZ - (l1 + shiftZ);
    } else {
      endChamferZ = startZ - l1;
    }
    endChamferX = d1;
  } else {
    const X_c2 = d1 / 2 - r2Val;
    const Z_c2 = startZ - l1 - r2Val * Math.tan(halfAngleCyl);
    const arc2_R = r2Val + (hasR ? rTool : 0);

    if (hasR && rTool > 0) {
      const X_center2 = X_c2 + arc2_R * Math.cos(radA);
      const Z_center2 = Z_c2 + arc2_R * Math.sin(radA);
      endChamferX = 2 * (X_center2 - rTool);
      endChamferZ = Z_center2 - rTool;
    } else {
      endChamferX = 2 * (X_c2 + r2Val * Math.cos(radA));
      endChamferZ = Z_c2 + r2Val * Math.sin(radA);
    }
  }

  if (currentMode === 'point') {
    setTerminalOutput(
`Point A: X${startX.toFixed(3)} Z${startZ.toFixed(3)}
Point B: ${r1Active ? `X${arc1_endX.toFixed(3)} Z${arc1_endZ.toFixed(3)}` : '-'}
Point C: X${endChamferX.toFixed(3)} Z${endChamferZ.toFixed(3)}
Tool R : ${hasR ? rTool.toFixed(3) : 'None'}`);
    return;
  }

  let lines = [];
  const zApp = (startZ + 1.0).toFixed(0);

  if (!isRel) {
    lines.push(`G00 X${formatVal(startX)} Z${zApp}`);
    lines.push(`G01 Z${formatVal(startZ)} F0.1`);

    if (r1Active) {
      if (modes.r1 === 'arc') {
        lines.push(`G03 X${formatVal(arc1_endX)} Z-${formatVal(Math.abs(arc1_endZ))} R${formatVal(arc1_R)}`);
      } else {
        lines.push(`G01 X${formatVal(arc1_endX)} Z-${formatVal(Math.abs(arc1_endZ))}`);
      }
    }

    lines.push(`G01 X${formatVal(endChamferX)} Z-${formatVal(Math.abs(endChamferZ))}`);

    if (r2Active) {
      const finalZ = startZ - l1 - r2Val * Math.tan(halfAngleCyl) - (hasR ? rTool : 0);
      const arc2_R = r2Val + (hasR ? rTool : 0);
      if (modes.r2 === 'arc') {
        lines.push(`G03 X${formatVal(d1)} Z-${formatVal(Math.abs(finalZ))} R${formatVal(arc2_R)}`);
      } else {
        lines.push(`G01 X${formatVal(d1)} Z-${formatVal(Math.abs(finalZ))}`);
      }
    }
  } else {
    lines.push(`G00 U${formatVal(startX)} W${zApp}`);
    lines.push(`G01 W-${zApp} F0.1`);
    lines.push(`G01 U${formatVal(endChamferX - startX)} W-${formatVal(Math.abs(endChamferZ - startZ))}`);
  }

  setTerminalOutput(lines.join('\n'));
}

function formatVal(v) {
  return Number(v.toFixed(3)).toString();
}

function setViewMode(m) {
  currentMode = m;
  const tabPoint = document.getElementById('tab-point');
  const tabProg = document.getElementById('tab-program');
  if (tabPoint) tabPoint.classList.toggle('active', m === 'point');
  if (tabProg) tabProg.classList.toggle('active', m === 'program');
  performCalculation();
}

// Слушатель на кнопку «Рассчитать»
const btnCalc = document.getElementById('btn-calculation') || document.getElementById('btn-calc') || document.querySelector('.btn-calculate');
if (btnCalc) {
  btnCalc.addEventListener('click', performCalculation);
}

function copyProgram() {
  const box = document.getElementById('output-box');
  const text = box ? box.textContent.trim() : '';
  if (!text || text.startsWith(';')) return;
  navigator.clipboard.writeText(text).then(() => alert('G-код скопирован!'));
}

function exportFile() {
  const box = document.getElementById('output-box');
  const text = box ? box.textContent.trim() : '';
  if (!text) return;
  const b = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'Type1_chamfer.nc';
  a.click();
}

// Скрытие прелоадера
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('done');
    }, 350);
  }
});