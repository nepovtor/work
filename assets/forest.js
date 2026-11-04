
/* Лесная история — обновление интерфейса и игровых дней.
   Основа игры и локальные сохранения ecoFarm_v18 остаются нетронутыми. */
(function () {
  'use strict';
  const META_KEY = 'ecoFarm_fieldnotes_v1';
  const oldMeta = (() => {
    try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') || {}; } catch (_) { return {}; }
  })();
  const meta = {
    startedOn: oldMeta.startedOn || '',
    visitDates: Array.isArray(oldMeta.visitDates) ? oldMeta.visitDates : [],
    viewMode: ['auto', 'day', 'night'].includes(oldMeta.viewMode) ? oldMeta.viewMode : 'auto'
  };
  const $ = (id) => document.getElementById(id);
  const escapeHTML = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateKey = (date) => {
    const d = date || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  };
  const dayIndex = (a,b) => {
    const ua = Date.UTC(...a.split('-').map((x,i)=>i===1?+x-1:+x));
    const ub = Date.UTC(...b.split('-').map((x,i)=>i===1?+x-1:+x));
    return Math.floor((ub-ua)/86400000);
  };
  function storeMeta() {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (_) {}
  }
  function visitToday() {
    const today = dateKey();
    if (!meta.startedOn || dayIndex(meta.startedOn, today) < 0) meta.startedOn = today;
    if (!meta.visitDates.includes(today)) meta.visitDates.push(today);
    meta.visitDates = [...new Set(meta.visitDates)].sort().slice(-400);
    storeMeta();
  }
  function getGameDay() { return Math.max(1,dayIndex(meta.startedOn || dateKey(),dateKey())+1); }
  function getVisitStreak() {
    let d = new Date();
    let result = 0;
    if (!meta.visitDates.includes(dateKey(d))) d.setDate(d.getDate()-1);
    while(meta.visitDates.includes(dateKey(d))) { result++; d.setDate(d.getDate()-1); }
    return result;
  }

  const quizBank = [
    {category:'Переработка',q:'Куда правильно сдать использованную батарейку?',opts:['В контейнер для бумаги','В специальный пункт сбора','В обычную урну','Закопать в землю'],ans:1,explain:'Батарейки принимают отдельно: их компоненты требуют специальной обработки.'},
    {category:'Переработка',q:'Что лучше сделать с чистой стеклянной банкой?',opts:['Выбросить в смешанные отходы','Разбить на мелкие кусочки','Использовать повторно или сдать как стекло','Сжечь'],ans:2,explain:'Повторное использование продлевает срок службы вещи, а раздельный сбор помогает переработке.'},
    {category:'Переработка',q:'Почему бумагу и картон лучше сдавать сухими?',opts:['Они меньше пахнут','Влажные волокна хуже сохраняют качество и могут загрязнить партию','Их нельзя поднять','Это не имеет значения'],ans:1,explain:'Влага и загрязнения могут затруднять сортировку и дальнейшую переработку.'},
    {category:'Переработка',q:'Что означает цифра 1 внутри треугольника на пластиковой упаковке?',opts:['Пластик можно переработать где угодно','Это тип пластика PET','Упаковка полностью биоразлагаемая','Изделие одноразовое'],ans:1,explain:'Маркировка 1 указывает материал PET. Возможность сдать его зависит от местных правил.'},
    {category:'Переработка',q:'Куда обычно относят старый сломанный телефон?',opts:['В контейнер для пищевых отходов','В пункт приёма электроники','В макулатуру','В компост'],ans:1,explain:'Электроника содержит материалы, которые нужно извлекать и обрабатывать отдельно.'},
    {category:'Лес',q:'Почему в лесу лучше ходить по существующим тропам?',opts:['Так всегда короче','Это уменьшает вытаптывание растений и почвы','Там нет насекомых','Так не дует ветер'],ans:1,explain:'Меньше новых троп — меньше повреждённых растений и уплотнённой почвы.'},
    {category:'Лес',q:'Что помогает диким опылителям в городе?',opts:['Разнообразные цветущие растения','Больше асфальта','Меньше зелёных зон','Удаление всех лугов'],ans:0,explain:'Разные цветущие растения дают пчёлам и другим опылителям пищу в течение сезона.'},
    {category:'Лес',q:'Почему не стоит подкармливать диких животных человеческой едой?',opts:['Пища всегда слишком дорогая','Она может навредить животным и изменить их поведение','Животные не чувствуют вкус','Это запрещено в любой стране'],ans:1,explain:'Неподходящая еда и привыкание к людям могут быть опасны для диких животных.'},
    {category:'Лес',q:'Зачем в парке иногда оставляют лежащие мёртвые деревья?',opts:['О них забыли','Они помогают насекомым, грибам и птицам','Они ускоряют рост асфальта','Чтобы скрыть тропы'],ans:1,explain:'Мёртвая древесина — важная среда обитания для многих организмов.'},
    {category:'Лес',q:'Какой способ посадки дерева обычно лучше для местной природы?',opts:['Выбрать подходящий местный вид','Выбрать самое быстрорастущее экзотическое дерево','Сажать без учёта почвы','Сажать вплотную к взрослому стволу'],ans:0,explain:'Местные виды, подходящие почве и климату, обычно лучше вписываются в экосистему.'},
    {category:'Привычки',q:'Как уменьшить количество одноразовой упаковки?',opts:['Покупать более мелкие упаковки','Чаще брать многоразовую бутылку и сумку','Каждый день менять сумку','Не сортировать отходы'],ans:1,explain:'Многоразовые вещи позволяют избежать части отходов ещё до их появления.'},
    {category:'Привычки',q:'Что разумнее сделать с исправной вещью, которая больше не нужна?',opts:['Сразу выбросить','Отдать, продать или передать на повторное использование','Разобрать и потерять детали','Оставить на улице'],ans:1,explain:'Повторное использование помогает экономить ресурсы, уже потраченные на производство.'},
    {category:'Привычки',q:'Как экономить воду при чистке зубов?',opts:['Оставить кран открытым','Закрывать кран, пока чистишь','Использовать горячую воду постоянно','Мыть щётку пять минут'],ans:1,explain:'Закрытый кран снижает расход воды без потери удобства.'},
    {category:'Привычки',q:'Когда нужна новая покупка, что стоит проверить в первую очередь?',opts:['Можно ли починить или использовать то, что уже есть','Есть ли яркая упаковка','Сколько рекламы у товара','Насколько он тяжёлый'],ans:0,explain:'Ремонт и повторное использование часто сокращают расход материалов.'},
    {category:'Привычки',q:'Что помогает уменьшить пищевые отходы?',opts:['Покупать продукты без списка','Планировать блюда и проверять запасы','Готовить всё сразу с запасом на месяц','Выбрасывать продукты по цвету'],ans:1,explain:'Планирование покупок и хранение продуктов помогают реже выбрасывать еду.'},
    {category:'Климат',q:'Что лучше всего описывает климат?',opts:['Погода прямо сейчас','Многолетние закономерности погоды','Один дождливый вечер','Температура за один час'],ans:1,explain:'Климат описывает долгосрочные характеристики погоды, а не состояние в отдельный день.'},
    {category:'Климат',q:'Что происходит при фотосинтезе?',opts:['Растения используют свет, воду и CO₂ для создания органических веществ','Растения превращают пластик в кислород','Почва превращается в стекло','Листья перестают испарять воду'],ans:0,explain:'При фотосинтезе растения используют световую энергию для образования органических веществ.'},
    {category:'Климат',q:'Какое действие обычно сокращает расход энергии дома?',opts:['Оставлять свет включённым','Выключать ненужное освещение','Открывать холодильник надолго','Постоянно держать все приборы в работе'],ans:1,explain:'Меньше ненужной работы приборов — меньше расход электричества.'},
    {category:'Климат',q:'Почему городской зелени важно оставлять место?',opts:['Она может давать тень и помогать охлаждению улиц','Она заменяет водопровод','Она всегда устраняет все загрязнения','Она делает дороги быстрее'],ans:0,explain:'Деревья создают тень, а испарение воды растениями помогает снижать локальный перегрев.'},
    {category:'Климат',q:'Что такое компост?',opts:['Смесь стекла и металла','Материал, полученный из разложения органических отходов','Любой бытовой мусор','Новое название пластика'],ans:1,explain:'Компост образуется при контролируемом разложении органического материала.'},
    {category:'Считаем вместе',q:'Из 20 кг бумаги собрали ещё 5 кг. Сколько стало?',opts:['15 кг','20 кг','25 кг','30 кг'],ans:2,explain:'20 + 5 = 25 кг.'},
    {category:'Считаем вместе',q:'Для дерева нужно 10 единиц бумаги. Сколько деревьев можно посадить за 50 единиц?',opts:['3','4','5','10'],ans:2,explain:'50 ÷ 10 = 5 деревьев.'},
    {category:'Считаем вместе',q:'Ты сократил расход с 10 бутылок до 6. На сколько бутылок меньше?',opts:['2','3','4','6'],ans:2,explain:'10 − 6 = 4 бутылки.'},
    {category:'Считаем вместе',q:'Три друга собрали по 4 единицы макулатуры. Сколько всего?',opts:['7','10','12','16'],ans:2,explain:'3 × 4 = 12 единиц.'},
    {category:'Считаем вместе',q:'Из 40 кг бумаги 25% отправили на переработку. Сколько это килограммов?',opts:['5 кг','10 кг','15 кг','20 кг'],ans:1,explain:'Четверть от 40 — это 10 кг.'},
    {category:'Считаем вместе',q:'Собрали 80 кг бумаги, затем ещё 20 кг. На сколько процентов увеличилось количество?',opts:['10%','20%','25%','40%'],ans:2,explain:'Прирост 20 относительно исходных 80: 20 ÷ 80 × 100% = 25%.'},
    {category:'Лес',q:'Как лучше поступить, если нашёл птичье гнездо с яйцами?',opts:['Взять яйца для фото','Наблюдать издалека и не тревожить','Перенести гнездо поближе','Накормить птенцов хлебом'],ans:1,explain:'Лучше не приближаться и не вмешиваться в жизнь птиц без необходимости.'},
    {category:'Привычки',q:'Как разумнее поступить с одеждой, у которой оторвалась пуговица?',opts:['Сразу выбросить','Пришить новую пуговицу','Покрасить целиком','Купить три замены'],ans:1,explain:'Простой ремонт продлевает срок службы вещей.'},
    {category:'Переработка',q:'Что лучше сделать с чистой картонной коробкой от посылки?',opts:['Сдать с бумагой или использовать повторно','Выбросить в органику','Оставить под дождём','Сжечь во дворе'],ans:0,explain:'Чистый картон обычно подходит для сбора бумаги, если местные правила это допускают.'},
    {category:'Климат',q:'Почему качество воздуха может ухудшаться у оживлённых дорог?',opts:['Из-за выхлопов и частиц от транспорта','Потому что там больше облаков','Из-за цвета дорожной разметки','Из-за дорожных знаков'],ans:0,explain:'Транспорт может быть источником газов и твёрдых частиц, влияющих на качество воздуха.'}
  ];
  function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619);}return h>>>0;}
  function seededSet(count) {
    let seed=hashString(dateKey()+'|'+(typeof playerName==='string'?playerName:'player'));
    function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    const bank=quizBank.slice();
    for(let i=bank.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[bank[i],bank[j]]=[bank[j],bank[i]];}
    return bank.slice(0,count).map(q=>Object.assign({},q,{answered:false,chosen:-1}));
  }

  const originalSave = window.save;
  window.save = function(){originalSave();storeMeta();};
  window.checkDailyReset = function() {
    const today = new Date().toDateString();
    if (lastTaskDate !== today) {
      dailyTasks = seededSet(5);
      lastTaskDate = today;
      searchCount = 0;
      save();
    } else if (!Array.isArray(dailyTasks) || dailyTasks.length < 5) {
      const old = Array.isArray(dailyTasks) ? dailyTasks : [];
      const added = seededSet(5).filter(q=>!old.some(a=>a.q===q.q));
      dailyTasks = old.concat(added.slice(0,Math.max(0,5-old.length)));
      save();
    }
  };

  function countAnswered() { return dailyTasks.filter(q=>q.answered).length; }
  function countCorrect(){return dailyTasks.filter(q=>q.answered && q.chosen===q.ans).length;}
  window.renderTasks = function() {
    const container=$('tasksContainer');
    if(!container)return;
    const completed=countAnswered(), correct=countCorrect(), total=dailyTasks.length||5;
    container.innerHTML = '<div class="quiz-summary"><div><div class="section-kicker">ЗНАНИЯ РАСТУТ КАЖДЫЙ ДЕНЬ</div><strong>'+completed+' из '+total+' вопросов</strong><p>Верных ответов: '+correct+'. Новые задания появятся завтра.</p></div><div class="day-num">'+correct+'/'+total+'</div></div>';
    dailyTasks.forEach((q,index)=>{
      const card=document.createElement('article');card.className='task-card quiz-card';
      const options=q.opts.map((option,i)=>{
        let cls='';
        if(q.answered && i===q.ans) cls='correct';
        if(q.answered && i===q.chosen && q.chosen!==q.ans) cls='wrong';
        return '<button class="'+cls+'" onclick="answerTask('+index+','+i+')" '+(q.answered?'disabled':'')+'>'+escapeHTML(option)+'</button>';
      }).join('');
      const hint=q.answered?('<div class="quiz-result '+(q.chosen===q.ans?'':'is-wrong')+'"><strong>'+(q.chosen===q.ans?'Верно. +5 макулатуры':'Не совсем.')+'</strong> '+escapeHTML(q.explain||'Правильный ответ отмечен зелёным.')+'</div>'):'';
      card.innerHTML='<div class="quiz-eyebrow"><span>'+escapeHTML(q.category||'Эко-знания')+'</span><span>·</span><span>ВОПРОС '+(index+1)+'/'+total+'</span><div class="quiz-progress-track"><span class="quiz-progress-fill" style="width:'+(q.answered?100:0)+'%"></span></div></div><h4>'+escapeHTML(q.q)+'</h4><div class="task-options">'+options+'</div>'+hint;
      container.appendChild(card);
    });
  };
  window.answerTask = function(taskIndex,optIndex){
    const task=dailyTasks[taskIndex];
    if(!task||task.answered||optIndex<0||optIndex>=task.opts.length)return;
    task.chosen=optIndex;task.answered=true;
    if(optIndex===task.ans){addPaper(5);talk('Отличный ответ. +5 бумаги!');}
    else talk('Ответ можно узнать из подсказки.');
    save();renderTasks();updateStats();renderDayViews();
  };

  function logoSVG() {
    return '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M21 34V20" stroke="#f5f8dd" stroke-width="3" stroke-linecap="round"/><path d="M21 25C9 27 6 19 9 12c5 1 11 4 12 13Z" fill="#c6db99"/><path d="M21 21c0-10 7-15 15-14 1 8-2 16-15 17V21Z" fill="#f4d6a1"/><path d="M21 20c-3 4-6 7-10 8" stroke="#f5f8dd" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  function ensureShell() {
    if(!$('appHeader')) {
      const header=document.createElement('header');
      header.className='app-header';header.id='appHeader';header.hidden=true;
      header.innerHTML='<div class="brand"><div class="brand-icon">'+logoSVG()+'</div><div><strong class="brand-name">Лесная история</strong><span class="brand-caption">маленькие действия — большой лес</span></div></div><div class="top-status"><span class="status-chip status-chip--filled"><span class="status-indicator"></span> Лес растёт</span><span class="status-chip">День <em id="headerDay">1</em></span></div>';
      $('app').prepend(header);
    }
    if(!$('tabDaysBtn')) {
      const button=document.createElement('button');
      button.id='tabDaysBtn';button.className='tab-btn';
      button.textContent='◷  Дни и календарь';
      button.setAttribute('onclick',"switchTab('days', this)");
      const stats=$('screen-stats');
      $('mainGame').querySelector('.sidebar').insertBefore(button, $('mainGame').querySelector('.sidebar').querySelector('.tab-btn:last-child'));
      const days=document.createElement('div');days.id='screen-days';days.className='screen';
      days.innerHTML='<div class="section-kicker">ИСТОРИЯ ТВОЕГО ЛЕСА</div><h3>День за днём</h3><p class="screen-intro">Каждый визит — новая страница. Здесь видно, когда ты возвращался к своему лесу и что успел сделать сегодня.</p><div id="calendarGrid" class="calendar-grid"></div><div id="calendarDetail" class="calendar-detail"></div>';
      stats.parentNode.insertBefore(days,stats);
    }
    const forest=$('screen-forest');
    if(!$('forestTitleRow')){
      const title=document.createElement('div');title.id='forestTitleRow';title.className='forest-title-row';
      title.innerHTML='<div><div class="section-kicker">ТВОЯ ПОЛЯНА</div><h2>Расти, маленький лес.</h2><p>Собирай бумагу, сажай деревья и наблюдай, как меняется мир.</p></div><div class="forest-score"><div class="score-item"><span class="score-icon">♻</span><div><span class="score-value" id="forestPaper">0</span><span class="score-label">макулатура</span></div></div><div class="score-item"><span class="score-icon">◈</span><div><span class="score-value" id="forestWater">0</span><span class="score-label">капли</span></div></div></div>';
      forest.prepend(title);
    }
    if(!$('dayRibbon')){
      const ribbon=document.createElement('div');ribbon.className='day-ribbon';ribbon.id='dayRibbon';
      $('infoPanel').insertAdjacentElement('beforebegin',ribbon);
    }
    if(!$('sceneLabel')){
      const view=$('forestView');
      const label=document.createElement('div');label.id='sceneLabel';label.className='scene-label';label.textContent='•  Твоя живая поляна';
      view.appendChild(label);
    }
    const actions=forest.querySelector('#btnDaily').parentElement;
    if(!actions.classList.contains('forest-controls')){
      actions.classList.add('forest-controls');
      const toggle=document.createElement('button');toggle.id='dayModeToggle';toggle.className='day-mode-btn';
      toggle.type='button';toggle.onclick=()=>{meta.viewMode=meta.viewMode==='auto'?'night':meta.viewMode==='night'?'day':'auto';storeMeta();applyLight();};
      actions.appendChild(toggle);
    }
    const questTitle=$('screen-quests').querySelector('h3');
    if(questTitle)questTitle.textContent='Маршрут исследователя';
    const shopTitle=$('screen-shop').querySelector('h3');
    if(shopTitle)shopTitle.textContent='Мастерская леса';
    const quizTitle=$('screen-tasks').querySelector('h3');
    if(quizTitle)quizTitle.textContent='Ежедневный эко-квиз';
    const quizIntro=$('screen-tasks').querySelector('.screen-intro');
    if(!quizIntro){let p=document.createElement('p');p.className='screen-intro';p.textContent='Пять вопросов каждый день: природа, привычки и немного математики. После ответа — короткое объяснение.';quizTitle.after(p);}
    $('loginScreen').querySelector('h2').textContent='Создай свой лес.';
    $('loginScreen').querySelector('p').textContent='Всё начинается с одного дерева. Выполняй задания, находи ресурсы и наблюдай, как растёт твой собственный маленький мир.';
    $('loginScreen').querySelector('button').textContent='Начать историю';
    $('nameInput').placeholder='Как тебя зовут?';
  }

  function svgTree(type,index) {
    const spruce=type==='🌲';
    const palettes=[['#2d644b','#43845b','#69a074'],['#255e4f','#3c765d','#77a77d'],['#376b44','#4d8c5a','#8bad72'],['#3b6552','#619373','#9ab98a']];
    const c=palettes[index%palettes.length];
    if(spruce) return '<svg aria-hidden="true" viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg"><ellipse cx="52" cy="145" rx="34" ry="5" fill="#264b3a" opacity=".21"/><path d="M46 100h13v45H46Z" fill="#78634f"/><path d="M52 8 15 87h14L11 110h83L72 87h13L52 8Z" fill="'+c[0]+'"/><path d="M52 8 35 53h14L24 109h70L72 87h13L52 8Z" fill="'+c[1]+'"/><path d="M52 8 53 72l23 36h18L72 87h13L52 8Z" fill="'+c[2]+'" opacity=".55"/><path d="M44 34 24 80" stroke="#9dbb95" stroke-width="3" stroke-linecap="round" opacity=".22"/></svg>';
    return '<svg aria-hidden="true" viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="145" rx="30" ry="5" fill="#244c37" opacity=".18"/><path d="M45 90h12v55H45Z" fill="#76634e"/><path d="M50 110 27 91" stroke="#76634e" stroke-width="7" stroke-linecap="round"/><path d="M50 106 72 79" stroke="#76634e" stroke-width="7" stroke-linecap="round"/><ellipse cx="35" cy="68" rx="28" ry="31" fill="'+c[0]+'"/><ellipse cx="67" cy="61" rx="28" ry="34" fill="'+c[1]+'"/><ellipse cx="49" cy="42" rx="31" ry="31" fill="'+c[2]+'"/><path d="M29 44Q43 22 62 29" stroke="#c9dfb5" stroke-width="4" stroke-linecap="round" fill="none" opacity=".24"/></svg>';
  }
  const originalForest=window.renderForest;
  window.renderForest=function(){
    originalForest();
    const view=$('forestView');if(!view)return;
    if(!view.querySelector('.scene-hill-back')){
      ['scene-hill scene-hill-back','scene-hill scene-hill-mid','scene-grass','scene-stars'].forEach(cls=>{
        const e=document.createElement('div');e.className='scene-layer '+cls;view.prepend(e);
      });
    }
    view.querySelectorAll('.plant').forEach((el,i)=>{
      const tree=trees[i]||{};
      el.innerHTML=svgTree(tree.type,i);
      const size=Math.min(92+Math.round(i%5)*8,120);
      el.style.width=size+'px';el.style.height=Math.round(size*1.5)+'px';
      el.style.fontSize='0';el.style.bottom=(14 + (+tree.y||6)*.2)+'%';
    });
    applyLight();
  };
  function applyLight(){
    const view=$('forestView');if(!view)return;
    const currentHour=new Date().getHours();
    const night=meta.viewMode==='night'||(meta.viewMode==='auto'&&(currentHour<6||currentHour>=19));
    view.classList.toggle('night',night);
    if(night&&!view.querySelector('.sun-game')){const moon=document.createElement('div');moon.className='sun-game';view.appendChild(moon);}
    const button=$('dayModeToggle');
    if(button)button.textContent=meta.viewMode==='auto'?'◐  Свет: по времени':meta.viewMode==='night'?'☾  Свет: ночь':'☀  Свет: день';
    const label=$('sceneLabel');if(label)label.textContent=night?'•  Тихий вечер в лесу':'•  Твоя живая поляна';
  }

  function renderDayViews(){
    if(!$('dayRibbon'))return;
    const today=new Date();const day=getGameDay();
    const weekday=today.toLocaleDateString('ru-RU',{weekday:'long'});
    const answered=countAnswered(),claimed=dailyBonusDate===today.toDateString();
    const ribbon=$('dayRibbon');
    const dots=Array.from({length:7},(_,i)=> {
      const current=(day-1)%7;
      return '<span class="'+(i<current?'complete':i===current?'today':'')+'"></span>';
    }).join('');
    ribbon.innerHTML='<div class="day-ribbon__text"><div class="day-num">'+day+'</div><div><div class="day-ribbon__title">День '+day+' · '+escapeHTML(weekday)+'</div><div class="day-ribbon__desc">Сегодня: '+answered+'/5 ответов · '+searchCount+'/3 мини-игр'+(claimed?' · награда получена':'')+'</div></div></div><div class="day-ribbon__dots" aria-hidden="true">'+dots+'</div>';
    if($('headerDay'))$('headerDay').textContent=day;
    const paperNode=$('forestPaper'),waterNode=$('forestWater');
    if(paperNode)paperNode.textContent=paper;
    if(waterNode)waterNode.textContent=water;
    renderCalendar();
  }
  function renderCalendar(){
    const grid=$('calendarGrid'),detail=$('calendarDetail');
    if(!grid||!detail)return;
    const today=new Date(),first=new Date(today.getFullYear(),today.getMonth(),today.getDate());
    first.setDate(first.getDate()-(first.getDay()+6)%7);
    const days=['пн','вт','ср','чт','пт','сб','вс'];
    grid.innerHTML=days.map((name,i)=>{
      const d=new Date(first);d.setDate(first.getDate()+i);
      const key=dateKey(d),isToday=key===dateKey(),isFuture=dayIndex(dateKey(),key)>0,visited=meta.visitDates.includes(key);
      const cls=isToday?'today':isFuture?'future':visited?'visited':'';
      return '<div class="calendar-tile '+cls+'"><span class="weekday">'+name+'</span><strong class="date">'+d.getDate()+'</strong><span class="day-state">'+(isToday?'Сегодня':isFuture?'Скоро':visited?'✓ Был здесь':'—')+'</span></div>';
    }).join('');
    const answered=countAnswered(),claimed=dailyBonusDate===today.toDateString(),progress=answered+Math.min(searchCount,3)+(claimed?1:0);
    const streak=getVisitStreak();
    detail.innerHTML='<div><div class="section-kicker">ПЛАН НА СЕГОДНЯ</div><h3>Каждый день имеет значение</h3><p>Вернись завтра за новыми вопросами, мини-играми и ежедневной наградой.</p><div class="calendar-progress"><span style="width:'+Math.round(progress/9*100)+'%"></span></div><p>'+progress+' из 9 дневных действий выполнено</p><div class="calendar-metrics"><span>'+answered+'/5 · викторина</span><span>'+searchCount+'/3 · мини-игры</span><span>'+(claimed?'✓ Награда':'○ Награда')+'</span></div></div><div class="calendar-highlight"><div class="section-kicker">ТВОЙ ПУТЬ</div><div class="big">'+getGameDay()+'-й день</div><p>Дней посещений: '+meta.visitDates.length+'<br>Подряд: '+streak+'<br>Деревьев в лесу: '+trees.length+'</p><small>Дни считаются по календарю с первого входа. Пропущенные дни не исчезают из истории.</small></div>';
  }

  const originalUI=window.updateUI;
  window.updateUI=function(){originalUI();renderDayViews();};
  const originalStats=window.updateStats;
  window.updateStats=function(){originalStats();renderDayViews();};
  const originalInit=window.initGame;
  window.initGame=function(){
    visitToday();ensureShell();originalInit();
    $('appHeader').hidden=false;
    renderDayViews();
  };
  // В исходной игре закрытие мини-игры не останавливало таймер полива.
  const originalClose=window.closeModal;
  window.closeModal=function(id){
    if(id==='waterModal' && typeof waterTimer!=='undefined' && waterTimer){clearInterval(waterTimer);waterTimer=null;}
    originalClose(id);
  };

  function bootstrapLogin(){
    const log=$('loginScreen');if(!log)return;
    log.querySelector('h2').textContent='Создай свой лес.';
    log.querySelector('p').textContent='Всё начинается с одного дерева. Выполняй задания, находи ресурсы и наблюдай, как растёт твой собственный маленький мир.';
    log.querySelector('button').textContent='Начать историю';
    $('nameInput').placeholder='Как тебя зовут?';
  }
  bootstrapLogin();
  setInterval(()=>{
    if($('mainGame') && $('mainGame').style.display==='flex'){
      const was=meta.visitDates.includes(dateKey());
      if(!was){visitToday();checkDailyReset();renderTasks();updateUI();renderDayViews();}
      applyLight();
    }
  },60000);
})();
