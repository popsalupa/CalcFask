let currentView = 'program';
let microModes = { r1: 'g1', r2: 'g1' };

// Автозамена запятой на точку
document.querySelectorAll('input[type="text"]').forEach(input => {
  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(',', '.');
  });
});

// Элементы SVG для смены контура
const contourSimple = document.getElementById('contour-simple');
const contourMicro = document.getElementById('contour-micro');
const lblR1Svg = document.getElementById('lbl-r1-svg');
const lblR2Svg = document.getElementById('lbl-r2-svg');

// Чекбоксы микроэлементов
const chkR1 = document.getElementById('chk-r1');
const switchR1 = document.getElementById('switch-r1');
const valR1 = document.getElementById('val-r1');

const chkR2 = document.getElementById('chk-r2');
const switchR2 = document.getElementById('switch-r2');
const valR2 = document.getElementById('val-r2');

function syncBlueprint() {
  const isMicro = chkR1.checked || chkR2.checked;
  if (contourSimple) contourSimple.style.display = isMicro ? 'none' : 'inline';
  if (contourMicro) contourMicro.style.display = isMicro ? 'inline' : 'none';
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
  microModes[target] = m;
  document.getElementById(`btn-${target}-g1`).classList.toggle('active', m === 'g1');
  document.getElementById(`btn-${target}-arc`).classList.toggle('active', m === 'arc');
}

// Кнопка Clean
document.getElementById('btn-clean').addEventListener('click', () => {
  document.getElementById('in-d1').value = '';
  document.getElementById('in-d2').value = '';
  document.getElementById('in-angle').value = '';
  document.getElementById('in-l1').value = '';
  document.getElementById('in-len-l').value = '';
  document.getElementById('in-width-w').value = '';
  document.getElementById('in-bp').value = '';

  chkR1.checked = false;
  chkR2.checked = false;
  switchR1.style.display = 'none';
  switchR2.style.display = 'none';
  valR1.style.display = 'none';
  valR2.style.display = 'none';
  valR1.value = '';
  valR2.value = '';

  syncBlueprint();
  document.getElementById('output-box').querySelector('code').textContent = '; Очищено';
});

// Расчет 3 из 4 параметров геометрии
function calcParam(target) {
  let d1 = parseFloat(document.getElementById('in-d1').value);
  let d2 = parseFloat(document.getElementById('in-d2').value);
  let a = parseFloat(document.getElementById('in-angle').value);
  let l1 = parseFloat(document.getElementById('in-l1').value);

  const rad = deg => (deg * Math.PI) / 180;
  const deg = r => (r * 180) / Math.PI;

  if (target === 'D1') {
    if (!isNaN(d2) && !isNaN(a) && !isNaN(l1)) {
      document.getElementById('in-d1').value = (d2 + 2 * l1 * Math.tan(rad(a))).toFixed(3);
    } else {
      alert('Заполните d2, Angle 1 и l1 для расчета D1');
    }
  } else if (target === 'd2') {
    if (!isNaN(d1) && !isNaN(a) && !isNaN(l1)) {
      document.getElementById('in-d2').value = (d1 - 2 * l1 * Math.tan(rad(a))).toFixed(3);
    } else {
      alert('Заполните D1, Angle 1 и l1 для расчета d2');
    }
  } else if (target === 'angle') {
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(l1) && l1 > 0) {
      document.getElementById('in-angle').value = deg(Math.atan((d1 - d2) / (2 * l1))).toFixed(2);
    } else {
      alert('Заполните D1, d2 и l1 для расчета Angle 1');
    }
  } else if (target === 'l1') {
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(a) && a > 0) {
      document.getElementById('in-l1').value = ((d1 - d2) / (2 * Math.tan(rad(a)))).toFixed(3);
    } else {
      alert('Заполните D1, d2 и Angle 1 для расчета l1');
    }
  }
}

// Аналитический расчет сопряжений и G-кода
function performCalculation() {
  let d1 = parseFloat(document.getElementById('in-d1').value);
  let d2 = parseFloat(document.getElementById('in-d2').value);
  let a = parseFloat(document.getElementById('in-angle').value);
  let l1 = parseFloat(document.getElementById('in-l1').value);

  const rad = deg => (deg * Math.PI) / 180;

  if (isNaN(d2) && !isNaN(d1) && !isNaN(a) && !isNaN(l1)) {
    d2 = d1 - 2 * l1 * Math.tan(rad(a));
    document.getElementById('in-d2').value = d2.toFixed(3);
  }

  if (isNaN(l1) && !isNaN(d1) && !isNaN(d2) && !isNaN(a) && a > 0) {
    l1 = (d1 - d2) / (2 * Math.tan(rad(a)));
    document.getElementById('in-l1').value = l1.toFixed(3);
  }

  if (isNaN(d2) || isNaN(a)) {
    return;
  }

  const rawL = document.getElementById('in-len-l').value.trim();
  const rawW = document.getElementById('in-width-w').value.trim();
  const rawBP = document.getElementById('in-bp').value.trim();

  const L = rawL !== '' ? parseFloat(rawL) : 0;
  const W = rawW !== '' ? parseFloat(rawW) : 0;

  const startDia = rawBP !== '' ? parseFloat(rawBP) : (!isNaN(d1) ? d1 : (d2 + 2 * l1 * Math.tan(rad(a))));
  const radA = rad(a);
  const tanA = Math.tan(radA);

  // Пересчет номинальной длины фаски от начального диаметра
  const lEff = (startDia - d2) / (2 * tanA);
  const zEndNom = L + W;
  const zStartNom = zEndNom - lEff;

  const r1Active = chkR1.checked && parseFloat(valR1.value) > 0;
  const r1Val = r1Active ? parseFloat(valR1.value) : 0;

  const r2Active = chkR2.checked && parseFloat(valR2.value) > 0;
  const r2Val = r2Active ? parseFloat(valR2.value) : 0;

  const outCode = document.getElementById('output-box').querySelector('code');

  if (currentView === 'point') {
    outCode.textContent = 
`[ Опорные точки ]
Диаметр входа X: ${startDia.toFixed(3)} мм
Диаметр выхода d2: ${d2.toFixed(3)} мм
Угол Angle 1: ${a.toFixed(2)}°
L1 от БП: ${lEff.toFixed(3)} мм
Z старт: ${zStartNom.toFixed(3)} мм
Z плоскости отрезки: ${zEndNom.toFixed(3)} мм
R1: ${r1Active ? r1Val.toFixed(3) + ' (' + microModes.r1 + ')' : 'Откл.'}
R2: ${r2Active ? r2Val.toFixed(3) + ' (' + microModes.r2 + ')' : 'Откл.'}`;
    return;
  }

  let lines = [];

  if (!r1Active && !r2Active) {
    lines.push(`G00 X${formatVal(startDia)} Z${formatVal(zStartNom)}`);
    lines.push(`G01 X${formatVal(d2)} Z${formatVal(zEndNom)} F0.05`);
  } else {
    // 1. Вход со стороны цилиндра / БП (R1)
    let xApp = startDia;
    let zApp = zStartNom;
    let xConeStart = startDia;
    let zConeStart = zStartNom;

    if (r1Active) {
      if (microModes.r1 === 'g1') {
        // Микрофаска 45°: пересечение цилиндра и конуса
        const C1 = r1Val;
        const deltaZ1 = C1 / (1 + tanA);
        zApp = zStartNom - C1;
        xApp = startDia;
        zConeStart = zStartNom + deltaZ1;
        xConeStart = startDia - 2 * deltaZ1 * tanA;

        lines.push(`G00 X${formatVal(xApp)} Z${formatVal(zApp)}`);
        lines.push(`G01 X${formatVal(xConeStart)} Z${formatVal(zConeStart)} F0.03`);
      } else {
        // Скругление дугой
        const halfAngle1 = ((90 - a) / 2 * Math.PI) / 180;
        const T1 = r1Val * Math.tan(halfAngle1);
        zApp = zStartNom - T1;
        xConeStart = startDia - 2 * r1Val * (1 - Math.cos(radA));
        zConeStart = zApp + r1Val * Math.sin(radA);

        lines.push(`G00 X${formatVal(xApp)} Z${formatVal(zApp)}`);
        lines.push(`G02 X${formatVal(xConeStart)} Z${formatVal(zConeStart)} R${formatVal(r1Val)} F0.03`);
      }
    } else {
      lines.push(`G00 X${formatVal(startDia)} Z${formatVal(zStartNom)}`);
    }

    // 2. Выход на диаметр d2 и плоскость отрезки (R2)
    let xConeEnd = d2;
    let zConeEnd = zEndNom;

    if (r2Active) {
      if (microModes.r2 === 'g1') {
        // Микрофаска 45°: пересечение конуса и плоскости отрезки
        const C2 = r2Val;
        const deltaZ2 = C2 / (1 - tanA);
        zConeEnd = zEndNom - deltaZ2;
        xConeEnd = d2 + 2 * (zEndNom - zConeEnd) * tanA;
        const xEndCut = d2 - 2 * C2;

        lines.push(`G01 X${formatVal(xConeEnd)} Z${formatVal(zConeEnd)} F0.05`);
        lines.push(`G01 X${formatVal(xEndCut)} Z${formatVal(zEndNom)} F0.03`);
      } else {
        // Скругление дугой
        xConeEnd = d2 + 2 * r2Val * (1 - Math.sin(radA));
        zConeEnd = zEndNom - (r2Val * (1 - Math.sin(radA))) / tanA;
        const xArcEnd = d2 - 2 * r2Val * (1 - Math.sin(radA));

        lines.push(`G01 X${formatVal(xConeEnd)} Z${formatVal(zConeEnd)} F0.05`);
        lines.push(`G03 X${formatVal(xArcEnd)} Z${formatVal(zEndNom)} R${formatVal(r2Val)} F0.03`);
      }
    } else {
      lines.push(`G01 X${formatVal(d2)} Z${formatVal(zEndNom)} F0.05`);
    }
  }

  outCode.textContent = lines.join('\n');
}

function formatVal(v) {
  return Number(v.toFixed(3)).toString();
}

function setViewMode(mode) {
  currentView = mode;
  document.getElementById('tab-program').classList.toggle('active', mode === 'program');
  document.getElementById('tab-point').classList.toggle('active', mode === 'point');
  performCalculation();
}

function copyProgram() {
  const t = document.getElementById('output-box').querySelector('code').textContent;
  if (!t) return;
  navigator.clipboard.writeText(t).then(() => alert('G-код скопирован в буфер!'));
}

function exportFile() {
  const t = document.getElementById('output-box').querySelector('code').textContent;
  if (!t) return;
  const b = new Blob([t], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'Type2_rear_chamfer.nc';
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