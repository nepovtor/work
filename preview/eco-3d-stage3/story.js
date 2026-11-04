/**
 * Эко-Ферма 3D — Этап 2: семь игровых глав.
 * Данные хранятся отдельно от исходной игры; отсутствуют таймеры и наказания за пропуски.
 * При необходимости весь маршрут можно пройти за один вечер.
 */
export function createStory(ctx) {
  const { THREE, scene, mat, M, group, box, cylinder, sphere, bench,
    addMesh, state: intro, itemGroups, allPickables, showNote, announce,
    createCharacter, sound, setChapter } = ctx;
  const isQA = new URLSearchParams(location.search).has('qa');
  const KEY = isQA ? 'ecoFarm3D.story.qa' : 'ecoFarm3D.story.v1';
  const DAYS = [
    {title:'Первые находки',tag:'СОРТИРОВКА',sub:'У каждой вещи свой путь.',desc:'Разбери вещи, оставшиеся на дорожках. Если ошибёшься, игра объяснит почему.'},
    {title:'Бумажный маршрут',tag:'МАКУЛАТУРА',sub:'Бумага не обязана стать мусором.',desc:'Собери три пачки чистой сухой бумаги. Мы подготовим её к передаче в пункт приёма.'},
    {title:'Не всё так очевидно',tag:'ПРОВЕРКА ЗНАНИЙ',sub:'Иногда нужно уточнить правила.',desc:'Разберись в трёх ситуациях. Не угадывай по цвету контейнера — подумай о материале.'},
    {title:'Место для отдыха',tag:'УЛУЧШЕНИЕ',sub:'Чистый двор становится удобным.',desc:'Выбери, где поставить новую скамейку. Решение изменит расположение предметов во дворе.'},
    {title:'Книги по кругу',tag:'ПОВТОРНОЕ ИСПОЛЬЗОВАНИЕ',sub:'Не всё обязательно перерабатывать.',desc:'Хорошие книги ещё послужат другим. Передай две книги в уголок обмена.'},
    {title:'Маленький сад',tag:'ОЗЕЛЕНЕНИЕ',sub:'Теперь появится новая зелень.',desc:'Выбери три места для растений. Каждый саженец останется в твоём дворе.'},
    {title:'Соседский день',tag:'ОБЩЕЕ ДЕЛО',sub:'Двор существует благодаря людям.',desc:'Пригласи троих соседей на небольшую встречу. Вместе посмотрим, как изменилось пространство.'}
  ];
  const PAPERS = [
    {id:'school',name:'Тетради из школы',where:'без пластиковых обложек',position:[-8.0,2.1],tip:'У тетрадей лучше отделять пластиковые обложки и другие неподходящие элементы.'},
    {id:'library',name:'Старые газеты',where:'чистые и сухие',position:[-1.2,6.6],tip:'Сухая макулатура легче проходит сортировку. Сильно загрязнённую бумагу принимают не везде.'},
    {id:'workshop',name:'Коробки от поставок',where:'сложить для перевозки',position:[8.0,1.1],tip:'Сложенные коробки занимают меньше места при хранении и перевозке.'}
  ];
  const CASES = [
    {title:'Чистая картонная коробка',text:'Коробка сухая и без пищевых загрязнений. Что с ней сделать?',options:['Сдать с бумагой','Отправить в сбор стекла','Закопать'],correct:0,explanation:'Сухой картон обычно подходит для сбора макулатуры. Проверяй условия своего пункта.'},
    {title:'Использованная батарейка',text:'Батарейка больше не работает. Куда её отправить?',options:['К металлу вместе с банками','В отдельный пункт сбора','В контейнер для бумаги'],correct:1,explanation:'Батарейки собирают отдельно: их нельзя смешивать с обычной упаковкой.'},
    {title:'Коробка из-под напитка',text:'Упаковка состоит из нескольких слоёв разных материалов. Что разумнее?',options:['Считать её обычной бумагой','Сжечь дома','Уточнить местные правила приёма'],correct:2,explanation:'Многослойная упаковка принимается по-разному. Не все пункты перерабатывают её вместе с бумагой.'}
  ];
  const BOOKS = [
    {id:'atlas',name:'Атлас птиц',position:[-6.0,-1.4],detail:'Книга в хорошем состоянии. Пусть её прочтёт кто-нибудь ещё.'},
    {id:'stories',name:'Сказки для соседей',position:[2.15,5.7],detail:'Неиспользуемая книга ещё может стать чьей-то любимой.'}
  ];
  const PLANTS = [
    {id:'shade',name:'У дорожки',position:[-3.0,6.9]},
    {id:'courtyard',name:'Возле мастерской',position:[9.1,3.8]},
    {id:'garden',name:'У цветника',position:[5.25,7.0]}
  ];
  const NEIGHBORS = [
    {id:'lena',name:'Лена',role:'библиотекарь',position:[-2.65,-4.2]},
    {id:'timur',name:'Тимур',role:'мастер',position:[5.0,-.9]},
    {id:'ira',name:'Ира',role:'соседка',position:[-1.2,5.9]}
  ];
  const defaultState = () => ({
    version:1,day:1,credits:0,received:[],answers:[],
    bookIds:[],planted:[],invited:[],bench:'',final:false
  });
  function load() {
    try {
      const saved=JSON.parse(localStorage.getItem(KEY)||'null');
      if (!saved || typeof saved!=='object') return defaultState();
      const unique=(value,allowed)=>Array.isArray(value)?[...new Set(value.filter(x=>allowed.includes(x)))]:[];
      return {
        version:1, day:Math.min(7,Math.max(1,Number.isInteger(saved.day)?saved.day:1)),
        credits:Math.min(9999,Math.max(0,Number.isInteger(saved.credits)?saved.credits:0)),
        received:unique(saved.received,PAPERS.map(x=>x.id)),
        answers:unique(saved.answers,[0,1,2]),
        bookIds:unique(saved.bookIds,BOOKS.map(x=>x.id)),
        planted:unique(saved.planted,PLANTS.map(x=>x.id)),
        invited:unique(saved.invited,NEIGHBORS.map(x=>x.id)),
        bench:['tree','square'].includes(saved.bench)?saved.bench:'',
        final:saved.final===true
      };
    } catch { return defaultState(); }
  }
  let data=load();
  const $=id=>document.getElementById(id);
  const el={panel:$('storyPanel'),title:$('storyTitle'),text:$('storyText'),kicker:$('storyKicker'),
    sub:$('storySub'),actions:$('storyActions'),progress:$('storyProgress'),track:$('chapterTrack'),
    counter:$('storyCounter'),funds:$('storyFunds'),summary:$('storySummary'),stage1:$('stage1Wrap'),
    rightChapter:document.querySelector('.chapter-number'),rightTitle:document.querySelector('.rightbar h2'),
    rightText:document.querySelector('.rightbar>p'),hero:document.querySelector('.panel h1'),lede:document.querySelector('.lede')
  };
  if (!el.panel || !el.stage1) throw Error('Эко-Ферма: отсутствует интерфейс главы');
  function save() {
    try { localStorage.setItem(KEY,JSON.stringify(data)); }catch {}
  }
  function ready(day=data.day){
    return day===1? intro.sorted.size===6:
      day===2?data.received.length===PAPERS.length:
      day===3?data.answers.length===CASES.length:
      day===4?!!data.bench:
      day===5?data.bookIds.length===BOOKS.length:
      day===6?data.planted.length===PLANTS.length:
      data.invited.length===NEIGHBORS.length;
  }
  function count(day=data.day){
    if(day===1)return intro.sorted.size;
    if(day===2)return data.received.length;
    if(day===3)return data.answers.length;
    if(day===4)return data.bench?1:0;
    if(day===5)return data.bookIds.length;
    if(day===6)return data.planted.length;
    return data.invited.length;
  }
  const total=day=>[6,3,3,1,2,3,3][day-1];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  function creditsText(){return data.credits+' очков помощи'}
  function actionButton(text,action,id,extra=''){
    return '<button type="button" class="story-action '+extra+'" data-story-action="'+action+'" data-story-id="'+esc(id)+'">'+text+'<span aria-hidden="true">→</span></button>';
  }
  function missionActions(){
    if(data.day===1) return ready()?'<p class="story-success">Всё на своих местах. Первый двор уже изменился.</p>':'<p class="story-help">Выбирай предмет в 3D-дворе или в списке ниже. Все 6 вещей можно разобрать без штрафов.</p>';
    if(data.day===2) return PAPERS.map(x=>{
      const done=data.received.includes(x.id);
      return '<button type="button" class="story-choice '+(done?'is-done':'')+'" data-story-action="paper" data-story-id="'+x.id+'" '+(done?'disabled':'')+'><span class="story-choice-mark">'+(done?'✓':'▤')+'</span><span class="story-choice-label"><strong>'+x.name+'</strong><small>'+x.where+'</small></span><span class="story-choice-end">'+(done?'Готово':'+8')+'</span></button>';
    }).join('');
    if(data.day===3){
      const n=data.answers.length;
      if(n>=CASES.length) return '<p class="story-success">Все решения найдены. Для каждого материала нужен подходящий способ обращения.</p>';
      const q=CASES[n];
      return '<article class="story-question"><span class="story-question-number">СИТУАЦИЯ '+(n+1)+' / 3</span><h3>'+q.title+'</h3><p>'+q.text+'</p><div class="story-answers">'+q.options.map((o,i)=>'<button type="button" data-story-action="answer" data-story-id="'+i+'">'+(i+1)+'. '+esc(o)+'</button>').join('')+'</div></article>';
    }
    if(data.day===4) return data.bench?'<p class="story-success">Скамейка установлена. Её можно увидеть в 3D-дворе.</p>':
      '<p class="story-help">Стоимость улучшения — 16 очков помощи. Сейчас: '+creditsText()+'.</p><div class="story-split">'+actionButton('У клёна','bench','tree')+actionButton('У мастерской','bench','square')+'</div>';
    if(data.day===5) return BOOKS.map(x=>{
      const done=data.bookIds.includes(x.id);
      return '<button type="button" class="story-choice '+(done?'is-done':'')+'" data-story-action="book" data-story-id="'+x.id+'" '+(done?'disabled':'')+'><span class="story-choice-mark">'+(done?'✓':'▣')+'</span><span class="story-choice-label"><strong>'+x.name+'</strong><small>'+(done?'На полке обмена':'Передать соседям')+'</small></span><span class="story-choice-end">'+(done?'Готово':'+7')+'</span></button>';
    }).join('');
    if(data.day===6) return '<p class="story-help">Одно растение стоит 10 очков помощи. Новые растения видны в 3D-дворе.</p>'+PLANTS.map(x=>{
      const done=data.planted.includes(x.id);
      return '<button type="button" class="story-choice '+(done?'is-done':'')+'" data-story-action="plant" data-story-id="'+x.id+'" '+(done?'disabled':'')+'><span class="story-choice-mark">'+(done?'✓':'✳')+'</span><span class="story-choice-label"><strong>'+x.name+'</strong><small>'+(done?'Посажено':'Посадить растение')+'</small></span><span class="story-choice-end">'+(done?'Готово':'−10')+'</span></button>';
    }).join('');
    return NEIGHBORS.map(x=>{
      const done=data.invited.includes(x.id);
      return '<button type="button" class="story-choice '+(done?'is-done':'')+'" data-story-action="invite" data-story-id="'+x.id+'" '+(done?'disabled':'')+'><span class="story-choice-mark">'+(done?'✓':'◌')+'</span><span class="story-choice-label"><strong>'+x.name+'</strong><small>'+x.role+'</small></span><span class="story-choice-end">'+(done?'Придёт':'Пригласить')+'</span></button>';
    }).join('');
  }
  function render(){
    const d=DAYS[data.day-1],done=ready();
    el.panel.hidden=false;
    el.title.textContent=d.title;
    el.text.textContent=d.desc;
    el.sub.textContent=d.sub;
    el.kicker.textContent=d.tag;
    el.counter.textContent=count()+' / '+total(data.day);
    el.progress.style.width=(100*count()/total(data.day))+'%';
    el.funds.textContent=creditsText();
    $('dayTag').textContent='ДЕНЬ '+String(data.day).padStart(2,'0')+' / 07';
    el.stage1.hidden=data.day!==1;
    el.hero.innerHTML='Двор меняется<span class="period">.</span>';
    el.lede.textContent='Семь маленьких историй. Разберись с вещами, помоги соседям и сделай двор местом, в котором хочется остаться.';
    if(el.rightChapter)el.rightChapter.innerHTML=String(data.day).padStart(2,'0')+'<span>/07</span>';
    if(el.rightTitle)el.rightTitle.textContent=d.title;
    if(el.rightText)el.rightText.textContent=d.sub+' '+d.desc;
    el.track.innerHTML=DAYS.map((x,i)=>'<span class="chapter-node '+(i+1===data.day?'current':'')+' '+(i+1<data.day?'finished':'')+'" title="День '+(i+1)+': '+esc(x.title)+'">'+(i+1<data.day?'✓':i+1)+'</span>').join('');
    el.actions.innerHTML=missionActions()+(done&&(data.day<7)?'<button type="button" class="story-next" data-story-action="next" data-story-id="">Следующий день <span aria-hidden="true">→</span></button>':'');
    if(data.day===7&&done){
      el.actions.insertAdjacentHTML('beforeend','<div class="story-finale"><strong>Двор стал общим делом.</strong><p>Шесть находок отсортированы, вещи нашли новое применение, а вокруг появилось больше жизни.</p></div>');
    }
    if(el.summary)el.summary.textContent=data.day===7&&done?'История завершена':'История продолжается';
    syncWorld();
  }
  const physics={};
  const worldProps=new Map();
  const props=[];
  function clickable(root,action){
    root.traverse(o=>{if(o.isMesh){o.userData.storyAction=action;allPickables.push(o)}});
  }
  function paperBundle(x,z,number){
    const g=group(scene,x,.77,z);
    box(g,.94,.16,.72,M('#d4bc94'),0,.19,0);
    for(let i=0;i<5;i++)box(g,.99,.032,.78,i%2?M('#f3ead4'):M('#e2d9bd'),0,.27+i*.055,0);
    box(g,.075,.46,.8,M('#a78968'),0,.36,0);
    box(g,1.04,.46,.07,M('#a78968'),0,.36,0);
    const holder=cylinder(g,.9,.93,.12,M('#d3d6bf'),0,.01,0,12);holder.castShadow=false;
    return g;
  }
  function bookModel(x,z,color='#b98573'){
    const g=group(scene,x,.77,z);
    const wood=M(color);
    box(g,.7,.14,.98,wood,0,.17,0);
    box(g,.62,.17,.85,M('#f4eddf'),.015,.17,0);
    box(g,.67,.11,.98,wood,0,.24,0);
    box(g,.7,.07,.09,M('#d8c7ab'),0,.29,-.12);
    cylinder(g,.68,.7,.1,M('#d1d7c8'),0,.01,0,12);
    return g;
  }
  function shrub(x,z,k){
    const g=group(scene,x,.78,z);
    const sizes=[.72,.62,.83];
    cylinder(g,.12,.16,.57,M('#735f49'),0,.32,0,6);
    sphere(g,sizes[k%3],M(['#5c986b','#82ab7d','#6a9970'][k%3]),0,.94,0,1);
    sphere(g,.46,M('#9ebc80'),-.3,.82,.24,1);
    g.scale.setScalar(.87);
    return g;
  }
  function shelf(x,z){
    const g=group(scene,x,.77,z);
    box(g,2.65,.14,.73,mat.woodLight,0,.4,0);
    box(g,2.65,.14,.73,mat.woodLight,0,1.1,0);
    box(g,2.65,.14,.73,mat.woodLight,0,1.85,0);
    for(const side of [-1.26,1.26])box(g,.15,2.08,.7,mat.wood,side,1.06,0);
    const col=['#a66f57','#64896b','#bd9d72','#799ba2','#a57a8c'];
    for(let i=0;i<13;i++){
      const width=.12+(i%3)*.045, h=.4+(i%4)*.08;
      box(g,width,h,.4,M(col[i%5]),-1.05+i*.17,1.34+h/2,0);
    }
    return g;
  }
  function upgradeSign(x,z) {
    const g=group(scene,x,.77,z);
    box(g,.12,1.4,.12,mat.wood,0,.7,0);
    box(g,1.55,.75,.1,mat.woodLight,0,1.6,0);
    const dark=M('#4c6c54');
    for(let i=0;i<3;i++)box(g,.88,.045,.035,dark,0,1.75-i*.18,.07);
    return g;
  }
  function bunting() {
    const g=group(scene,0,0,0);
    for(let i=0;i<12;i++){
      const x=-2.5+i*.65;
      const pole=group(g,x,.72,2.0);
      const col=M(['#d6a678','#91ae85','#bf8876','#d7bd92'][i%4]);
      const flag=box(pole,.43,.39,.04,col,0,3.2+Math.sin(i/12*Math.PI)*.32,0);
      flag.rotation.z=(i%2?-.13:.13);
    }
    box(g,9,.045,.045,mat.woodLight,1.1,4.1,2.0);
    return g;
  }
  function neighbor(x,z,coat){
    const g=group(scene,x,.79,z);
    cylinder(g,.24,.32,1.03,M(coat),0,.7,0,9);
    sphere(g,.29,M('#d9b28e'),0,1.47,0,1);
    cylinder(g,.33,.33,.18,M('#5b6658'),0,1.72,0,10);
    for(const offset of [-.15,.15])cylinder(g,.08,.09,.4,M('#625a50'),offset,.17,0,8);
    return g;
  }
  const paperVisuals=new Map();
  PAPERS.forEach((p,i)=>{
    const g=paperBundle(...p.position,i);
    clickable(g,'paper:'+p.id);
    paperVisuals.set(p.id,g);
  });
  const bookVisuals=new Map();
  BOOKS.forEach((p,i)=>{
    const g=bookModel(...p.position,i?'#64876d':'#bb8672');
    clickable(g,'book:'+p.id);bookVisuals.set(p.id,g);
  });
  const plantVisuals=new Map();
  PLANTS.forEach((p,i)=>{
    const pgroup=shrub(...p.position,i);
    clickable(pgroup,'plant:'+p.id);plantVisuals.set(p.id,pgroup);
  });
  const benchVisuals=new Map();
  benchVisuals.set('tree',bench(-2.5,7.7,.32));
  benchVisuals.set('square',bench(3.4,6.2,-.3));
  const stationSign=upgradeSign(5.15,-3.8);
  const library=shelf(-4.9,-3.1);
  const party=bunting();
  const neighborVisuals=new Map();
  NEIGHBORS.forEach((p,i)=>{
    const g=createCharacter ? createCharacter(...p.position,i) : neighbor(...p.position,['#b17b60','#617b83','#879766'][i]);
    clickable(g,'invite:'+p.id);neighborVisuals.set(p.id,g);
  });
  function syncWorld(){
    // Props are retained after a chapter; today's interactive objects are shown only in their chapter.
    const d=data.day;
    paperVisuals.forEach((g,id)=>{g.visible=d===2&&!data.received.includes(id)});
    bookVisuals.forEach((g,id)=>{g.visible=d===5&&!data.bookIds.includes(id)});
    plantVisuals.forEach((g,id)=>{g.visible=data.planted.includes(id)});
    benchVisuals.forEach((g,id)=>{g.visible=data.bench===id});
    stationSign.visible=d>=4;
    library.visible=d>=6;
    party.visible=d===7&&data.invited.length===3;
    neighborVisuals.forEach((g,id)=>{
      g.visible=d===7;
      const i=NEIGHBORS.findIndex(p=>p.id===id);
      const p=NEIGHBORS[i];
      const invited=data.invited.includes(id);
      const position=invited?[[.4,2.1],[1.8,2.7],[3.1,2.1]][i]:p.position;
      if(g.userData.destination) g.userData.destination.set(position[0],.79,position[1]);
      else g.position.set(position[0],.79,position[1]);
      g.userData.isInvited=invited;
    });
    setChapter?.(d);
  }
  function award(amount) {
    data.credits+=amount;
  }
  function handle(action,id) {
    if(action==='next') return nextDay();
    if(action==='paper'&&data.day===2){
      const p=PAPERS.find(x=>x.id===id);
      if(!p||data.received.includes(id))return;
      data.received.push(id);award(8);
      sound?.('paper');
      showNote('БУМАГА ГОТОВА',p.tip);
      announce('Пачка собрана. +8 очков помощи.');
    } else if(action==='answer'&&data.day===3) {
      const q=CASES[data.answers.length];
      if(!q)return;
      if(Number(id)!==q.correct){sound?.('error');showNote('ПОДУМАЙ ЕЩЁ','Подсказка: '+q.explanation);return;}
      data.answers.push(data.answers.length);award(6);sound?.('correct');
      showNote('ВЕРНО',q.explanation);
      announce('Ситуация решена. +6 очков помощи.');
    } else if(action==='bench'&&data.day===4&&!data.bench) {
      if(!['tree','square'].includes(id))return;
      if(data.credits<16){announce('Для скамейки нужно 16 очков помощи.');return}
      data.bench=id;data.credits-=16;sound?.('build');
      showNote('НОВОЕ МЕСТО','У двора появилось место, где можно отдохнуть. Скамейка останется на выбранном участке.');
    } else if(action==='book'&&data.day===5) {
      const p=BOOKS.find(x=>x.id===id);
      if(!p||data.bookIds.includes(id))return;
      data.bookIds.push(id);award(7);sound?.('paper');
      showNote('КНИГА ПОЙДЁТ ДАЛЬШЕ',p.detail);
    } else if(action==='plant'&&data.day===6) {
      const p=PLANTS.find(x=>x.id===id);
      if(!p||data.planted.includes(id))return;
      if(data.credits<10){announce('Для растения нужно 10 очков помощи.');return}
      data.planted.push(id);data.credits-=10;sound?.('plant');
      showNote('ЗЕЛЕНИ БОЛЬШЕ','Растение останется во дворе. Для настоящей посадки важно подобрать вид под место, почву и климат.');
    } else if(action==='invite'&&data.day===7) {
      const p=NEIGHBORS.find(x=>x.id===id);
      if(!p||data.invited.includes(id))return;
      data.invited.push(id);award(5);sound?.('build');
      if(data.invited.length===3){
        data.final=true;sound?.('finish');
        showNote('СОСЕДСКИЙ ДЕНЬ','Все трое придут на встречу. Двор не стал идеальным, но теперь здесь есть место для людей и полезных привычек.');
      } else showNote('ГОСТЬ ПРИГЛАШЁН',p.name+' сможет увидеть, что нового появилось во дворе.');
    } else return;
    save();render();
  }
  function nextDay() {
    if(!ready()||data.day===7)return;
    data.day++;
    sound?.('chapter');
    save();render();
    announce('День '+data.day+': '+DAYS[data.day-1].title);
    el.panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }
  function interact(key) {
    const [action,id]=String(key||'').split(':');
    handle(action,id);
  }
  el.panel.addEventListener('click',e=>{
    const button=e.target.closest('button[data-story-action]');
    if(!button||button.disabled)return;
    handle(button.dataset.storyAction,button.dataset.storyId);
  });
  function onFirstDayComplete(){
    save();render();
    announce('Первый день пройден. Открой следующий, когда будешь готов.');
  }
  function reset(){
    data=defaultState();
    save();render();
  }
  render();save();
  return {render,onFirstDayComplete,reset,interact,load:()=>structuredClone(data),ready:()=>ready()};
}
