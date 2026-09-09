<<<<<<< HEAD
// Плавное скрытие прелоадера
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('done');
    }, 350);
  }
});

// Парсер чисел
const getNum = (id) => {
  const el = document.getElementById(id);
  if (!el || el.value.trim() === '') return null;
  const val = parseFloat(el.value.replace(',', '.'));
  return isNaN(val) ? null : val;
};

// Форматирование чисел для Fanuc
const fanucNum = (val) => {
  const rounded = Number(val.toFixed(3));
  const str = rounded.toString();
  return str.includes('.') ? str : str + '.';
};

// Авторасчет отверстия (D - P)
document.getElementById('btn-calc-hole').addEventListener('click', () => {
  const D = getNum('in-d');
  const P = getNum('in-p');
  if (D && P) {
    const hole = Math.max(0, D - P);
    document.getElementById('in-dhole').value = hole.toFixed(2);
  }
});

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

  const machine = document.getElementById('sel-machine').value;
  const entryType = document.getElementById('sel-entry').value;
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
    document.getElementById('output-box').innerText = `Ошибка: Dc фрезы (${Dc}) >= D отверстия (${Dhole})!`;
    return;
  }

  // Припуск на сторону
  const radialStock = threadType === 'internal' ? (D - Dhole) / 2 : (0.5413 * P);
  const finishStock = Math.min(0.05, radialStock * 0.15);
  const roughStockTotal = Math.max(0, radialStock - finishStock);

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

  // Инкремент W и угол H
  const zBackOvercut = holeType === 'through' ? P : 0;
  const totalW = L + zBackOvercut + Zsafe;
  const isSingleTooth = Lcut <= (P * 1.25);
  const strokeW = isSingleTooth ? totalW : (P + Zsafe);
  const totalTurns = strokeW / P;
  const totalDeg = totalTurns * 360;

  let gcode = `(=========================================)\n`;
  gcode += `(РЕЗЬБОФРЕЗЕРОВАНИЕ: D${fanucNum(D)} ШАГ ${fanucNum(P)} ГЛУБИНА ${fanucNum(L)})\n`;
  gcode += `(ОТВЕРСТИЕ: ${holeType === 'through' ? 'СКВОЗНОЕ' : 'ГЛУХОЕ'} | СТАРТ Z${fanucNum(Zsafe)})\n`;
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
        // НА ВЫХОД: Сначала заход на дно через W-, врез, выход W+
        if (idx > 0) {
          gcode += `G00 C0. (СБРОС ОСИ C В ВОЗДУХЕ)\n`;
        }
        gcode += `G01 W-${fanucNum(strokeW)}${fFastParam} (ЗАХОД НА ДНО ПО ЦЕНТРУ X0)\n`;
        gcode += `G01 X${fanucNum(targetX)}${fParam} (ВРЕЗАНИЕ В СТЕНКУ ПО X)\n`;
        gcode += `G01 H${fanucNum(totalDeg)} W${fanucNum(strokeW)}${fParam} (РЕЗАНИЕ НА ВЫХОД В ВОЗДУХ ДО Z${fanucNum(Zsafe)})\n`;
        gcode += `G01 X0.${fFastParam} (ОТВОД В ЦЕНТР СНАРУЖИ ДЕТАЛИ)\n`;

      } else {
        // В ДЕТАЛЬ: Врез в воздухе на Zsafe, резание W-, отвод на дне X0, возврат W+
        if (idx > 0) {
          gcode += `G00 C0. (СБРОС ОСИ C В ВОЗДУХЕ)\n`;
        }
        gcode += `G01 X${fanucNum(targetX)}${fParam} (СМЕЩЕНИЕ ПО X В ВОЗДУХЕ)\n`;
        gcode += `G01 H${fanucNum(totalDeg)} W-${fanucNum(strokeW)}${fParam} (РЕЗАНИЕ В ДЕТАЛЬ С ТОРЦА)\n`;
        gcode += `G01 X0.${fFastParam} (ОТВОД В ЦЕНТР НА ДНЕ)\n`;
        gcode += `G01 W${fanucNum(strokeW)}${fFastParam} (ВОЗВРАТ ПО ЦЕНТРУ НА ВЫХОД Z${fanucNum(Zsafe)})\n`;
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
    }

    gcode += `G90 G17 G40\n`;
    if (rpm) gcode += `M03 S${fanucNum(rpm)}\n`;
    gcode += `G00 X0. Y0.\n`;

    const zStart = dir === 'bottom_up' ? -(L + zBackOvercut) : Zsafe;
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

    gcode += `\nG00 Z${fanucNum(Zsafe + 5.0)}\n`;
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

// Кнопка копирования
document.getElementById('btn-copy').addEventListener('click', () => {
  const text = document.getElementById('output-box').innerText;
  if (!text || text.includes('G-код появится здесь')) return;
  navigator.clipboard.writeText(text).then(() => {
    alert('G-код скопирован в буфер обмена!');
  });
=======
// Плавное скрытие прелоадера
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('done');
    }, 350);
  }
});

// Парсер чисел
const getNum = (id) => {
  const el = document.getElementById(id);
  if (!el || el.value.trim() === '') return null;
  const val = parseFloat(el.value.replace(',', '.'));
  return isNaN(val) ? null : val;
};

// Форматирование чисел для Fanuc
const fanucNum = (val) => {
  const rounded = Number(val.toFixed(3));
  const str = rounded.toString();
  return str.includes('.') ? str : str + '.';
};

// Авторасчет отверстия (D - P)
document.getElementById('btn-calc-hole').addEventListener('click', () => {
  const D = getNum('in-d');
  const P = getNum('in-p');
  if (D && P) {
    const hole = Math.max(0, D - P);
    document.getElementById('in-dhole').value = hole.toFixed(2);
  }
});

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

  const machine = document.getElementById('sel-machine').value;
  const entryType = document.getElementById('sel-entry').value;
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
    document.getElementById('output-box').innerText = `Ошибка: Dc фрезы (${Dc}) >= D отверстия (${Dhole})!`;
    return;
  }

  // Припуск на сторону
  const radialStock = threadType === 'internal' ? (D - Dhole) / 2 : (0.5413 * P);
  const finishStock = Math.min(0.05, radialStock * 0.15);
  const roughStockTotal = Math.max(0, radialStock - finishStock);

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

  // Инкремент W и угол H
  const zBackOvercut = holeType === 'through' ? P : 0;
  const totalW = L + zBackOvercut + Zsafe;
  const isSingleTooth = Lcut <= (P * 1.25);
  const strokeW = isSingleTooth ? totalW : (P + Zsafe);
  const totalTurns = strokeW / P;
  const totalDeg = totalTurns * 360;

  let gcode = `(=========================================)\n`;
  gcode += `(РЕЗЬБОФРЕЗЕРОВАНИЕ: D${fanucNum(D)} ШАГ ${fanucNum(P)} ГЛУБИНА ${fanucNum(L)})\n`;
  gcode += `(ОТВЕРСТИЕ: ${holeType === 'through' ? 'СКВОЗНОЕ' : 'ГЛУХОЕ'} | СТАРТ Z${fanucNum(Zsafe)})\n`;
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
        // НА ВЫХОД: Сначала заход на дно через W-, врез, выход W+
        if (idx > 0) {
          gcode += `G00 C0. (СБРОС ОСИ C В ВОЗДУХЕ)\n`;
        }
        gcode += `G01 W-${fanucNum(strokeW)}${fFastParam} (ЗАХОД НА ДНО ПО ЦЕНТРУ X0)\n`;
        gcode += `G01 X${fanucNum(targetX)}${fParam} (ВРЕЗАНИЕ В СТЕНКУ ПО X)\n`;
        gcode += `G01 H${fanucNum(totalDeg)} W${fanucNum(strokeW)}${fParam} (РЕЗАНИЕ НА ВЫХОД В ВОЗДУХ ДО Z${fanucNum(Zsafe)})\n`;
        gcode += `G01 X0.${fFastParam} (ОТВОД В ЦЕНТР СНАРУЖИ ДЕТАЛИ)\n`;

      } else {
        // В ДЕТАЛЬ: Врез в воздухе на Zsafe, резание W-, отвод на дне X0, возврат W+
        if (idx > 0) {
          gcode += `G00 C0. (СБРОС ОСИ C В ВОЗДУХЕ)\n`;
        }
        gcode += `G01 X${fanucNum(targetX)}${fParam} (СМЕЩЕНИЕ ПО X В ВОЗДУХЕ)\n`;
        gcode += `G01 H${fanucNum(totalDeg)} W-${fanucNum(strokeW)}${fParam} (РЕЗАНИЕ В ДЕТАЛЬ С ТОРЦА)\n`;
        gcode += `G01 X0.${fFastParam} (ОТВОД В ЦЕНТР НА ДНЕ)\n`;
        gcode += `G01 W${fanucNum(strokeW)}${fFastParam} (ВОЗВРАТ ПО ЦЕНТРУ НА ВЫХОД Z${fanucNum(Zsafe)})\n`;
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
    }

    gcode += `G90 G17 G40\n`;
    if (rpm) gcode += `M03 S${fanucNum(rpm)}\n`;
    gcode += `G00 X0. Y0.\n`;

    const zStart = dir === 'bottom_up' ? -(L + zBackOvercut) : Zsafe;
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

    gcode += `\nG00 Z${fanucNum(Zsafe + 5.0)}\n`;
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

// Кнопка копирования
document.getElementById('btn-copy').addEventListener('click', () => {
  const text = document.getElementById('output-box').innerText;
  if (!text || text.includes('G-код появится здесь')) return;
  navigator.clipboard.writeText(text).then(() => {
    alert('G-код скопирован в буфер обмена!');
  });
>>>>>>> e6fd0a4633c01dfda77c895ace490db9ce1726a6
});