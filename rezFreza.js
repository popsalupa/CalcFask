// Плавное скрытие прелоадера после загрузки страницы
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('done');
    }, 350);
  }
});

// Парсер чисел (поддерживает ввод с запятой и точкой)
const getNum = (id) => {
  const el = document.getElementById(id);
  if (!el || el.value.trim() === '') return null;
  const val = parseFloat(el.value.replace(',', '.'));
  return isNaN(val) ? null : val;
};

// Форматирование чисел для Fanuc: целые числа обязательно с точкой (напр. 0.)
const fanucNum = (val) => {
  const rounded = Number(val.toFixed(3));
  const str = rounded.toString();
  return str.includes('.') ? str : str + '.';
};

// Блокировка типа врезания для токарного станка (доступен только радиальный)
const machineSelect = document.getElementById('sel-machine');
const entrySelect = document.getElementById('sel-entry');

function syncEntryWithMachine() {
  if (machineSelect.value === 'lathe_c') {
    entrySelect.value = 'radial';
    entrySelect.disabled = true;
  } else {
    entrySelect.disabled = false;
  }
}

machineSelect.addEventListener('change', syncEntryWithMachine);
syncEntryWithMachine();

// Авторасчет диаметра отверстия (D - P)
document.getElementById('btn-calc-hole').addEventListener('click', () => {
  const D = getNum('in-d');
  const P = getNum('in-p');
  if (D && P) {
    const hole = Math.max(0, D - P);
    document.getElementById('in-dhole').value = hole.toFixed(2);
  }
});

// Основной расчет G-кода
document.getElementById('btn-calc').addEventListener('click', () => {
  const D = getNum('in-d');
  const P = getNum('in-p');
  const Dc = getNum('in-dc');
  const L = getNum('in-l');
  const Lcut = getNum('in-lcut') || P;
  const Zsafe = getNum('in-zsafe') !== null ? getNum('in-zsafe') : 0.5;

  let Dhole = getNum('in-dhole');
  if (!Dhole && D && P) {
    Dhole = D - P;
  }

  const machine = machineSelect.value;
  const entryType = entrySelect.value;
  const threadType = document.getElementById('sel-thread-type').value;
  const xMode = document.getElementById('sel-x-mode').value;
  const holeType = document.getElementById('sel-hole-type').value;
  const dir = document.getElementById('sel-dir').value;

  const nRough = parseInt(document.getElementById('in-rough').value) || 1;
  const nFinish = parseInt(document.getElementById('in-finish').value) || 1;

  const feed = getNum('in-f');
  const rpm = getNum('in-s');

  if (!D || !P || !Dc || !L) {
    document.getElementById('output-box').innerText = "Заполните обязательные поля: D, P, Dc и L!";
    return;
  }

  if (threadType === 'internal' && Dc >= Dhole) {
    document.getElementById('output-box').innerText = `Ошибка: Диаметр фрезы Dc (${Dc}) >= отверстия (${Dhole})! Затирание инструмента.`;
    return;
  }

  // Расчет радиального припуска на сторону
  const radialStock = threadType === 'internal' 
    ? (D - Dhole) / 2 
    : (0.5413 * P);

  // Чистовой припуск (0.05 мм или 10% профиля)
  const finishStock = Math.min(0.05, radialStock * 0.15);
  const roughStockTotal = Math.max(0, radialStock - finishStock);

  // Сетка радиальных смещений по X
  const passOffsets = [];
  for (let i = 1; i <= nRough; i++) {
    passOffsets.push(roughStockTotal * (i / nRough));
  }
  for (let i = 1; i <= nFinish; i++) {
    passOffsets.push(radialStock);
  }

  const fParam = feed ? ` F${fanucNum(feed)}` : '';
  const fFastParam = feed ? ` F${fanucNum(Math.max(feed * 4, 1000))}` : ' F1000';
  const fSlowApproach = feed ? ` F${fanucNum(Math.min(feed, 100))}` : ' F100';

  // Расчет полного хода по Z:
  // Для сквозного: длина детали L + безопасный зазор Zsafe + длина гребенки Lcut + перебег 0.2 мм.
  // Для глухого: ход ограничен дном детали + безопасный зазор.
  let rawW = (holeType === 'through')
    ? (L + Zsafe + Lcut + 0.2)
    : (L + Zsafe);

  // Приведение к целому числу витков (кратно шагу P)
  const turns = Math.ceil(rawW / P);
  const strokeW = turns * P;
  const totalDeg = Math.round(turns * 360);

  let gcode = `(=========================================)\n`;
  gcode += `(РЕЗЬБОФРЕЗЕРОВАНИЕ: D${fanucNum(D)} ШАГ ${fanucNum(P)} ГЛУБИНА ${fanucNum(L)})\n`;
  gcode += `(ОТВЕРСТИЕ: ${holeType === 'through' ? 'СКВОЗНОЕ' : 'ГЛУХОЕ'} | ХОД: ${strokeW.toFixed(2)} ММ (${turns} ВИТКОВ))\n`;
  gcode += `(ИНСТРУМЕНТ: Dc${fanucNum(Dc)} Lcut${fanucNum(Lcut)} | ОСЬ X: ${xMode === 'diam' ? 'ДИАМЕТР' : 'РАДИУС'})\n`;
  gcode += `(=========================================)\n`;

  // -------------------------------------------------------------------------
  // 1. ТОКАРНЫЙ СТАНОК SWISS (C: H / W) — АВТОМАТ С ПРОТИВОШПИНДЕЛЕМ
  // -------------------------------------------------------------------------
  if (machine === 'lathe_c') {
    if (rpm) gcode += `M03 S${fanucNum(rpm)}\n`;
    gcode += `G00 C0.\n`;
    gcode += `G00 Z${fanucNum(Zsafe + 4.5)} (БЫСТРЫЙ ПОДХОД К ДЕТАЛИ)\n`;
    gcode += `G01 Z${fanucNum(Zsafe)}${fSlowApproach} (ВЫХОД НА РАБОЧУЮ ТОЧКУ)\n`;

    passOffsets.forEach((radialCut, idx) => {
      const isFinish = idx >= nRough;
      let targetX = 0;

      if (threadType === 'internal') {
        const curD = (Dhole + 2 * radialCut);
        targetX = xMode === 'diam' ? (curD - Dc) : ((curD - Dc) / 2);
      } else {
        const curD = (D - 2 * radialCut);
        targetX = xMode === 'diam' ? (curD + Dc) : ((curD + Dc) / 2);
      }

      gcode += `\n(--- ПРОХОД ${idx + 1}/${passOffsets.length}: СЪЕМ=${radialCut.toFixed(3)} ММ ${isFinish ? '[ЧИСТОВОЙ]' : '[ЧЕРНОВОЙ]'} ---)\n`;

      if (dir === 'bottom_up') {
        // НА ВЫХОД (Z+): погружение на дно через W-, врезание по X, резание на выход W+
        if (idx > 0) gcode += `G00 C0. (СБРОС ОСИ C В ВОЗДУХЕ)\n`;
        gcode += `G01 W-${fanucNum(strokeW)}${fFastParam} (ЗАХОД НА ДНО ПО ЦЕНТРУ X0)\n`;
        gcode += `G01 X${fanucNum(targetX)}${fParam} (ВРЕЗАНИЕ В СТЕНКУ ПО X)\n`;
        gcode += `G01 H${totalDeg}. W${fanucNum(strokeW)}${fParam} (РЕЗАНИЕ НА ВЫХОД ДО Z${fanucNum(Zsafe)})\n`;
        gcode += `G01 X0.${fFastParam} (ОТВОД В ЦЕНТР СНАРУЖИ ДЕТАЛИ)\n`;

      } else {
        // В ДЕТАЛЬ (Z-): смещение по X в воздухе, сквозное резание W-, отвод в центр, возврат W+
        if (idx > 0) gcode += `G00 C0. (СБРОС ОСИ C В ВОЗДУХЕ)\n`;
        gcode += `G01 X${fanucNum(targetX)}${fParam} (СМЕЩЕНИЕ ПО X В ВОЗДУХЕ НА Z${fanucNum(Zsafe)})\n`;
        gcode += `G01 H${totalDeg}. W-${fanucNum(strokeW)}${fParam} (СКВОЗНОЕ РЕЗАНИЕ В ДЕТАЛЬ)\n`;
        gcode += `G01 X0.${fFastParam} (ОТВОД В ЦЕНТР ПОСЛЕ ВЫХОДА ИЗ ДЕТАЛИ)\n`;
        gcode += `G01 W${fanucNum(strokeW)}${fFastParam} (ВОЗВРАТ ПО ЦЕНТРУ НА СТАРТ Z${fanucNum(Zsafe)})\n`;
      }
    });

    gcode += `\nG00 Z${fanucNum(Zsafe + 4.5)} (ОТХОД ОТ ТОРЦА)\n`;
    gcode += `G28 W0. (ВОЗВРАТ ПРОТИВОШПИНДЕЛЯ В НУЛЬ)\n`;
    if (rpm) gcode += `M05\n`;

  // -------------------------------------------------------------------------
  // 2. ФРЕЗЕРНЫЙ СТАНОК (XYZ: G02 / G03)
  // -------------------------------------------------------------------------
  } else {
    let fCenterStr = '';
    if (feed) {
      const fCenter = Math.round(feed * ((D - Dc) / D));
      fCenterStr = ` F${fanucNum(fCenter)}`;
      gcode += `(ПОДАЧА ЦЕНТРА ФРЕЗЫ: F${fanucNum(fCenter)} ММ/МИН | НА КРОМКЕ: F${fanucNum(feed)})\n`;
    }

    gcode += `G90 G17 G40\n`;
    if (rpm) gcode += `M03 S${fanucNum(rpm)}\n`;
    gcode += `G00 X0. Y0.\n`;

    const zStart = dir === 'bottom_up' ? -strokeW : Zsafe;
    const zSign = dir === 'bottom_up' ? 1 : -1;

    passOffsets.forEach((radialCut, idx) => {
      const curD = Dhole + 2 * radialCut;
      const Rpath = (curD - Dc) / 2;

      gcode += `\n(--- ПРОХОД ${idx + 1}: D=${fanucNum(curD)} R=${fanucNum(Rpath)} ---)\n`;
      gcode += `G00 Z${fanucNum(zStart)}\n`;

      if (entryType === 'radial') {
        gcode += `G01 X${fanucNum(Rpath)} Y0.${fCenterStr} (РАДИАЛЬНЫЙ ВРЕЗ)\n`;
        gcode += `G03 X${fanucNum(Rpath)} Y0. I-${fanucNum(Rpath)} J0. Z${fanucNum(zStart + zSign * strokeW)}${fCenterStr} (ВИНТОВОЙ ПРОХОД)\n`;
        gcode += `G01 X0. Y0.${fParam} (ОТВОД В ЦЕНТР)\n`;
      } else {
        const rArc = Rpath / 2;
        gcode += `G03 X${fanucNum(Rpath)} Y0. I${fanucNum(rArc)} J0. Z${fanucNum(zStart + zSign * P / 2)}${fCenterStr} (ДУГОВОЙ ЗАХОД)\n`;
        gcode += `G03 X${fanucNum(Rpath)} Y0. I-${fanucNum(Rpath)} J0. Z${fanucNum(zStart + zSign * (P / 2 + strokeW))}${fCenterStr} (ВИНТОВОЙ ПРОХОД)\n`;
        gcode += `G03 X0. Y0. I-${fanucNum(rArc)} J0. Z${fanucNum(zStart + zSign * (P + strokeW))}${fCenterStr} (ДУГОВОЙ ВЫХОД)\n`;
      }
    });

    gcode += `\nG00 Z${fanucNum(Zsafe + 5.0)} (ОТХОД НА БЕЗОПАСНУЮ ВЫСОТУ)\n`;
    if (rpm) gcode += `M05\n`;
  }

  document.getElementById('output-box').innerText = gcode;
});

// Кнопка очистки
document.getElementById('btn-clean').addEventListener('click', () => {
  document.querySelectorAll('input').forEach(input => {
    if (input.id === 'in-rough') input.value = '2';
    else if (input.id === 'in-finish') input.value = '1';
    else if (input.id === 'in-zsafe') input.value = '0.5';
    else input.value = '';
  });
  document.getElementById('output-box').innerText = 'G-код появится здесь...';
});

// Кнопка копирования в буфер обмена
document.getElementById('btn-copy').addEventListener('click', () => {
  const text = document.getElementById('output-box').innerText;
  if (!text || text.includes('G-код появится здесь')) return;
  navigator.clipboard.writeText(text).then(() => {
    alert('G-код скопирован в буфер обмена!');
  });
});