import * as THREE from 'three';
import { createStory } from './story.js';
import { createPolish } from './polish.js?v=2';
import { createArtWorld } from './art-world.js';

/**
 * Эко-Ферма 3D — первый игровой фрагмент.
 * Все модели сцены построены вручную из геометрии Three.js.
 * Без генеративных картинок, шаблонных 3D-моделей и покупки ассетов.
 */

const STORAGE_KEY = new URLSearchParams(window.location.search).has('qa') ? 'ecoFarm3D.stage1.qa' : 'ecoFarm3D.stage1.v1';
const items = [
  {id:'newspaper',name:'Старая газета',short:'ГА',type:'paper',paper:true,
   lesson:'Чистые и сухие газеты можно сдавать вместе с макулатурой. Из полученного сырья делают новую бумагу и картон.',
   notThis:'Газета — бумажное изделие. Попробуй найти сбор для бумаги.'},
  {id:'box',name:'Картонная коробка',short:'КР',type:'paper',paper:true,
   lesson:'Сухой и чистый картон принимают как макулатуру. Коробку лучше сложить — так она займёт меньше места.',
   notThis:'Чистый картон можно отправить в бумажный сбор.'},
  {id:'bottle',name:'ПЭТ-бутылка',short:'ПЭ',type:'plastic',paper:false,
   lesson:'На такой бутылке обычно указан код PET (1). Перед сдачей её стоит опустошить и проверить правила местного пункта.',
   notThis:'Посмотри маркировку бутылки: PET — это пластик.'},
  {id:'jar',name:'Стеклянная банка',short:'СТ',type:'glass',paper:false,
   lesson:'Стеклянную банку можно использовать повторно или сдать в сбор стекла. Требования к крышкам зависят от пункта.',
   notThis:'Банка из стекла. Её место — в сборе для стекла.'},
  {id:'can',name:'Металлическая банка',short:'МТ',type:'metal',paper:false,
   lesson:'Чистую металлическую банку можно сдавать в подходящий сбор металла. Где-то металл собирают вместе с другой упаковкой — уточняй местные правила.',
   notThis:'Это металлическая упаковка. Ищи категорию металла.'},
  {id:'battery',name:'Батарейка',short:'БТ',type:'special',paper:false,
   lesson:'Батарейки не стоит выбрасывать в обычный мусор и упаковочные контейнеры. Их собирают отдельно в специальных пунктах.',
   notThis:'Батарейка требует отдельного сбора, не отправляй её с обычной упаковкой.'}
];
const binSpecs = [
  {id:'paper',label:'БУМАГА',color:0xb99f6e,x:-1.9},
  {id:'glass',label:'СТЕКЛО',color:0x638f75,x:0.15},
  {id:'plastic',label:'ПЛАСТИК',color:0x728da6,x:2.2},
  {id:'metal',label:'МЕТАЛЛ',color:0x969b99,x:4.25},
  {id:'special',label:'СПЕЦ.',color:0xc58a6c,x:6.3}
];
const locations = {
  newspaper:[-8.6, 3.6],box:[-5.7, 5.7],bottle:[-2.9, 4.8],
  jar:[1.5, 5.8],can:[5, 4.8],battery:[8.1, 2.9]
};
const els = {};
for(const id of ['renderHost','loading','objectList','binList','progress','progressFill','missionCount','countSorted','countPaper','toast','learningNote','noteText','noteEyebrow','noteNext','closeNote','factText','complete','explore','again','restart','dayTag','cameraLeft','cameraRight','cameraReset','sunLabel','sceneBinBar','sceneBinScroll','selectedHint','sceneBinStatus']) {
  els[id] = document.getElementById(id);
}
const persisted = (()=>{try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');return value && typeof value==='object'?value:{}}catch{return {}}})();
const validIDs = new Set(items.map(it=>it.id));
const state = {
  startedAt: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(persisted.startedAt||'')?persisted.startedAt:localDate(),
  sorted: new Set((Array.isArray(persisted.sorted)?persisted.sorted:[]).filter(id=>validIDs.has(id))),
  selected: null,
  sorting: false,
  hasCompleted: !!persisted.hasCompleted
};
let story = null;
let polish = null;
let activeChapter = 1;
function localDate(date=new Date()){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')}
function dayNumber(){
  const a=new Date(state.startedAt+'T12:00:00');
  const today=new Date(localDate()+'T12:00:00');
  return Math.max(1,Math.round((today.getTime()-a.getTime())/864e5)+1);
}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({startedAt:state.startedAt,sorted:[...state.sorted],hasCompleted:state.hasCompleted}))}catch{}}
function announce(message){
  els.toast.textContent=message;
  els.toast.hidden=false;
  clearTimeout(announce.timer);
  announce.timer=setTimeout(()=>{els.toast.hidden=true},2700);
}
function showNote(title,message){
  els.noteEyebrow.textContent=title;
  els.noteText.textContent=message;
  els.learningNote.hidden=false;
}
function hideNote(){els.learningNote.hidden=true}
els.closeNote.addEventListener('click',hideNote);
els.noteNext.addEventListener('click',hideNote);

function itemIcon(id){
  // Original crisp vector icons; accessible name remains in the button text.
  const drawings={
    newspaper:'<rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M7.5 7.5h5v5h-5zM15 7.5h2M15 10h2M7.5 15.5H17M7.5 18H17"/>',
    box:'<path d="M12 2.5 3 7.5v9l9 5 9-5v-9l-9-5Z"/><path d="m3 7.5 9 5 9-5M12 12.5v9M7.5 5l9 5"/>',
    bottle:'<path d="M10 2h4v3h-4zM9 5.5h6v2.5c0 2 3 3.5 3 6v6.5c0 1-.8 1.5-1.5 1.5h-9C6.8 22 6 21.5 6 20.5V14c0-2.5 3-4 3-6V5.5Z"/><path d="M6 14h12M6 18h12"/>',
    jar:'<path d="M5 4h14v3H5zM7 7h10c1 2 2 3.5 2 6v6.5A2.5 2.5 0 0 1 16.5 22h-9A2.5 2.5 0 0 1 5 19.5V13c0-2.5 1-4 2-6Z"/><path d="M5 15h14"/>',
    can:'<ellipse cx="12" cy="4.5" rx="6.5" ry="2.2"/><path d="M5.5 4.5v15c0 1.5 3 2.5 6.5 2.5s6.5-1 6.5-2.5v-15M5.5 9.5c1.8 2.4 11.2 2.4 13 0M8 16h8"/>',
    battery:'<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M10 2h4v3M12 9v7M8.5 12.5h7"/>'
  };
  return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(drawings[id]||drawings.box)+'</svg>';
}
function renderInventory(){
  els.objectList.replaceChildren();
  items.forEach((item)=>{
    const btn=document.createElement('button');
    btn.type='button';btn.className='object-item';
    const done=state.sorted.has(item.id);
    if(state.selected===item.id)btn.classList.add('selected');
    if(done)btn.classList.add('done');
    btn.disabled=done;
    btn.setAttribute('aria-pressed', String(state.selected===item.id));
    btn.innerHTML='<span class="object-icon" aria-hidden="true">'+(done?'✓':itemIcon(item.id))+'</span><span class="object-label">'+item.name+'</span><span class="object-arrow" aria-hidden="true">'+(done?'✓':'→')+'</span>';
    btn.addEventListener('click',()=>selectItem(item.id));
    els.objectList.appendChild(btn);
  });
}
function refreshHUD(){
  const count=state.sorted.size;
  els.progressFill.style.width=Math.round(count/items.length*100)+'%';
  els.progress.setAttribute('aria-valuenow',String(count));
  els.missionCount.textContent=count+' / '+items.length;
  els.countSorted.textContent=count+' '+(count===1?'вещь':count>=2&&count<=4?'вещи':'вещей');
  const countPaper=items.filter(x=>x.paper&&state.sorted.has(x.id)).length;
  els.countPaper.textContent=countPaper+' '+(countPaper===1?'бумажный предмет':countPaper>=2&&countPaper<=4?'бумажных предмета':'бумажных предметов');
  els.dayTag.textContent='ДЕНЬ '+String(activeChapter).padStart(2,'0')+' / 07';
  const inactive=state.sorting||count===items.length||activeChapter!==1;
  els.binList.querySelectorAll('button').forEach(btn=>btn.disabled=inactive);
  if(els.sceneBinBar){
    els.sceneBinBar.hidden=activeChapter!==1||count===items.length;
    els.sceneBinBar.querySelectorAll('button').forEach(btn=>btn.disabled=inactive);
  }
  const selected=items.find(x=>x.id===state.selected);
  if(els.sceneBinStatus){
    els.sceneBinStatus.textContent=selected
      ?selected.name+' · куда отнести?':'Сначала выбери предмет';
  }
  if(els.selectedHint){
    els.selectedHint.classList.toggle('has-selection',!!selected);
    els.selectedHint.textContent=selected
      ?'Выбрано: '+selected.name+'. Теперь нажми подходящий контейнер.'
      :count===items.length?'Все шесть находок разобраны.':'Сначала выбери предмет выше или в 3D-дворе.';
  }
  renderInventory();
}
const scene=new THREE.Scene();
scene.background=new THREE.Color('#dce7da');
scene.fog=new THREE.Fog('#dce7da',43,88);
const camera=new THREE.OrthographicCamera(-18,18,17,-17,.1,120);
let azimuth=Math.PI/4.6;
let cameraZoom=1;
const cameraTarget=new THREE.Vector3(0,0.2,.2);
const cameraRadius=36;
function setCamera() {
  camera.position.set(Math.sin(azimuth)*cameraRadius,25,Math.cos(azimuth)*cameraRadius);
  camera.lookAt(cameraTarget);
  camera.zoom=cameraZoom;
  camera.updateProjectionMatrix();
}
const renderer = (()=>{
  try {
    const r=new THREE.WebGLRenderer({alpha:false,antialias:true,powerPreference:'default'});
    r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    r.shadowMap.enabled=true;
    r.shadowMap.type=THREE.PCFSoftShadowMap;
    r.outputColorSpace=THREE.SRGBColorSpace;
    r.toneMapping=THREE.ACESFilmicToneMapping;
    r.toneMappingExposure=1.22;
    r.domElement.setAttribute('tabindex','0');
    r.domElement.setAttribute('role','img');
    r.domElement.setAttribute('aria-label','Трёхмерный двор. Выбирай предметы через список слева или нажатием на модели в сцене.');
    els.renderHost.appendChild(r.domElement);
    return r;
  }catch(err){
    els.loading.textContent='Ваш браузер не поддерживает WebGL. Список предметов и сортировка ниже по странице продолжают работать.';
    document.body.classList.add('no-webgl');
    return null;
  }
})();
const hemisphere=new THREE.HemisphereLight(0xf8f6e7,0x718d74,2.3);scene.add(hemisphere);
const sun=new THREE.DirectionalLight(0xffedcd,3.2);
sun.position.set(-13,25,12);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-27;sun.shadow.camera.right=27;sun.shadow.camera.top=27;sun.shadow.camera.bottom=-27;
sun.shadow.camera.near=.5;sun.shadow.camera.far=85;sun.shadow.bias=-.00035;sun.shadow.normalBias=.045;
scene.add(sun);
const fill=new THREE.DirectionalLight(0xc9e3d7,1.1);fill.position.set(12,11,-8);scene.add(fill);

const M=(hex,roughness=1,metalness=0)=>new THREE.MeshStandardMaterial({color:hex,roughness,metalness});
const mat={
  soil:M('#66886a'), grass:M('#93ad86'),grassLight:M('#a9c59a'),grassDark:M('#6b9b76'),
  path:M('#e8d9b8'),pathShade:M('#d5c5a7'),edge:M('#738b6c'),
  wood:M('#8a6349'),woodLight:M('#b9875d'),woodDark:M('#644c3b'),
  wall:M('#f5e4bd'),wallSide:M('#e1cead'),terracotta:M('#b6745a'),
  cream:M('#f9efdb'),white:M('#f7f3e7'),dark:M('#2d463b'),
  charcoal:M('#333e3b'),roof:M('#a9654b'),
  window:new THREE.MeshStandardMaterial({color:0x8db9b3,roughness:.1,metalness:.15,transparent:true,opacity:.94}),
  stone:M('#b9b49d'),purple:M('#987ba2'),flower:M('#e6bb96'),sage:M('#759e7b')
};
const allPickables=[],itemGroups=new Map(),binGroups=new Map();
const sways=[],animals=[];
function addMesh(parent,geometry,material,x=0,y=0,z=0,cast=true){
  const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=true;parent.add(o);return o;
}
function box(parent,w,h,d,material,x=0,y=0,z=0){
  return addMesh(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z);
}
function cylinder(parent,rTop,rBottom,h,material,x=0,y=0,z=0,n=10){
  return addMesh(parent,new THREE.CylinderGeometry(rTop,rBottom,h,n),material,x,y,z);
}
function sphere(parent,r,material,x=0,y=0,z=0,segments=10){
  return addMesh(parent,new THREE.IcosahedronGeometry(r,1),material,x,y,z);
}
function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
function markClickable(root,key,value){
  root.traverse(node=>{if(node.isMesh){node.userData[key]=value;allPickables.push(node)}});
}
// Every container is identified by geometry, not tiny rasterized lettering.
// Material names live in accessible, high-resolution HTML buttons.
function binSymbol(parent,type){
  const symbol=group(parent,0,1.05,.744);
  symbol.name='material-pictogram:'+type;
  const ink=new THREE.MeshBasicMaterial({color:0x243e31});
  const ivory=new THREE.MeshBasicMaterial({color:0xfffdf3});
  const detail=new THREE.MeshBasicMaterial({color:0x456451});
  if(type==='paper'){
    box(symbol,.43,.52,.034,ink,-.035,0,0);
    box(symbol,.43,.52,.034,ink,.05,-.045,.015);
    for(let i=0;i<3;i++)box(symbol,.24,.026,.013,ivory,.04,.105-i*.105,.043);
  }else if(type==='glass'){
    cylinder(symbol,.075,.075,.15,ink,0,.19,.025,12);
    cylinder(symbol,.145,.118,.32,ink,0,-.055,.025,12);
    cylinder(symbol,.105,.105,.035,ivory,0,.29,.025,12);
    box(symbol,.075,.075,.035,ivory,0,-.02,.166);
  }else if(type==='plastic'){
    cylinder(symbol,.09,.09,.12,ink,0,.207,.025,10);
    cylinder(symbol,.15,.145,.40,ink,0,-.07,.025,10);
    cylinder(symbol,.11,.11,.055,detail,0,-.075,.17,10);
    cylinder(symbol,.093,.093,.045,ivory,0,.295,.025,10);
  }else if(type==='metal'){
    cylinder(symbol,.177,.177,.46,ink,0,0,.025,12);
    cylinder(symbol,.182,.182,.052,detail,0,.24,.025,12);
    cylinder(symbol,.182,.182,.052,detail,0,-.24,.025,12);
    box(symbol,.20,.05,.022,ivory,0,0,.207);
  }else if(type==='special'){
    box(symbol,.29,.48,.09,ink,0,-.025,.03);
    box(symbol,.115,.065,.09,ink,0,.255,.03);
    box(symbol,.17,.033,.014,ivory,0,-.025,.083);
    box(symbol,.033,.17,.014,ivory,0,-.025,.084);
  }
  return symbol;
}
// A real solid diorama, not an image or a CSS mockup.
function roundedPlatform(w,d,r=.7) {
  const s=new THREE.Shape();
  s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);
  s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);
  s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);
  s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
  const g=new THREE.ExtrudeGeometry(s,{depth:.85,bevelEnabled:true,bevelThickness:.12,bevelSize:.12,bevelSegments:2,curveSegments:5});
  g.rotateX(-Math.PI/2);
  return g;
}
// Lower the extruded base below its grass top; previously it occluded paths and ground detailing.
const plinth=addMesh(scene,roundedPlatform(24.4,18,.8),mat.soil,0,-.28,0);
const bed=box(scene,23.6,.18,17.2,mat.grass,0,.53,0);
const ground=box(scene,200,.09,200,M('#d7e4d5'),0,-.65,0,false);ground.receiveShadow=true;
// Pathways are actual meshes with variation, not a printed background.
const path1=box(scene,3,.12,16,mat.path,-4.7,.67,1.1);
const path2=box(scene,15.2,.12,3.4,mat.path,1.8,.68,3.1);
const path3=box(scene,9,.12,2.6,mat.path,1.4,.68,-3.3);
box(scene,14.9,.04,.16,mat.pathShade,1.8,.74,4.75);
box(scene,14.9,.04,.16,mat.pathShade,1.8,.74,1.38);
for (let i=0;i<12;i++){
  let x=-3.6+i*1.12;
  box(scene,.022,.014,3.36,mat.pathShade,x,.77,3.1).rotation.y=.06;
}
for(let i=0;i<7;i++){box(scene,2.55,.021,.045,mat.pathShade,-4.7,.75,-5.1+i*2.0)}
// Specks give the ground a deliberate, tactile material.
function mulberry32(seed){return()=>{let t=seed+=0x6d2b79f5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
const rand=mulberry32(6914);
for(let i=0;i<150;i++){
  const x=(rand()-.5)*22.8,z=(rand()-.5)*16.2;
  if(Math.abs(z-3.1)<2.1||Math.abs(x+4.7)<1.8||z< -4.3)continue;
  const clump=group(scene,x,.78,z);
  const blade=cylinder(clump,.04,.055,.14, i%3?mat.grassLight:mat.grassDark,0,0,0,5);blade.rotation.z=(rand()-.5)*.7;
}
// Garden fencing — drawn as repeated geometry to avoid an asset dependency.
function fence(startX,endX,z){
  for(let x=startX;x<endX;x+=.95){
    box(scene,.095,.55,.095,mat.woodLight,x,.94,z);
  }
  box(scene,endX-startX+.3,.08,.1,mat.woodLight,(startX+endX)/2,1.09,z);
  box(scene,endX-startX+.3,.07,.1,mat.woodLight,(startX+endX)/2,.83,z);
}
fence(-11,-8.6,-8.2);fence(-1.5,10.9,-8.2);
fence(-11,-9.8,8.0);fence(8.8,10.9,8.0);

// Branching canopies in layered botanical greens, not uniform round blobs.
const leafMaterials=[
  M('#456c54',.92),M('#587d5f',.96),M('#709174',.93),
  M('#8da582',.96),M('#607e67',.94),M('#99ae85',.96)
];
function createTree(x,z,scale=1,index=0){
  const trunk=group(scene,x,.76,z);
  trunk.name='tree:'+index+':'+x;
  cylinder(trunk,.155,.27,2.65,mat.wood,0,1.26,0,9);
  const root=group(trunk,0,1.75,0);
  const count=7+(index%3);
  for(let i=0;i<count;i++){
    const angle=i*Math.PI*2/count+(index*.47);
    const spread=.68+.20*(i%3);
    const dx=Math.cos(angle)*spread,dz=Math.sin(angle)*spread;
    const canopyY=.68+(i%3)*.23;
    const branch=cylinder(root,.055,.115,1.35,mat.wood,dx*.43,.04,dz*.43,6);
    branch.rotation.z=-Math.cos(angle)*.58;
    branch.rotation.x=Math.sin(angle)*.58;
    const cluster=sphere(root,.66+(i%4)*.065,
      leafMaterials[(index+i)%leafMaterials.length],dx,canopyY,dz);
    cluster.scale.set(1.03,.73,1.00);
    if(i%2===0){
      const newGrowth=sphere(root,.39,leafMaterials[(index+i+3)%leafMaterials.length],
        dx*.78,canopyY+.38,dz*.78);
      newGrowth.scale.set(.85,.68,1.04);
    }
  }
  const crown=sphere(root,.77,leafMaterials[(index+2)%leafMaterials.length],0,1.12,0);
  crown.scale.set(.93,.76,.96);
  root.rotation.z=(rand()-.5)*.045;
  trunk.scale.setScalar(scale);
  sways.push({obj:root,base:root.rotation.z,phase:rand()*7,amp:.008+rand()*.014});
  const shadow=addMesh(scene,new THREE.CircleGeometry(1.16,24),
    new THREE.MeshBasicMaterial({color:0x35513d,transparent:true,opacity:.09,depthWrite:false}),
    x,.742,z,false);
  shadow.rotation.x=-Math.PI/2;shadow.scale.set(1.4,.9,1);
}
createTree(-10,0.8,1.2,1);createTree(-10.6,-5.5,.92,2);
createTree(-7.7,-2.1,.88,3);createTree(10.1,-6.2,1.18,2);
createTree(10,1.1,.86,4);createTree(9.5,6.1,.94,0);
createTree(-10.6,6.2,.84,1);

// The house is built with a gable roof, windows, door, steps and roof detail.
function roofGeometry(w,d,h) {
  const a=w/2,b=d/2,y=0;
  const vertices=new Float32Array([
    -a,y,-b, a,y,-b,0,h,-b,
    -a,y,b, a,y,b,0,h,b
  ]);
  const indices=[
    0,2,1,3,4,5,
    0,3,5, 0,5,2,
    1,2,5, 1,5,4,
    3,0,1, 3,1,4
  ];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
function house(x,z){
  const h=group(scene,x,.76,z);
  box(h,5.05,3.25,3.65,mat.wall,0,1.6,0);
  box(h,5.14,.21,3.76,mat.wallSide,0,.21,0);
  addMesh(h,roofGeometry(5.95,4.15,2.0),mat.roof,0,3.17,0);
  // A gable triangle behind the roof.
  box(h,1.03,1.88,.045,mat.woodDark,-1.19,1.44,1.856);
  box(h,1.08,.16,.47,mat.woodLight,-1.19,.6,2.05);
  const doorKnob=sphere(h,.063,M('#e1be76'),-.78,1.4,1.893,8);
  doorKnob.castShadow=false;
  for (const xx of [1.1,-2.05]){
    box(h,.91,1.05,.08,mat.woodLight,xx,1.9,1.85);
    box(h,.78,.91,.085,mat.window,xx,1.9,1.902);
    box(h,.07,1.01,.095,mat.cream,xx,1.9,1.957);
    box(h,.83,.07,.095,mat.cream,xx,1.9,1.957);
    box(h,1.05,.14,.25,mat.woodLight,xx,1.33,1.88);
  }
  box(h,3.6,.18,1.12,mat.pathShade,.1,.04,2.22);
  // terracotta facade stripe
  box(h,5.13,.09,3.74,mat.terracotta,0,2.94,0);
}
house(-7.45,-5.8);

// A small repair workshop, authored as a shape hierarchy.
function workshop(x,z) {
  const h=group(scene,x,.74,z);
  box(h,4.3,2.3,3.2,M('#d7d3bd'),0,1.16,0);
  box(h,4.7,.36,3.5,M('#c99f73'),0,2.45,0);
  for(let n=-1;n<=1;n++)box(h,.92,1.45,.04,mat.window,n*1.33,.94,1.63);
  box(h,4.35,.17,.95,mat.terracotta,0,2.05,2.07);
  // simple striped awning, angled toward plaza
  for(let i=-4;i<=4;i++)box(h,.47,.055,1.08,i%2?mat.cream:mat.terracotta,i*.49,2.12,2.13).rotation.x=-.08;
  // A simple timber facade band replaces an unreadable canvas-texture sign.
  box(h,2.8,.17,.12,mat.woodLight,0,2.67,1.79);
}
workshop(6.9,-5.6);
// Park bench and planters
function bench(x,z,rot=0){
  const b=group(scene,x,.78,z);b.rotation.y=rot;
  box(b,2.12,.15,.75,mat.woodLight,0,.66,0);
  box(b,2.12,.95,.15,mat.wood,.0,1.05,-.38);
  for(let a of [-.82,.82]){
    box(b,.11,.72,.11,mat.charcoal,a,.32,-.24);
    box(b,.11,.72,.11,mat.charcoal,a,.32,.26);
  }
  return b;
}
bench(-1.05,-5.8,.18);
bench(-1.1,7.3,-.13);
function flowerPot(x,z,palette=0) {
 const p=group(scene,x,.72,z);
 cylinder(p,.55,.45,.38,M('#bc9375'),0,.15,0,10);
 cylinder(p,.5,.49,.07,M('#9f7559'),0,.37,0,10);
 for(let i=0;i<5;i++){
   const a=i*Math.PI*2/5;
   const stem=cylinder(p,.018,.022,.5,mat.grassDark,Math.cos(a)*.26,.62,Math.sin(a)*.25,6);
   sphere(p,.14,[mat.flower,mat.purple,M('#e0d5a2')][(i+palette)%3],Math.cos(a)*.28,.86+rand()*.06,Math.sin(a)*.26,6);
 }
}
for(let i=0;i<5;i++)flowerPot(-2.2+i*.7,-6.6,i);

// Container bank stands on a shared timber platform.
const pickup=group(scene,2.25,.76,-2.25);
box(pickup,11.1,.14,2.6,mat.pathShade,0,-.05,0);
function createBin(spec){
  const b=group(scene,spec.x,.83,-2.15);
  const plastic=new THREE.MeshPhysicalMaterial({color:spec.color,roughness:.44,metalness:.035,clearcoat:.15,clearcoatRoughness:.5});
  const main=addMesh(b,new THREE.BoxGeometry(1.42,1.57,1.24),plastic,0,.78,0);
  main.castShadow=true;
  box(b,1.51,.18,1.35,M(spec.color,.5),0,1.61,0);
  box(b,1.36,.045,1.19,M('#344b3e',.88),0,1.49,0);
  box(b,1.3,.04,.035,M('#d8ddd1',.75),0,1.55,.68);
  for(const side of [-1,1]){
    cylinder(b,.047,.047,.24,mat.charcoal,side*.49,1.60,-.60,10).rotation.x=Math.PI/2;
    box(b,.075,1.20,.06,M(spec.color,.8),side*.61,.79,.645);
  }
  box(b,.93,.1,.12,mat.charcoal,0,1.67,.56);
  box(b,1.24,.62,.055,mat.cream,0,1.04,.652);
  // Flat white enamel panel: the distinct, high-contrast 3D emblem is a mesh.
  box(b,1.24,.68,.06,new THREE.MeshBasicMaterial({color:0xfffdf3}),0,1.05,.678);
  binSymbol(b,spec.id);
  for(const side of [-1,1]){
    cylinder(b,.145,.145,.11,mat.charcoal,side*.49,.12,.45,12).rotation.z=Math.PI/2;
    cylinder(b,.052,.052,.12,M('#c7c9c1',.55,.28),side*.49,.12,.515,12).rotation.z=Math.PI/2;
  }
  const h=box(b,.34,.14,.14,M(spec.color),0,1.52,-.69);
  h.rotation.x=.25;
  markClickable(b,'binId',spec.id);
  binGroups.set(spec.id,b);
}
binSpecs.forEach(createBin);
// The recycling point relies on the crisp DOM category names, not a blurred banner.
box(scene,4.6,.19,.13,mat.woodLight,2.15,2.85,-3.13);
box(scene,4.7,.13,.1,mat.woodLight,2.15,2.47,-3.2);
for(let s of [.05,4.32])box(scene,.12,2.6,.12,mat.woodLight,s,.95,-3.22);
// Details: lamp, flowerbeds and freestanding sign
function lamp(x,z){
  const l=group(scene,x,.8,z);
  cylinder(l,.075,.1,3.5,mat.woodDark,0,1.75,0,8);
  cylinder(l,.55,.25,.47,M('#f2deab'),0,3.6,0,8);
  cylinder(l,.07,.07,.35,mat.woodDark,0,3.84,0,8);
}
lamp(-7.6,3.3);lamp(9.7,-.7);
const sign=group(scene,-1.4,.71,-7.1);
box(sign,.14,1.6,.14,mat.wood,0,.8,0);
box(sign,2.7,1.1,.12,mat.woodLight,0,1.72,0);
// Quiet timber information board; no unreadable 3D text texture.
box(sign,2.42,.08,.045,mat.wood,0,1.93,.10);
box(sign,2.42,.08,.045,mat.wood,0,1.55,.10);

// Object-shaped 3D props. Each one remains a selectable group in the scene.
function makeNewspaper(g) {
  const m=box(g,1.1,.085,.85,mat.white,0,.13,0);m.rotation.y=-.19;
  for(let i=0;i<4;i++)box(g,.63,.012,.035,mat.charcoal,-.08,.184,-.23+i*.11).rotation.y=-.19;
  box(g,.22,.013,.21,mat.terracotta,.32,.186,.16);
}
function makeBox(g) {
  box(g,1.0,.72,.85,M('#c79c68'),0,.41,0);
  box(g,1.02,.04,.87,M('#ddba87'),0,.78,0);
  box(g,.12,.048,.88,M('#e8d4b3'),.0,.81,.0);
  for(let s of [-1,1])box(g,.48,.045,.36,M('#d1ae7a'),s*.255,.84,-.32);
}
function makeBottle(g) {
  const glass=new THREE.MeshPhysicalMaterial({color:0x9cc8c6,roughness:.2,metalness:0,transparent:true,opacity:.83,depthWrite:true});
  cylinder(g,.27,.31,.97,glass,0,.56,0,12);
  cylinder(g,.17,.22,.27,glass,0,1.13,0,12);
  cylinder(g,.2,.19,.14,M('#417f8c'),0,1.34,0,12);
  cylinder(g,.275,.276,.17,M('#ebecdc'),0,.67,0,12);
}
function makeJar(g) {
  const glass=new THREE.MeshPhysicalMaterial({color:0xbdd5ca,roughness:.12,metalness:0,transparent:true,opacity:.76,depthWrite:true});
  cylinder(g,.38,.37,.92,glass,0,.5,0,12);
  cylinder(g,.38,.38,.16,M('#bcbabb',.45,.35),0,1.02,0,12);
  cylinder(g,.35,.35,.05,mat.cream,0,.2,0,12);
}
function makeCan(g) {
  cylinder(g,.3,.3,.88,M('#a5a6a0',.42,.28),0,.5,0,12);
  cylinder(g,.32,.32,.055,M('#d2d3c8',.42,.4),0,.96,0,12);
  cylinder(g,.32,.32,.055,M('#d2d3c8',.42,.4),0,.05,0,12);
  cylinder(g,.31,.31,.43,M('#bd795f',.7,.08),0,.5,0,12);
  box(g,.035,.33,.08,mat.cream,.19,.5,.26);
}
function makeBattery(g) {
  cylinder(g,.25,.25,.94,M('#394b45',.35,.28),0,.57,0,12);
  cylinder(g,.25,.25,.18,M('#e5bb7a',.4,.3),0,1.07,0,12);
  cylinder(g,.13,.13,.1,M('#cfba96',.35,.4),0,1.2,0,12);
  cylinder(g,.25,.25,.1,M('#a4a9a4',.6,.35),0,.07,0,12);
  const plus=box(g,.18,.032,.055,mat.white,0,1.26,0);plus.rotation.z=.02;
}
const makers={newspaper:makeNewspaper,box:makeBox,bottle:makeBottle,jar:makeJar,can:makeCan,battery:makeBattery};
items.forEach((item)=>{
  const [x,z]=locations[item.id];
  const g=group(scene,x,.77,z);
  const pedestal=cylinder(g,.83,.86,.12,mat.pathShade,0,-.08,0,16);
  const stripe=cylinder(g,.77,.79,.04,mat.cream,0,.0,0,16);
  pedestal.castShadow=false;stripe.castShadow=false;
  const model=group(g,0,.05,0);
  makers[item.id](model);
  g.rotation.y=(rand()-.5)*.45;
  markClickable(g,'itemId',item.id);
  if(state.sorted.has(item.id)) g.visible=false;
  itemGroups.set(item.id,g);
});
// Restoration appears after the first three objects are sorted.
const restoration=group(scene,0,0,0);
const plazaFlowerPalette=[mat.flower,mat.purple,M('#e8d8a3')];
for(let i=0;i<15;i++){
  const a=i*2.399,r=.19+Math.sqrt(i)*.38;
  const flower=group(restoration,6.7+Math.cos(a)*r,.75,6.3+Math.sin(a)*r);
  cylinder(flower,.021,.026,.28+rand()*.15,mat.grassDark,0,.15,0,5);
  sphere(flower,.13,plazaFlowerPalette[i%3],0,.36,0,6);
}
restoration.visible=state.sorted.size>=3;
// Decorative stone platform for the small restored garden.
const garden=box(scene,4.5,.13,3.1,mat.grassLight,6.85,.71,6.35);garden.visible=state.sorted.size>=3;
const selectionRing=new THREE.Mesh(new THREE.RingGeometry(.78,.89,32),new THREE.MeshBasicMaterial({color:'#e7a86c',side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));
selectionRing.rotation.x=-Math.PI/2;selectionRing.position.y=.83;selectionRing.visible=false;scene.add(selectionRing);

// Interaction works with both scene picking and the HTML object/bin buttons.
function selectItem(id) {
  if((story && story.load().day!==1)||state.sorting||state.sorted.has(id))return;
  state.selected=id;hideNote();
  const g=itemGroups.get(id);
  if(g){selectionRing.position.x=g.position.x;selectionRing.position.z=g.position.z;selectionRing.visible=true}
  els.binList.querySelectorAll('button').forEach(b=>b.classList.remove('is-target'));
  els.sceneBinBar?.querySelectorAll('button').forEach(b=>b.classList.remove('is-target'));
  refreshHUD();
  announce('Выбрано: '+items.find(x=>x.id===id).name+'. Укажи контейнер.');
}
let sortTween=null;
function attemptSort(binId) {
  if(story && story.load().day!==1)return;
  if(!state.selected){announce('Сначала выбери вещь во дворе или в списке.');return}
  if(state.sorting)return;
  const item=items.find(x=>x.id===state.selected);
  if(!item)return;
  if(item.type!==binId){
    polish?.sound('error');
    showNote('ПОПРОБУЙ ЕЩЁ',item.notThis);
    els.factText.textContent='Подсказка: '+item.notThis;
    els.binList.querySelectorAll('button').forEach(x=>x.classList.remove('is-target'));
    const target=els.binList.querySelector('[data-bin="'+item.type+'"]');
    if(target)target.classList.add('is-target');
    const sceneTarget=els.sceneBinBar?.querySelector('[data-bin-scene="'+item.type+'"]');
    if(sceneTarget)sceneTarget.classList.add('is-target');
    return;
  }
  hideNote();
  els.binList.querySelectorAll('button').forEach(x=>x.classList.remove('is-target'));
  els.sceneBinBar?.querySelectorAll('button').forEach(x=>x.classList.remove('is-target'));
  const group=itemGroups.get(item.id);
  const bin=binGroups.get(binId);
  state.sorting=true;
  selectionRing.visible=false;
  const start=group.position.clone();
  const finish=bin.position.clone();finish.y=1.9;
  sortTween={group,start,finish,t:0,id:item.id,lesson:item.lesson};
  refreshHUD();
}
function sortFinished(id,lesson){
  state.sorted.add(id);
  state.selected=null;
  state.sorting=false;
  selectionRing.visible=false;
  if(state.sorted.size>=3){restoration.visible=true;garden.visible=true}
  save();refreshHUD();
  polish?.sound('correct');
  showNote('УДАЧНО ОТСОРТИРОВАНО',lesson);
  els.factText.textContent=lesson;
  announce('Отлично: '+items.find(x=>x.id===id).name+'. Материал отсортирован.');
  if(state.sorted.size===items.length&&!state.hasCompleted){
    state.hasCompleted=true;save();
    if(story)story.onFirstDayComplete();
    else setTimeout(()=>{hideNote();els.complete.hidden=false},1350);
  }else if(story){
    story.render();
  }
}
els.binList.querySelectorAll('[data-bin]').forEach(b=>b.addEventListener('click',()=>attemptSort(b.dataset.bin)));
els.sceneBinBar?.querySelectorAll('[data-bin-scene]').forEach(b=>{
  b.addEventListener('click',()=>attemptSort(b.dataset.binScene));
});
els.restart.addEventListener('click',()=>resetGame());
els.again.addEventListener('click',()=>resetGame());
els.explore.addEventListener('click',()=>{els.complete.hidden=true;hideNote()});
function resetGame(){
  state.sorted.clear();state.selected=null;state.sorting=false;state.hasCompleted=false;sortTween=null;
  els.complete.hidden=true;hideNote();selectionRing.visible=false;
  els.sceneBinBar?.querySelectorAll('button').forEach(b=>b.classList.remove('is-target'));
  els.binList.querySelectorAll('button').forEach(b=>b.classList.remove('is-target'));
  items.forEach(i=>{const g=itemGroups.get(i.id);if(g){g.position.set(...[locations[i.id][0],.77,locations[i.id][1]]);g.scale.setScalar(1);g.visible=true;}});
  restoration.visible=false;garden.visible=false;
  save();refreshHUD();
  if(story)story.reset();
  announce('Двор готов к новой прогулке.');
}
els.cameraLeft.addEventListener('click',()=>{azimuth-=Math.PI/9;setCamera()});
els.cameraRight.addEventListener('click',()=>{azimuth+=Math.PI/9;setCamera()});
els.cameraReset.addEventListener('click',()=>{azimuth=Math.PI/4.6;cameraZoom=1;setCamera()});

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function pickAt(clientX,clientY){
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set(((clientX-rect.left)/rect.width)*2-1,-((clientY-rect.top)/rect.height)*2+1);
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(allPickables,false);
  for(const hit of hits){
    const obj=hit.object;
    let node=obj,visible=true;
    while(node){if(!node.visible){visible=false;break}node=node.parent}
    if(!visible)continue;
    if(obj.userData.storyAction && story){story.interact(obj.userData.storyAction);return}
    if(obj.userData.itemId && !state.sorted.has(obj.userData.itemId)){selectItem(obj.userData.itemId);return}
    if(obj.userData.binId){attemptSort(obj.userData.binId);return}
  }
}
let dragging=false,startPointer=null,dragStartAngle=azimuth;
if(renderer){
  const canvas=renderer.domElement;
  const touches=new Map();
  let pinchStartDistance=0,pinchStartZoom=1,pinching=false;
  const distance=()=>{
    const [a,b]=[...touches.values()];
    return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;
  };
  canvas.addEventListener('pointerdown',(e)=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    canvas.setPointerCapture(e.pointerId);
    if(touches.size>=2){
      pinching=true;dragging=true;startPointer=null;
      pinchStartDistance=Math.max(1,distance());pinchStartZoom=cameraZoom;
    }else{
      dragging=false;startPointer={x:e.clientX,y:e.clientY};dragStartAngle=azimuth;
    }
  });
  canvas.addEventListener('pointermove',(e)=>{
    if(!touches.has(e.pointerId))return;
    touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(touches.size>=2){
      if(!pinching){
        pinching=true;dragging=true;pinchStartDistance=Math.max(1,distance());pinchStartZoom=cameraZoom;
      }
      cameraZoom=THREE.MathUtils.clamp(pinchStartZoom*distance()/pinchStartDistance,.8,1.85);
      setCamera();
      return;
    }
    if(!startPointer)return;
    const dx=e.clientX-startPointer.x,dy=e.clientY-startPointer.y;
    if(Math.hypot(dx,dy)>8)dragging=true;
    if(dragging){azimuth=dragStartAngle-dx*.007;setCamera()}
  });
  canvas.addEventListener('pointerup',(e)=>{
    if(!touches.has(e.pointerId))return;
    const tapped=!pinching&&!dragging&&touches.size===1;
    touches.delete(e.pointerId);
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    if(tapped)pickAt(e.clientX,e.clientY);
    if(touches.size===1){
      const other=[...touches.values()][0];
      startPointer={x:other.x,y:other.y};dragStartAngle=azimuth;
      dragging=true;pinching=false;
    }else if(!touches.size){
      startPointer=null;dragging=false;pinching=false;pinchStartDistance=0;
    }
  });
  canvas.addEventListener('pointercancel',(e)=>{
    touches.delete(e.pointerId);startPointer=null;dragging=false;pinching=false;
  });
  canvas.addEventListener('wheel',(e)=>{
    e.preventDefault();
    cameraZoom=THREE.MathUtils.clamp(cameraZoom*(e.deltaY>0?.94:1.06),.8,1.85);
    setCamera();
  },{passive:false});
  canvas.addEventListener('keydown',(e)=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      e.preventDefault();azimuth+=(e.key==='ArrowLeft'?-1:1)*.12;setCamera();
    }else if(e.key==='+'||e.key==='='){
      e.preventDefault();cameraZoom=Math.min(1.85,cameraZoom*1.12);setCamera();
    }else if(e.key==='-'){
      e.preventDefault();cameraZoom=Math.max(.8,cameraZoom/1.12);setCamera();
    }
  });
}
function resize(){
  if(!renderer)return;
  const w=Math.max(1,els.renderHost.clientWidth),h=Math.max(1,els.renderHost.clientHeight);
  const aspect=w/h;
  const viewWidth=aspect<1.15?(w<650?29.2:31.3):Math.min(38,27+4*aspect);
  const viewHeight=viewWidth/aspect;
  camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;
  camera.zoom=cameraZoom;camera.updateProjectionMatrix();
  polish?.updateResolution();
  renderer.setSize(w,h,false);
}
const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
if(observer)observer.observe(els.renderHost);
window.addEventListener('resize',resize);
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const clock=new THREE.Clock();
let artwork=null;
let visible=true;
document.addEventListener('visibilitychange',()=>{visible=!document.hidden});
function tick(){
  requestAnimationFrame(tick);
  if(!renderer||!visible)return;
  const dt=Math.min(clock.getDelta(),.06);
  const time=clock.elapsedTime;
  if(!reducedMotion){
    for(const s of sways){s.obj.rotation.z=s.base+Math.sin(time*.9+s.phase)*s.amp}
    selectionRing.material.opacity=.6+.25*Math.sin(time*2.3);
  }
  if(sortTween){
    const t=sortTween;
    t.t=reducedMotion?1:Math.min(1,t.t+dt*2.0);
    const eased=t.t*t.t*(3-2*t.t);
    t.group.position.lerpVectors(t.start,t.finish,eased);
    t.group.position.y+=Math.sin(Math.PI*t.t)*.035;
    const scale=1-.83*eased;t.group.scale.setScalar(scale);
    if(t.t>=1){
      t.group.visible=false;
      t.group.scale.setScalar(1);
      const id=t.id,lesson=t.lesson;
      sortTween=null;
      sortFinished(id,lesson);
    }
  }
  polish?.tick(time,dt);
  artwork?.tick(time,dt,polish?.diagnostics().eco);
  renderer.render(scene,camera);
}
if(new URLSearchParams(location.search).has('qa')) {
  // Test-only structural check: no sign uses canvas/raster text.
  Object.defineProperty(window,'__eco3dBinAudit',{configurable:true,value:()=>{
    let rasterSigns=0;
    scene.traverse(obj=>{
      if(!obj.isMesh&&!obj.isSprite)return;
      const list=Array.isArray(obj.material)?obj.material:[obj.material];
      for(const material of list){if(material?.map?.isCanvasTexture)rasterSigns++;}
    });
    return {
      categoryCount:binGroups.size,
      pictograms:[...binGroups.entries()].map(([id,g])=>({
        id, count:g.children.filter(x=>x.name==='material-pictogram:'+id).length
      })),
      rasterSigns,
      rendered:!!renderer,
      dpr:renderer?.getPixelRatio()||0
    };
  }});
}
artwork = createArtWorld({THREE,scene,renderer,sun,hemisphere,mat,M,group,box,cylinder,sphere,addMesh});
polish = createPolish({THREE,scene,renderer,sun,hemisphere,mat,M,group,box,cylinder,sphere,addMesh,root:els.renderHost,resize});
story = createStory({THREE,scene,mat,M,group,box,cylinder,sphere,bench,addMesh,state,itemGroups,allPickables,showNote,announce,
  createCharacter:polish.createCharacter,sound:polish.sound,setChapter:polish.setChapter,
  onChapterChange:(day)=>{
    activeChapter=day;
    document.querySelector('.world')?.setAttribute('data-game-chapter',String(day));
    refreshHUD();
  }});
refreshHUD();
story.render();
const hour=new Date().getHours();els.sunLabel.textContent=hour<6?'Ночь':hour<12?'Тихое утро':hour<18?'День во дворе':'Вечер во дворе';
save();
setCamera();
if(renderer){resize();els.loading.hidden=true;tick()}
else {
  els.loading.innerHTML='3D недоступно. Используй список предметов и кнопки сортировки ниже — они работают без WebGL.';
  // Keep the game loop alive for sorting animation even without WebGL.
  function noGLLoop() {requestAnimationFrame(noGLLoop);if(sortTween){
    sortTween.group.visible=false;
    const {id,lesson}=sortTween;sortTween=null;sortFinished(id,lesson);
  }}
  noGLLoop();
}
