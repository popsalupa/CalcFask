const operationsData = {
  'front-chamfer': {
    title: 'Передняя фаска',
    desc: 'Расчет координат с компенсацией радиуса резца R (по X и Z), подрезка торца и генерация траектории чистового прохода.'
  },
  'back-chamfer': {
    title: 'Задняя фаска',
    desc: 'Вычисление точки входа и выхода обратной фаски с переходом в диаметр шейки или буртик.'
  },
  'fillet-radius': {
    title: 'Радиусы и галтели (G2 / G3)',
    desc: 'Круговая интерполяция квадрантов и плавных радиусных переходов с учетом скругления режущей кромки.'
  },
  'lathe-thread': {
    title: 'Токарная резьба',
    desc: 'Выбор профилей (ISO Metric, UNC/UNF, G) и генерация многопроходных циклов резьбонарезания G76/G92.'
  },
  'thread-milling': {
    title: 'Резьбофрезерование',
    desc: 'Винтовая интерполяция фрезы, расчет эффективных подач инструментального центра и траектории плавного захода по дуге.'
  },
  'grooving': {
    title: 'Канавки и отрезка',
    desc: 'Расчет положений левой/правой кромки канавочного резца, снятия фасок на кромках канавки и отрезных переходов.'
  },
  'milling-ops': {
    title: 'Фрезерование',
    desc: 'Расчет параметров обработки плоскостей, пазов и карманов: ширина фрезерования (Ae), осевая глубина (Ap), съем стружки.'
  },
  'speeds-feeds': {
    title: 'Расчеты оборотов и подач для пластин',
    desc: 'Формулы пересчета: n = (1000 * Vc) / (π * D), расчет подач на зуб (Fz), минутной подачи (F) и мощности шпинделя.'
  },
  'trapezoid-thread': {
    title: 'Расчет трапеции (Tr)',
    desc: 'Расчет параметров трапецеидальной резьбы по ГОСТ/DIN: профиль 30°, средний/внутренний диаметр, зазоры и шаг.'
  },
  'macro-g900': {
    title: 'G900 (Макропрограмма)',
    desc: 'Настройка специализированного макроцикла G900: входные переменные, технологические параметры и логика ветвления.'
  },
  'cycle-g32': {
    title: 'G32 (Резьбонарезание)',
    desc: 'Синхронное однопроходное нарезание резьбы: постоянный и переменный шаг, конические и торцевые переходы без ограничений цикла.'
  },
  'gm-codes': {
    title: 'G и M коды',
    desc: 'Полный справочник команд подготовительных (G) и вспомогательных (M) функций токарных и фрезерных систем ЧПУ.'
  },
  'additional-info': {
    title: 'Дополнительная информация',
    desc: 'Инженерная библиотека: таблицы посадок и квалитетов, ряды стандартных резьб, геометрия пластин и теоретическая шероховатость Ra.'
  }
};

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalCloseBtn = document.getElementById('modal-close-btn');

function openOperation(id) {
  const op = operationsData[id];
  if (!op) return;
  modalTitle.textContent = op.title;
  modalDesc.textContent = op.desc;
  modal.style.display = 'flex';
}

function closeModal() {
  modal.style.display = 'none';
}

// Слушатели на карточки операций
document.querySelectorAll('.calc-card').forEach(card => {
  card.addEventListener('click', () => {
    const opId = card.getAttribute('data-op');
    if (opId === 'front-chamfer') {
      window.location.href = 'frFasc.html';
      return;
    }
    openOperation(opId);
  });
});


// Закрытие окна
modalCloseBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
