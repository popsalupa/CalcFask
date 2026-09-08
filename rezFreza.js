// Парсер чисел (поддерживает запятую и точку)
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
  
  // Кнопка авторасчета отверстия (D - P)
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
    const dir = document.getElementById('sel-dir').value;
  
    const nRough = parseInt(document.getElementById('in-rough').value) || 1;
    const nFinish = parseInt(document.getElementById('in-finish').value) || 1;
  
    // Опциональные подача и обороты
    const feed = getNum('in-f');
    const rpm = getNum('in-s');
  
    if (!D || !P || !Dc || !L) {
      document.getElementById('output-box').innerText = "Заполните обязательные поля: D, P, Dc и L!";
      return;
    }
  
    if (threadType === 'internal' && Dc >= Dhole) {
      document.getElementById('output-box').innerText = `Ошибка: Диаметр фрезы Dc (${Dc}) больше или равен отверстию (${Dhole})! Затирание инструмента.`;
      return;
    }
  
    // Радиальный съем
    const radialStock = threadType === 'internal' 
      ? (D - Dhole) / 2 
      : (0.5413 * P);
  
    // Чистовой припуск (0.05 мм или 10% профиля)
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
    const fFastParam = feed ? ` F${fanucNum(Math.max(feed * 2, 500))}` : '';
  
    // Шапка программы на русском языке
    let gcode = `(=========================================)\n`;
    gcode += `(РЕЗЬБОФРЕЗЕРОВАНИЕ: D${fanucNum(D)} ШАГ ${fanucNum(P)} ГЛУБИНА ${fanucNum(L)})\n`;
    gcode += `(ИНСТРУМЕНТ: Dc${fanucNum(Dc)} | ТИП: ${threadType === 'internal' ? 'ВНУТРЕННЯЯ' : 'НАРУЖНАЯ'} | ОСЬ X: ${xMode === 'diam' ? 'ДИАМЕТР' : 'РАДИУС'})\n`;
    gcode += `(=========================================)\n`;
  
    // -------------------------------------------------------------------------
    // 1. ТОКАРНЫЙ СТАНК (ОСЬ C: H / W)
    // -------------------------------------------------------------------------
    if (machine === 'lathe_c') {
      const isSingleTooth = Lcut <= (P * 1.25);
      const totalTurns = isSingleTooth ? (L / P) : (1 + 30 / 360);
      const totalDeg = totalTurns * 360;
      const totalW = isSingleTooth ? L : P;
  
      if (rpm) {
        gcode += `M03 S${fanucNum(rpm)}\n`;
      }
  
      gcode += `G00 C0.\n`;
      const zStartPos = dir === 'bottom_up' ? -L : Zsafe;
      gcode += `G00 Z${fanucNum(zStartPos)} (ПОДВОД НА БЕЗОПАСНУЮ ТОЧКУ)\n`;
  
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
  
        gcode += `\n(--- ПРОХОД ${idx + 1}/${passOffsets.length}: ГЛУБИНА=${radialCut.toFixed(3)} ММ ${isFinish ? '[ЧИСТОВОЙ]' : '[ЧЕРНОВОЙ]'} ---)\n`;
  
        if (entryType === 'radial') {
          // Радиальный врез
          gcode += `G00 C0.\n`;
          gcode += `G01 X${fanucNum(targetX)}${fParam} (ВРЕЗАНИЕ В МАТЕРИАЛ ПО X)\n`;
  
          if (dir === 'bottom_up') {
            // На выход
            gcode += `G01 H${fanucNum(totalDeg)} W${fanucNum(totalW)}${fParam} (ВИНТОВАЯ ТРАЕКТОРИЯ НА ВЫХОД)\n`;
            gcode += `G01 X0.${fFastParam} (ОТВОД В ЦЕНТР ОТВЕРСТИЯ)\n`;
            gcode += `G01 H-${fanucNum(totalDeg)} W-${fanucNum(totalW)} (ВОЗВРАТ ОСИ C И Z)\n`;
          } else {
            // В деталь
            gcode += `G01 H${fanucNum(totalDeg)} W-${fanucNum(totalW)}${fParam} (ВИНТОВАЯ ТРАЕКТОРИЯ В ДЕТАЛЬ)\n`;
            gcode += `G01 X0.${fFastParam} (ОТВОД В ЦЕНТР ОТВЕРСТИЯ)\n`;
            gcode += `G01 H-${fanucNum(totalDeg)} W${fanucNum(totalW)} (ВОЗВРАТ ОСИ C И Z)\n`;
          }
          gcode += `G01 X0.\n`;
          gcode += `G00 C0.\n`;
  
        } else if (entryType === 'arc') {
          // Дуговой врез
          gcode += `G00 C0.\n`;
          const leadW = P / 4;
          const wSign = dir === 'bottom_up' ? 1 : -1;
          gcode += `G01 X${fanucNum(targetX)} H90. W${fanucNum(wSign * leadW)}${fParam} (ВРЕЗАНИЕ ПО ДУГЕ 90 ГРАД)\n`;
          gcode += `G01 H${fanucNum(totalDeg)} W${fanucNum(wSign * totalW)}${fParam} (ОСНОВНАЯ РЕЗЬБОВАЯ СПИРАЛЬ)\n`;
          gcode += `G01 X0. H90. W${fanucNum(wSign * leadW)} (ВЫХОД ПО ДУГЕ 90 ГРАД В ЦЕНТР)\n`;
          gcode += `G00 C0.\n`;
  
        } else if (entryType === 'linear') {
          // Линейный врез
          gcode += `G00 C0.\n`;
          const leadW = P / 8;
          const wSign = dir === 'bottom_up' ? 1 : -1;
          gcode += `G01 X${fanucNum(targetX)} H45. W${fanucNum(wSign * leadW)}${fParam} (ЛИНЕЙНЫЙ ВРЕЗ ПО КАСАТЕЛЬНОЙ)\n`;
          gcode += `G01 H${fanucNum(totalDeg)} W${fanucNum(wSign * totalW)}${fParam} (ОСНОВНАЯ РЕЗЬБОВАЯ СПИРАЛЬ)\n`;
          gcode += `G01 X0. H45. W${fanucNum(wSign * leadW)} (ЛИНЕЙНЫЙ ВЫХОД В ЦЕНТР)\n`;
          gcode += `G00 C0.\n`;
        }
      });
  
      gcode += `\nG00 Z${fanucNum(Zsafe + 5.0)} (ОТХОД НА БЕЗОПАСНУЮ ВЫСОТУ)\n`;
      if (rpm) gcode += `M05 (ОСТАНОВ ШПИНДЕЛЯ ПРИВОДА)\n`;
  
    // -------------------------------------------------------------------------
    // 2. ФРЕЗЕРНЫЙ СТАНК (G02 / G03)
    // -------------------------------------------------------------------------
    } else {
      let fCenterStr = '';
      if (feed) {
        const fCenter = Math.round(feed * ((D - Dc) / D));
        fCenterStr = ` F${fanucNum(fCenter)}`;
        gcode += `(ПЕРЕСЧЕТ ПОДАЧИ ЦЕНТРА ФРЕЗЫ: F${fanucNum(fCenter)} ММ/МИН | НА КРОМКЕ: F${fanucNum(feed)})\n`;
      }
  
      gcode += `G90 G17 G40\n`;
      if (rpm) gcode += `M03 S${fanucNum(rpm)}\n`;
      gcode += `G00 X0. Y0.\n`;
  
      const zStart = dir === 'bottom_up' ? -L : Zsafe;
      const zSign = dir === 'bottom_up' ? 1 : -1;
  
      passOffsets.forEach((radialCut, idx) => {
        const curD = Dhole + 2 * radialCut;
        const Rpath = (curD - Dc) / 2;
  
        gcode += `\n(--- ПРОХОД ${idx + 1}: ТЕКУЩИЙ ДИАМ=${fanucNum(curD)} РАДИУС ТРАЕКТОРИИ=${fanucNum(Rpath)} ---)\n`;
        gcode += `G00 Z${fanucNum(zStart)}\n`;
  
        if (entryType === 'arc') {
          const rArc = Rpath / 2;
          gcode += `G03 X${fanucNum(Rpath)} Y0. I${fanucNum(rArc)} J0. Z${fanucNum(zStart + zSign * P / 2)}${fCenterStr} (ДУГОВОЙ ПОДВОД 180 ГРАД)\n`;
          gcode += `G03 X${fanucNum(Rpath)} Y0. I-${fanucNum(Rpath)} J0. Z${fanucNum(zStart + zSign * (P / 2 + P))}${fCenterStr} (ПОЛНЫЙ ВИТОК 360 ГРАД)\n`;
          gcode += `G03 X0. Y0. I-${fanucNum(rArc)} J0. Z${fanucNum(zStart + zSign * (2 * P))}${fCenterStr} (ДУГОВОЙ ВЫХОД В ЦЕНТР)\n`;
        } else if (entryType === 'radial') {
          gcode += `G01 X${fanucNum(Rpath)} Y0.${fCenterStr} (РАДИАЛЬНЫЙ ВРЕЗ)\n`;
          gcode += `G03 X${fanucNum(Rpath)} Y0. I-${fanucNum(Rpath)} J0. Z${fanucNum(zStart + zSign * P)}${fCenterStr} (ПОЛНЫЙ ВИТОК 360 ГРАД)\n`;
          gcode += `G01 X0. Y0.${fParam} (ОТВОД В ЦЕНТР)\n`;
        } else if (entryType === 'linear') {
          gcode += `G00 X${fanucNum(Rpath)} Y-${fanucNum(Rpath)}\n`;
          gcode += `G01 X${fanucNum(Rpath)} Y0. Z${fanucNum(zStart + zSign * P / 4)}${fCenterStr} (ВРЕЗ ПО КАСАТЕЛЬНОЙ)\n`;
          gcode += `G03 X${fanucNum(Rpath)} Y0. I-${fanucNum(Rpath)} J0. Z${fanucNum(zStart + zSign * (P / 4 + P))}${fCenterStr} (ПОЛНЫЙ ВИТОК 360 ГРАД)\n`;
          gcode += `G01 X${fanucNum(Rpath)} Y${fanucNum(Rpath)} Z${fanucNum(zStart + zSign * (1.5 * P))}${fCenterStr} (ВЫХОД ПО КАСАТЕЛЬНОЙ)\n`;
          gcode += `G00 X0. Y0.\n`;
        }
      });
  
      gcode += `\nG00 Z${fanucNum(Zsafe + 5.0)} (ОТХОД НА БЕЗОПАСНУЮ ВЫСОТУ)\n`;
      if (rpm) gcode += `M05 (ОСТАНОВ ШПИНДЕЛЯ ПРИВОДА)\n`;
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
  });
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