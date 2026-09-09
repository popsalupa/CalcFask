let currentMode = 'prog'; // По умолчанию Program (G-код)
let currentBType = 'chamfer'; // 'chamfer' (G1) или 'radius' (G2/3)

// Элементы DOM
const btnModeProg = document.getElementById('btn-mode-prog');
const btnModePoint = document.getElementById('btn-mode-point');
const outTitle = document.getElementById('out-title');
const btnCalc = document.getElementById('btn-calc');
const blueprintBox = document.getElementById('blueprint-box');

const chkB = document.getElementById('chk-b');
const edgeFields = document.getElementById('edge-fields');
const btnSwG1 = document.getElementById('btn-sw-g1');
const btnSwG2 = document.getElementById('btn-sw-g2');
const inBVal = document.getElementById('in-b-val');
const inToolR = document.getElementById('in-tool-r');

// ---------------------------------------------------------------------------
// ДИНАМИЧЕСКИЙ SVG ЧЕРТЕЖ
// ---------------------------------------------------------------------------
function renderBlueprint() {
  const isBActive = chkB.checked;

  let contourMarkup = '';
  let pointsMarkup = '';
  let edgeAnnotation = '';

  if (!isBActive) {
    contourMarkup = `
      <line x1="30" y1="35" x2="190" y2="35" stroke="#38bdf8" stroke-width="2" />
      <line x1="30" y1="115" x2="190" y2="115" stroke="#38bdf8" stroke-width="2" />
      <line x1="30" y1="35" x2="30" y2="115" stroke="#38bdf8" stroke-width="1.6" />
      <path d="M 190 35 A 50 50 0 0 1 216 75 A 50 50 0 0 1 190 115" fill="none" stroke="#fbbf24" stroke-width="2.5" />
    `;
    pointsMarkup = `
      <circle cx="190" cy="35" r="3.2" fill="#fbbf24" />
      <text x="185" y="24" fill="#fbbf24" font-size="11" font-family="monospace" font-weight="bold">B</text>
    `;
  } else if (currentBType === 'chamfer') {
    contourMarkup = `
      <line x1="30" y1="35" x2="174" y2="35" stroke="#38bdf8" stroke-width="2" />
      <line x1="30" y1="115" x2="174" y2="115" stroke="#38bdf8" stroke-width="2" />
      <line x1="30" y1="35" x2="30" y2="115" stroke="#38bdf8" stroke-width="1.6" />
      <line x1="174" y1="35" x2="195" y2="44" stroke="#f43f5e" stroke-width="2.6" />
      <line x1="174" y1="115" x2="195" y2="106" stroke="#f43f5e" stroke-width="2.6" />
      <path d="M 195 44 A 50 50 0 0 1 216 75 A 50 50 0 0 1 195 106" fill="none" stroke="#fbbf24" stroke-width="2.5" />
    `;
    pointsMarkup = `
      <circle cx="174" cy="35" r="3" fill="#f43f5e" />
      <text x="165" y="25" fill="#f43f5e" font-size="10.5" font-family="monospace" font-weight="bold">B2</text>
      <circle cx="195" cy="44" r="3" fill="#f43f5e" />
      <text x="203" y="47" fill="#f43f5e" font-size="10.5" font-family="monospace" font-weight="bold">B1</text>
    `;
    edgeAnnotation = `
      <text x="180" y="20" fill="#f43f5e" font-size="9.5" font-family="monospace" font-weight="bold" text-anchor="middle">C</text>
    `;
  } else {
    contourMarkup = `
      <line x1="30" y1="35" x2="174" y2="35" stroke="#38bdf8" stroke-width="2" />
      <line x1="30" y1="115" x2="174" y2="115" stroke="#38bdf8" stroke-width="2" />
      <line x1="30" y1="35" x2="30" y2="115" stroke="#38bdf8" stroke-width="1.6" />
      <path d="M 174 35 Q 190 35 195 44" fill="none" stroke="#f43f5e" stroke-width="2.6" />
      <path d="M 174 115 Q 190 115 195 106" fill="none" stroke="#f43f5e" stroke-width="2.6" />
      <path d="M 195 44 A 50 50 0 0 1 216 75 A 50 50 0 0 1 195 106" fill="none" stroke="#fbbf24" stroke-width="2.5" />
    `;
    pointsMarkup = `
      <circle cx="174" cy="35" r="3" fill="#f43f5e" />
      <text x="165" y="25" fill="#f43f5e" font-size="10.5" font-family="monospace" font-weight="bold">B2</text>
      <circle cx="195" cy="44" r="3" fill="#f43f5e" />
      <text x="203" y="47" fill="#f43f5e" font-size="10.5" font-family="monospace" font-weight="bold">B1</text>
    `;
    edgeAnnotation = `
      <text x="180" y="20" fill="#f43f5e" font-size="9.5" font-family="monospace" font-weight="bold" text-anchor="middle">Rb</text>
    `;
  }

  blueprintBox.innerHTML = `
    <svg viewBox="0 0 340 160" class="blueprint-svg">
      <defs>
        <marker id="arr" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,1 L5,3 L0,5 z" fill="#38bdf8" />
        </marker>
        <marker id="arr-amb" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,1 L5,3 L0,5 z" fill="#fbbf24" />
        </marker>
      </defs>

      <line x1="15" y1="75" x2="320" y2="75" stroke="#475569" stroke-width="1.2" stroke-dasharray="8,3,2,3" />
      ${contourMarkup}

      <circle cx="166" cy="75" r="2" fill="#fbbf24" opacity="0.6" />
      <line x1="162" y1="75" x2="170" y2="75" stroke="#fbbf24" stroke-width="1" opacity="0.6" />
      <line x1="166" y1="71" x2="166" y2="79" stroke="#fbbf24" stroke-width="1" opacity="0.6" />

      <circle cx="216" cy="75" r="3.2" fill="#f43f5e" />
      <text x="224" y="73" fill="#f43f5e" font-size="11" font-family="monospace" font-weight="bold">A (Z0)</text>

      ${pointsMarkup}
      ${edgeAnnotation}

      <line x1="50" y1="35" x2="50" y2="115" stroke="#38bdf8" stroke-width="1" marker-start="url(#arr)" marker-end="url(#arr)" />
      <text x="58" y="78" fill="#38bdf8" font-size="10.5" font-family="monospace" font-weight="bold">D</text>

      <line x1="190" y1="126" x2="216" y2="126" stroke="#38bdf8" stroke-width="1" marker-start="url(#arr)" marker-end="url(#arr)" />
      <line x1="190" y1="115" x2="190" y2="133" stroke="#38bdf8" stroke-width="0.8" opacity="0.6" />
      <line x1="216" y1="75" x2="216" y2="133" stroke="#38bdf8" stroke-width="0.8" opacity="0.6" />
      <text x="203" y="139" fill="#38bdf8" font-size="10.5" font-family="monospace" text-anchor="middle">L</text>

      <line x1="166" y1="75" x2="204" y2="44" stroke="#fbbf24" stroke-width="1.2" marker-end="url(#arr-amb)" />
      <text x="182" y="56" fill="#fbbf24" font-size="10.5" font-family="monospace" font-weight="bold">R</text>
    </svg>
  `;
}

renderBlueprint();

// ---------------------------------------------------------------------------
// СОБЫТИЯ ИНТЕРФЕЙСА
// ---------------------------------------------------------------------------
chkB.addEventListener('change', () => {
  const active = chkB.checked;
  edgeFields.style.display = active ? 'flex' : 'none';
  renderBlueprint();
  if (document.getElementById('in-d').value.trim() !== '') calculate();
});

btnSwG1.addEventListener('click', () => {
  currentBType = 'chamfer';
  btnSwG1.classList.add('active');
  btnSwG2.classList.remove('active');
  renderBlueprint();
  if (document.getElementById('in-d').value.trim() !== '') calculate();
});

btnSwG2.addEventListener('click', () => {
  currentBType = 'radius';
  btnSwG2.classList.add('active');
  btnSwG1.classList.remove('active');
  renderBlueprint();
  if (document.getElementById('in-d').value.trim() !== '') calculate();
});

inToolR.addEventListener('input', () => {
  if (document.getElementById('in-d').value.trim() !== '') calculate();
});

btnModeProg.addEventListener('click', () => {
  currentMode = 'prog';
  btnModeProg.classList.add('active');
  btnModePoint.classList.remove('active');
  outTitle.innerText = "G-код Fanuc (G02)";
  btnCalc.innerText = "Рассчитать G-код";
  calculate();
});

btnModePoint.addEventListener('click', () => {
  currentMode = 'point';
  btnModePoint.classList.add('active');
  btnModeProg.classList.remove('active');
  outTitle.innerText = "Координаты точек";
  btnCalc.innerText = "Рассчитать координаты";
  calculate();
});

// Парсер чисел
const getNum = (id) => {
  const el = document.getElementById(id);
  if (!el || el.value.trim() === '') return null;
  const val = parseFloat(el.value.replace(',', '.'));
  return isNaN(val) ? null : val;
};

// Форматирование Fanuc (целые обязательно с точкой)
const fanucNum = (val) => {
  const rounded = Number(val.toFixed(3));
  const str = rounded.toString();
  return str.includes('.') ? str : str + '.';
};

// Авторасчет L через R и D
document.getElementById('btn-calc-l').addEventListener('click', () => {
  const D = getNum('in-d');
  const R = getNum('in-r');
  if (D && R) {
    if (R < D / 2) {
      alert(`Ошибка: R (${R}) не может быть меньше D/2 (${(D / 2).toFixed(2)})!`);
      return;
    }
    const L = R - Math.sqrt(R * R - Math.pow(D / 2, 2));
    document.getElementById('in-l').value = L.toFixed(3);
  }
});

// Авторасчет R через L и D
document.getElementById('btn-calc-r').addEventListener('click', () => {
  const D = getNum('in-d');
  const L = getNum('in-l');
  if (D && L) {
    const R = (D * D + 4 * L * L) / (8 * L);
    document.getElementById('in-r').value = R.toFixed(3);
  }
});

// ---------------------------------------------------------------------------
// ГЕОМЕТРИЧЕСКИЙ РАСЧЕТ И ВЫВОД РЕЗУЛЬТАТА
// ---------------------------------------------------------------------------
btnCalc.addEventListener('click', calculate);

function calculate() {
  const D = getNum('in-d');
  let R = getNum('in-r');
  let L = getNum('in-l');

  const toolRVal = getNum('in-tool-r');
  const withComp = (toolRVal !== null && toolRVal > 0);
  const toolR = withComp ? toolRVal : 0;

  const withB = chkB.checked;
  const bType = currentBType;
  const bVal = withB ? (getNum('in-b-val') || 0) : 0;

  if (!D) {
    document.getElementById('output-box').innerText = "Введите диаметр детали D!";
    return;
  }

  if (!L && R) {
    if (R < D / 2) {
      document.getElementById('output-box').innerText = `Ошибка: Радиус R (${R}) не может быть меньше D/2 (${(D / 2).toFixed(3)})!`;
      return;
    }
    L = R - Math.sqrt(R * R - Math.pow(D / 2, 2));
    document.getElementById('in-l').value = L.toFixed(3);
  } else if (!R && L) {
    R = (D * D + 4 * L * L) / (8 * L);
    document.getElementById('in-r').value = R.toFixed(3);
  }

  if (!R || !L) {
    document.getElementById('output-box').innerText = "Укажите радиус R или глубину купола L!";
    return;
  }

  const X_start = withComp ? fanucNum(-2 * toolR) : '0.';
  const X_approach = fanucNum(D + 0.5);

  let gcodeLines = [];
  let pointsBody = '';

  if (!withB || bVal <= 0) {
    // 1. ЧИСТЫЙ КУПОЛ (конечная точка строго на диаметре D)
    const X_B = D;
    
    const x_tc = (D / 2) + toolR;
    const R_tc = R + toolR;
    const z_tc = -R + Math.sqrt(Math.max(0, R_tc * R_tc - x_tc * x_tc));
    
    const Z_B = z_tc - toolR;
    const R_prog = R_tc;

    pointsBody += `Точка A (Вершина):   X = ${X_start}   Z = 0.\n`;
    pointsBody += `Точка B (Стык с D):  X = ${fanucNum(X_B)}   Z = ${fanucNum(Z_B)}\n`;
    pointsBody += `Радиус купола (G02): R = ${fanucNum(R_prog)}\n`;
    pointsBody += `Глубина купола L:    ${fanucNum(L)} мм\n`;

    gcodeLines.push(`G00 X${X_approach} Z0. (ПОДВОД НА БЕЗОПАСНОЕ РАССТОЯНИЕ)`);
    gcodeLines.push(`G01 X${X_start} (СТАРТ ИЗ ЦЕНТРА / СРЕЗ ПУПКА)`);
    gcodeLines.push(`G02 X${fanucNum(X_B)} Z${fanucNum(Z_B)} R${fanucNum(R_prog)} (ОБТОЧКА КУПОЛА)`);
    
  } else if (bType === 'chamfer') {
    // 2. КУПОЛ С МИКРОФАСКОЙ G1 (расчет через дуговой сегмент C)
    const C = bVal;
    const Z_B2_theo = -L - C;
    const X_B2_theo = D;

    const alpha_B = Math.asin((D / 2) / R);
    const alpha_B1 = Math.max(0, alpha_B - C / R);
    const x_B1_theo = R * Math.sin(alpha_B1);
    const z_B1_theo = -(R - R * Math.cos(alpha_B1));

    const sinA = x_B1_theo / R;
    const cosA = Math.sqrt(Math.max(0, 1 - sinA * sinA));

    const X_B1 = withComp ? (x_B1_theo * 2 - 2 * toolR * (1 - sinA)) : (x_B1_theo * 2);
    const Z_B1 = withComp ? (z_B1_theo - toolR * (1 - cosA)) : z_B1_theo;
    const R_prog = withComp ? (R + toolR) : R;

    const X_B2 = D;
    const Z_B2 = withComp ? (Z_B2_theo - toolR) : Z_B2_theo;

    pointsBody += `Точка A (Вершина):     X = ${X_start}   Z = 0.\n`;
    pointsBody += `Точка B1 (Вход фаски): X = ${fanucNum(X_B1)}   Z = ${fanucNum(Z_B1)}\n`;
    pointsBody += `Точка B2 (Конец фаски):X = ${fanucNum(X_B2)}   Z = ${fanucNum(Z_B2)}\n`;
    pointsBody += `Радиус купола (G02):   R = ${fanucNum(R_prog)}\n`;

    gcodeLines.push(`G00 X${X_approach} Z0. (ПОДВОД НА БЕЗОПАСНОЕ РАССТОЯНИЕ)`);
    gcodeLines.push(`G01 X${X_start} (СТАРТ ИЗ ЦЕНТРА / СРЕЗ ПУПКА)`);
    gcodeLines.push(`G02 X${fanucNum(X_B1)} Z${fanucNum(Z_B1)} R${fanucNum(R_prog)} (СФЕРА ДО B1)`);
    gcodeLines.push(`G01 X${fanucNum(X_B2)} Z${fanucNum(Z_B2)} (ФАСКА C${fanucNum(C)} ДО B2 по G1)`);

  } else {
    // 3. КУПОЛ СО СКРУГЛЕНИЕМ G2/3
    const Rb = bVal;
    const valSq = Math.pow(R - Rb, 2) - Math.pow(D / 2 - Rb, 2);

    if (valSq < 0) {
      document.getElementById('output-box').innerText = `Ошибка: Радиус скругления R=${Rb} слишком велик!`;
      return;
    }

    const Zcb = -R + Math.sqrt(valSq);
    const ratio = R / (R - Rb);
    const xTan = 2 * (D / 2 - Rb) * ratio;
    const zTan = -R + (Zcb + R) * ratio;

    const sinA = (xTan / 2) / R;
    const cosA = Math.sqrt(Math.max(0, 1 - sinA * sinA));

    const X_B1 = withComp ? (xTan - 2 * toolR * (1 - sinA)) : xTan;
    const Z_B1 = withComp ? (zTan - toolR * (1 - cosA)) : zTan;
    const R_prog = withComp ? (R + toolR) : R;

    const X_B2 = D;
    const Z_B2 = withComp ? (Zcb - toolR) : Zcb;
    const Rb_prog = withComp ? (Rb + toolR) : Rb;

    pointsBody += `Точка A (Вершина):       X = ${X_start}   Z = 0.\n`;
    pointsBody += `Точка B1 (Стык со сферой):X = ${fanucNum(X_B1)}   Z = ${fanucNum(Z_B1)}\n`;
    pointsBody += `Точка B2 (Конец R${fanucNum(Rb)}):   X = ${fanucNum(X_B2)}   Z = ${fanucNum(Z_B2)}\n`;
    pointsBody += `Радиус купола (G02):     R = ${fanucNum(R_prog)}\n`;
    pointsBody += `Радиус скругления (G02): R = ${fanucNum(Rb_prog)}\n`;

    gcodeLines.push(`G00 X${X_approach} Z0. (ПОДВОД НА БЕЗОПАСНОЕ РАССТОЯНИЕ)`);
    gcodeLines.push(`G01 X${X_start} (СТАРТ ИЗ ЦЕНТРА / СРЕЗ ПУПКА)`);
    gcodeLines.push(`G02 X${fanucNum(X_B1)} Z${fanucNum(Z_B1)} R${fanucNum(R_prog)} (СФЕРА ДО B1)`);
    gcodeLines.push(`G02 X${fanucNum(X_B2)} Z${fanucNum(Z_B2)} R${fanucNum(Rb_prog)} (СКРУГЛЕНИЕ R${fanucNum(Rb)} ДО B2)`);
  }

  // Вывод результата
  if (currentMode === 'point') {
    let out = `--- ОПОРНЫЕ ТОЧКИ КОНТУРА (${withComp ? `С КОМПЕНСАЦИЕЙ T3: r=${fanucNum(toolR)}` : 'ТЕОРЕТИЧЕСКИЕ (БЕЗ ПЛАСТИНЫ)'}) ---\n`;
    out += pointsBody;
    document.getElementById('output-box').innerText = out;
  } else {
    document.getElementById('output-box').innerText = gcodeLines.join('\n');
  }
}

// Очистка формы
document.getElementById('btn-clean').addEventListener('click', () => {
  document.getElementById('in-d').value = '';
  document.getElementById('in-r').value = '';
  document.getElementById('in-l').value = '';
  document.getElementById('in-tool-r').value = '';
  document.getElementById('in-b-val').value = '0.2';
  chkB.checked = false;
  edgeFields.style.display = 'none';
  currentBType = 'chamfer';
  btnSwG1.classList.add('active');
  btnSwG2.classList.remove('active');
  renderBlueprint();
  document.getElementById('output-box').innerText = 'Нажмите «Рассчитать G-код»...';
});

// Копирование в буфер
document.getElementById('btn-copy').addEventListener('click', () => {
  const text = document.getElementById('output-box').innerText;
  if (!text || text.includes('Нажмите «Рассчитать')) return;
  navigator.clipboard.writeText(text).then(() => {
    alert('G-код скопирован в буфер обмена!');
  });
});