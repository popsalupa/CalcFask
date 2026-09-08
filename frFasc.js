let currentMode = 'program';
let modes = { r1: 'arc', r2: 'arc' };

// Автозамена запятой на точку
document.querySelectorAll('input[type="text"]').forEach(input => {
  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(',', '.');
  });
});

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
  const isMicro = chkR1.checked || chkR2.checked;
  contourSimple.style.display = isMicro ? 'none' : 'inline';
  contourMicro.style.display = isMicro ? 'inline' : 'none';
  if (lblR1Svg) lblR1Svg.style.display = chkR1.checked ? 'inline' : 'none';
  if (lblR2Svg) lblR2Svg.style.display = chkR2.checked ? 'inline' : 'none';
}

chkR1.addEventListener('change', () => {
  const active = chkR1.checked;
  switchR1.style.display = active ? 'flex' : 'none';
  valR1.style.display = active ? 'block' : 'none';
  if (!active) valR1.value = '';
  syncBlueprint();
});

chkR2.addEventListener('change', () => {
  const active = chkR2.checked;
  switchR2.style.display = active ? 'flex' : 'none';
  valR2.style.display = active ? 'block' : 'none';
  if (!active) valR2.value = '';
  syncBlueprint();
});

function toggleMicroMode(target, m) {
  modes[target] = m;
  document.getElementById(`btn-${target}-g1`).classList.toggle('active', m === 'g1');
  document.getElementById(`btn-${target}-arc`).classList.toggle('active', m === 'arc');
}

// Кнопка Clean
document.getElementById('btn-clean').addEventListener('click', () => {
  document.getElementById('in-d1').value = '';
  document.getElementById('in-d2').value = '';
  document.getElementById('in-angle').value = '';
  document.getElementById('in-l1').value = '';
  document.getElementById('in-start-z').value = '0';
  document.getElementById('in-radius-r').value = '';

  chkR1.checked = false;
  chkR2.checked = false;
  switchR1.style.display = 'none';
  switchR2.style.display = 'none';
  valR1.style.display = 'none';
  valR2.style.display = 'none';
  valR1.value = '';
  valR2.value = '';

  syncBlueprint();
  document.getElementById('output-box').querySelector('code').textContent = '';
});

// Авторасчет 3 из 4 параметров
function calculateMissingParam(target) {
  let d1 = parseFloat(document.getElementById('in-d1').value);
  let d2 = parseFloat(document.getElementById('in-d2').value);
  let a = parseFloat(document.getElementById('in-angle').value);
  let l1 = parseFloat(document.getElementById('in-l1').value);

  const rad = deg => (deg * Math.PI) / 180;
  const deg = r => (r * 180) / Math.PI;

  if (target === 'D1') {
    if (!isNaN(d2) && !isNaN(a) && !isNaN(l1)) {
      document.getElementById('in-d1').value = (d2 + 2 * l1 * Math.tan(rad(a))).toFixed(3);
    }
  } else if (target === 'd2') {
    if (!isNaN(d1) && !isNaN(a) && !isNaN(l1)) {
      document.getElementById('in-d2').value = (d1 - 2 * l1 * Math.tan(rad(a))).toFixed(3);
    }
  } else if (target === 'angle') {
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(l1) && l1 > 0) {
      document.getElementById('in-angle').value = deg(Math.atan((d1 - d2) / (2 * l1))).toFixed(2);
    }
  } else if (target === 'L1') {
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(a) && a > 0) {
      document.getElementById('in-l1').value = ((d1 - d2) / (2 * Math.tan(rad(a)))).toFixed(3);
    }
  }
}

// Точный математический расчет по эталонным формулам ЧПУ
function performCalculation() {
  const d1 = parseFloat(document.getElementById('in-d1').value);
  const d2 = parseFloat(document.getElementById('in-d2').value);
  const a = parseFloat(document.getElementById('in-angle').value);
  const l1 = parseFloat(document.getElementById('in-l1').value);
  const startZ = parseFloat(document.getElementById('in-start-z').value) || 0;

  const rawR = document.getElementById('in-radius-r').value.trim();
  const hasR = rawR !== '';
  const rTool = hasR ? (parseFloat(rawR) || 0) : 0;

  if (isNaN(d1) || isNaN(d2) || isNaN(a) || isNaN(l1)) {
    return;
  }

  const isRel = document.getElementById('radio-rel').checked;
  const radA = (a * Math.PI) / 180;

  const r1Active = chkR1.checked && parseFloat(valR1.value) > 0;
  const r1Val = r1Active ? parseFloat(valR1.value) : 0;

  const r2Active = chkR2.checked && parseFloat(valR2.value) > 0;
  const r2Val = r2Active ? parseFloat(valR2.value) : 0;

  const outCode = document.getElementById('output-box').querySelector('code');

  // Угол отклонения на торце: (90 - a)
  // Половинный угол: (90 - a) / 2
  const halfAngleFace = ((90 - a) / 2 * Math.PI) / 180;
  // Длина тангенса на торце
  const T_face = r1Val * Math.tan(halfAngleFace);

  // Центр окружности R1 на торце детали:
  // Z_c = startZ - r1Val
  // X_c (радиус) = d2 / 2 - T_face
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
    // При наличии R1: касание идет по плоскому торцу Z=startZ
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
      // Траектория центра инструмента:
      // X_center = X_c1 + (r1Val + rTool) * cos(a)
      // Z_center = Z_c1 + (r1Val + rTool) * sin(a)
      // Виртуальная вершина резца для T3:
      // X_tip = 2 * (X_center - rTool)
      // Z_tip = Z_center - rTool
      const X_center = X_c1 + arc1_R * Math.cos(radA);
      const Z_center = Z_c1 + arc1_R * Math.sin(radA);
      arc1_endX = 2 * (X_center - rTool);
      arc1_endZ = Z_center - rTool;
    } else {
      arc1_endX = 2 * (X_c1 + r1Val * Math.cos(radA));
      arc1_endZ = Z_c1 + r1Val * Math.sin(radA);
    }
  }

  // 3. Выход на цилиндр D1 (Point C и D)
  // Угол отклонения между конусом и цилиндром равен a
  const halfAngleCyl = ((a / 2) * Math.PI) / 180;
  const T_cyl = r2Val * Math.tan(halfAngleCyl);

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
    // При наличии R2 на выходе:
    // Центр окружности R2:
    // X_c2 = d1 / 2 - r2Val
    // Z_c2 = startZ - l1 - T_cyl / tan(a) + r2Val / tan(a) = startZ - l1 - r2Val * tan(halfAngleCyl)
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
    outCode.textContent = 
`Point A: X${startX.toFixed(3)} Z${startZ.toFixed(3)}
Point B: ${r1Active ? `X${arc1_endX.toFixed(3)} Z${arc1_endZ.toFixed(3)}` : '-'}
Point C: X${endChamferX.toFixed(3)} Z${endChamferZ.toFixed(3)}
Tool R : ${hasR ? rTool.toFixed(3) : 'None'}`;
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

  outCode.textContent = lines.join('\n');
}

function formatVal(v) {
  return Number(v.toFixed(3)).toString();
}

function setViewMode(m) {
  currentMode = m;
  document.getElementById('tab-point').classList.toggle('active', m === 'point');
  document.getElementById('tab-program').classList.toggle('active', m === 'program');
  performCalculation();
}

function copyProgram() {
  const t = document.getElementById('output-box').querySelector('code').textContent;
  if (!t) return;
  navigator.clipboard.writeText(t).then(() => alert('G-код скопирован!'));
}

function exportFile() {
  const t = document.getElementById('output-box').querySelector('code').textContent;
  if (!t) return;
  const b = new Blob([t], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'Type1_chamfer.nc';
  a.click();
}
// Плавное скрытие прелоадера после загрузки страницы
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    // Небольшая задержка 350мс, чтобы глаз успел насладиться анимацией пластины
    setTimeout(() => {
      preloader.classList.add('done');
    }, 350);
  }
});