/**
 * Eco-Farm 3D / Stage 3
 * Original procedural props, restrained atmosphere, accessibility and optional SFX.
 * Every object is constructed from primitives. No AI images, remote 3D assets,
 * copyrighted music or asset packs.
 */
export function createPolish({THREE,scene,renderer,sun,hemisphere,mat,M,group,box,cylinder,sphere,addMesh,root,resize}) {
  const key=new URLSearchParams(location.search).has('qa') ? 'ecoFarm3D.settings.qa' : 'ecoFarm3D.settings.v1';
  const saved=(()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{return {}}})();
  // A narrow screen does not imply a weak GPU. Most modern iPhones can render
  // the courtyard above 1x Retina; sustained low FPS may still enable eco mode.
  const lowByDefault=(navigator.hardwareConcurrency||6)<=4 || (navigator.deviceMemory||8)<=3;
  let eco=typeof saved.eco==='boolean'?saved.eco:lowByDefault;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const actors=[],birds=[],leafActors=[],waterDrops=[];
  let audio=null,ambient=null,lastBirdSound=0,lastTime=-1,selectedSky=-1;
  let audioOn=false; // never autoplay, even if a previous session used sound
  const now=()=>new Date();
  const make=(color,rough=.9)=>new THREE.MeshStandardMaterial({color,roughness:rough});
  const textures={
    skin:make('#dcb995'),skinDark:make('#bf9078'),leaf:make('#628b64'),
    cobble:make('#beb6a0'),chalk:make('#e2dcc7'),hair:make('#67503d'),
    hair2:make('#95684e'),hair3:make('#464e45'),cream:make('#f0e3cd'),
    pale:make('#d7e5cd'),shadow:make('#546451'),leather:make('#745844'),
    slate:make('#536d68'),button:make('#ead3a8'),ash:make('#8c9b86')
  };
  const canvas=root?.querySelector('canvas');
  function remember(){
    try {localStorage.setItem(key,JSON.stringify({eco}))}catch{}
  }
  function updateResolution(){
    if(!renderer)return;
    const w=Math.max(1,root?.clientWidth||1),h=Math.max(1,root?.clientHeight||1);
    const nativeRatio=Math.max(1,window.devicePixelRatio||1);
    // Consistent on-screen sharpness without unbounded GPU fill cost.
    const pixelBudget=eco?1400000:2800000;
    const pixelRatio=Math.max(1,Math.min(nativeRatio,eco?1.5:2.0,Math.sqrt(pixelBudget/(w*h))));
    if(Math.abs(renderer.getPixelRatio()-pixelRatio)>.025)renderer.setPixelRatio(pixelRatio);
  }
  function hudIcon(name){
    const common='width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
    const paths={
      sound:'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M18 6a8 8 0 0 1 0 12"/>',
      mute:'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/>',
      quality:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17Z"/>',
      eco:'<path d="M4 16c7 0 13-3 16-12 1 10-2 16-10 16-3 0-5-1-6-4Z"/><path d="M4 21c3-6 7-10 13-13"/>'
    };
    return '<svg '+common+' aria-hidden="true">'+(paths[name]||paths.quality)+'</svg>';
  }
  function quality(flag){
    eco=!!flag;
    if(renderer){
      updateResolution();
      renderer.shadowMap.enabled=!eco;
      renderer.shadowMap.autoUpdate=!eco;
      if(sun){
        sun.castShadow=!eco;
        sun.shadow.mapSize.set(eco?512:1024,eco?512:1024);
      }
      resize?.();
    }
    birds.forEach((b,i)=>{b.group.visible=!eco||i===0});
    leafActors.forEach((leaf,i)=>{leaf.visible=!eco||i<7});
    remember();
    const btn=document.getElementById('qualityToggle');
    if(btn){
      btn.setAttribute('aria-pressed',String(eco));
      btn.setAttribute('aria-label',eco?'Экономный режим включён. Вернуть высокое качество.':'Включить экономный режим отображения');
      btn.title=eco?'Включить полное качество':'Экономный режим: меньше теней и анимаций';
      btn.innerHTML='<span class="hud-control-icon" aria-hidden="true">'+hudIcon(eco?'eco':'quality')+'</span><span>'+(eco?'Экономный':'Графика')+'</span>';
    }
  }
  // Environmental lighting responds to story chapters, not a punishing real-time clock.
  const lighting=[
    {sky:'#dce7da',sun:'#fff0cb',hemi:2.3,tone:1.19},
    {sky:'#cfe3db',sun:'#fff2d9',hemi:2.4,tone:1.20},
    {sky:'#d9ded9',sun:'#fff0d9',hemi:2.2,tone:1.15},
    {sky:'#e8ddca',sun:'#ffddad',hemi:2.05,tone:1.08},
    {sky:'#d3dfd3',sun:'#fbebd0',hemi:2.25,tone:1.16},
    {sky:'#d1e5d8',sun:'#fff0ce',hemi:2.45,tone:1.22},
    {sky:'#f0d5bc',sun:'#ffce96',hemi:1.88,tone:1.08}
  ];
  function setChapter(chapter){
    const n=Math.min(7,Math.max(1,Number(chapter)||1));
    if(n===selectedSky)return;
    selectedSky=n;
    const scheme=lighting[n-1];
    scene.background.set(scheme.sky);
    scene.fog.color.set(scheme.sky);
    if(sun){
      sun.color.set(scheme.sun);
      sun.intensity=n===7?2.5:3.1;
      sun.position.set(n===7?-18:-13,25,n===7?2:12);
    }
    if(hemisphere) hemisphere.intensity=scheme.hemi;
    if(renderer) renderer.toneMappingExposure=scheme.tone;
    const slot=document.getElementById('sunLabel');
    if(slot)slot.textContent=n===7?'Тёплый вечер':n===4?'Послеобеденный свет':n===3?'День с облаками':'Тихое утро';
    const sceneHost=document.querySelector('.world');
    if(sceneHost)sceneHost.dataset.chapter=String(n);
  }

  // Cohesive low-poly residents with articulated limbs and face details.
  const palette=[
    {coat:'#b98768',coatDark:'#866750',trousers:'#68776b',hair:'#6e5447',scarf:'#e3c18b',shoes:'#5c5247'},
    {coat:'#537b75',coatDark:'#3e625d',trousers:'#555d59',hair:'#4b5147',scarf:'#d8ad81',shoes:'#5e4b3e'},
    {coat:'#88869a',coatDark:'#676e81',trousers:'#625e68',hair:'#96674c',scarf:'#dbc4a5',shoes:'#4f5553'}
  ];
  function makeCharacter(x,z,index=0){
    const p=palette[index%palette.length];
    const person=group(scene,x,.79,z);
    person.userData.baseX=x;person.userData.baseZ=z;
    person.userData.destination=new THREE.Vector3(x,.79,z);
    person.userData.isInvited=false;
    person.userData.isResident=true;
    person.rotation.y=-.09+(index%3)*.12;
    const inner=group(person,0,0,0);
    const coat=make(p.coat),coatTrim=make(p.coatDark),pant=make(p.trousers),
      hair=make(p.hair),scarf=make(p.scarf),shoe=make(p.shoes);
    // Two shoes and independently animated legs.
    const legs=[];
    for(const side of [-1,1]){
      const hip=group(inner,side*.17,.61,0);
      cylinder(hip,.12,.14,.56,pant,0,-.27,0,8);
      const boot=box(hip,.25,.16,.39,shoe,0,-.59,.1);
      boot.rotation.x=.03;
      legs.push(hip);
    }
    cylinder(inner,.31,.38,.93,coat,0,1.07,0,12);
    cylinder(inner,.33,.34,.12,coatTrim,0,.62,0,12);
    cylinder(inner,.12,.12,.16,textures.skin,0,1.61,0,8);
    const arms=[];
    for(const side of [-1,1]){
      const shoulder=group(inner,side*.38,1.43,0);
      cylinder(shoulder,.125,.14,.66,coat,side*.055,-.28,0,8);
      sphere(shoulder,.10,textures.skin,side*.08,-.62,.005,1);
      arms.push(shoulder);
    }
    // A faceted head with a nose, restrained eyes and ears.
    const head=group(inner,0,1.79,0);
    const face=sphere(head,.35,textures.skin,0,.13,.025,2);
    face.scale.set(1,.98,.91);
    const backHair=sphere(head,.38,hair,0,.27,-.105,1);
    backHair.scale.set(1,.89,.86);
    const forehead=box(head,.59,.16,.17,hair,0,.425,.27);
    forehead.rotation.z=.025;
    for(const side of [-1,1]){
      const eye=sphere(head,.036,textures.shadow,side*.13,.15,.346,1);
      eye.castShadow=false;
      sphere(head,.09,textures.skin,side*.34,.13,0,1);
    }
    sphere(head,.075,textures.skin,0,.055,.35,1);
    box(inner,.23,.13,.45,scarf,0,1.55,.07).rotation.y=.14;
    if(index===0){
      // Canvas bag for the librarian, one strap across the chest.
      const bag=box(inner,.43,.47,.18,make('#bba17b'),.48,.84,.13);
      bag.rotation.z=.1;
      const strap=box(inner,.055,.73,.05,textures.leather,.32,1.25,.21);
      strap.rotation.z=-.56;
    }
    if(index===1){
      // Workshop apron; no random accessories.
      box(inner,.52,.62,.065,make('#d6c5a8'),0,1.01,.34);
      box(inner,.16,.1,.07,textures.leather,0,1.16,.39);
    }
    if(index===2){
      // A light knitted hat.
      const beanie=sphere(head,.35,make('#b5a28d'),0,.39,.02,1);
      beanie.scale.set(1,.47,.95);
      cylinder(head,.33,.33,.08,make('#b5a28d'),0,.39,.02,12);
    }
    person.userData.parts={inner,head,arms,legs};
    person.userData.phase=index*2.19;
    person.userData.index=index;
    actors.push(person);
    return person;
  }

  // Bird models: two hinged wings, moving calmly above the courtyard.
  function addBird(i){
    const g=group(scene,0,5.8,0);
    const plumage=make(i===0?'#d8c9b2':'#789888');
    const wing=make(i===0?'#b4a78e':'#588276');
    const beak=make('#cfa46c');
    const body=sphere(g,.19,plumage,0,0,0,1);
    body.scale.set(.9,.62,1.35);
    sphere(g,.12,plumage,0,.07,.18,1);
    const bill=new THREE.Mesh(new THREE.ConeGeometry(.07,.18,4),beak);
    bill.position.set(0,.01,.35);bill.rotation.x=Math.PI/2;g.add(bill);
    const wings=[];
    for(const side of [-1,1]){
      const pivot=group(g,side*.12,.04,0);
      const mesh=box(pivot,.46,.055,.27,wing,side*.25,0,-.03);
      mesh.rotation.z=side*.15;
      wings.push({pivot,side});
    }
    birds.push({group:g,wings,phase:i*2.7,offset:i*3.2,altitude:5.1+i*.55});
  }
  addBird(0);addBird(1);

  // Low-cost wind-borne leaves, faceted and without texture uploads.
  const leafColors=[make('#a3b77f'),make('#8caa7c'),make('#c0aa74')];
  for(let i=0;i<12;i++){
    const leaf=addMesh(scene,new THREE.TetrahedronGeometry(.055+(i%3)*.018,0),leafColors[i%3],
      (i%6-2.7)*3.2,2.7+i%4,(Math.floor(i/3)-1.5)*3.3,false);
    leaf.castShadow=false;
    leaf.userData.origin=leaf.position.clone();
    leafActors.push(leaf);
  }
  // Carefully rationed handcrafted landscaping props.
  const planterWood=make('#b58c65'),woodShadow=make('#80654f');
  function woodenPlanter(x,z){
    const g=group(scene,x,.80,z);
    box(g,1.65,.65,.72,planterWood,0,.32,0);
    for(let n=-1;n<=1;n++){
      box(g,.08,.58,.76,woodShadow,n*.48,.32,0);
    }
    for(let j=0;j<5;j++){
      const a=(j-2)*.31;
      cylinder(g,.04,.045,.45,make('#567f59'),a,.88,(j%2?-.12:.12),5);
      const leaf=sphere(g,.24,make(j%2?'#79a477':'#9aba80'),a,.98+.02*(j%2),j%2?-.17:.12,1);
      leaf.scale.set(.75,.8,.55);
    }
    return g;
  }
  woodenPlanter(-8.5,-1.6);
  woodenPlanter(8.7,-2.8);
  woodenPlanter(-.9,-7.6);

  // No background music: just small synthesized feedback gestures.
  function ctxAudio(){
    if(!audio){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;audio=new A();}
    return audio;
  }
  function oscillator(ctx,{freq=480,end=freq*.8,duration=.13,gain=.028,wave='sine',delay=0}){
    if(!audioOn||ctx.state!=='running')return;
    const o=ctx.createOscillator(),vol=ctx.createGain(),t=ctx.currentTime+delay;
    o.type=wave;o.frequency.setValueAtTime(freq,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(100,end),t+duration);
    vol.gain.setValueAtTime(.0001,t);
    vol.gain.exponentialRampToValueAtTime(gain,t+.015);
    vol.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(vol).connect(ctx.destination);
    o.start(t);o.stop(t+duration+.02);
  }
  function sound(kind){
    if(!audioOn)return;
    const ctx=ctxAudio();
    if(!ctx||ctx.state!=='running')return;
    if(kind==='correct'||kind==='paper'){
      oscillator(ctx,{freq:530,end:395,duration:.13,gain:.026,wave:'sine'});
      oscillator(ctx,{freq:790,end:650,duration:.15,gain:.013,delay:.055});
    }else if(kind==='build'||kind==='plant'){
      oscillator(ctx,{freq:350,end:470,duration:.19,gain:.028,wave:'triangle'});
      oscillator(ctx,{freq:540,end:670,duration:.19,gain:.014,delay:.09});
    }else if(kind==='error'){
      oscillator(ctx,{freq:310,end:245,duration:.12,gain:.02,wave:'sine'});
    }else if(kind==='chapter'||kind==='finish'){
      oscillator(ctx,{freq:400,end:540,duration:.24,gain:.016,wave:'triangle'});
      oscillator(ctx,{freq:620,end:750,duration:.25,gain:.014,delay:.11});
    }else if(kind==='bird'){
      oscillator(ctx,{freq:1040,end:1650,duration:.08,gain:.006,wave:'sine'});
      oscillator(ctx,{freq:1340,end:1020,duration:.1,gain:.005,delay:.07});
    }
  }
  function toggleSound() {
    if(audioOn) {
      audioOn=false;
      if(audio?.state==='running')audio.suspend();
    }else{
      const a=ctxAudio();
      if(!a) {return;}
      audioOn=true;
      a.resume().then(()=>sound('correct')).catch(()=>{audioOn=false;updateSoundButton()});
    }
    updateSoundButton();
  }
  function updateSoundButton(){
    const btn=document.getElementById('soundToggle');
    if(!btn)return;
    btn.setAttribute('aria-pressed',String(audioOn));
    btn.setAttribute('aria-label',audioOn?'Выключить звуковые эффекты':'Включить звуковые эффекты');
    btn.title=audioOn?'Выключить звуки':'Включить звуки (без музыки)';
    btn.innerHTML='<span class="hud-control-icon" aria-hidden="true">'+hudIcon(audioOn?'sound':'mute')+'</span><span>'+(audioOn?'Звук вкл':'Звук выкл')+'</span>';
  }
  function initControls(){
    const soundBtn=document.getElementById('soundToggle');
    const qualityBtn=document.getElementById('qualityToggle');
    if(soundBtn)soundBtn.addEventListener('click',toggleSound);
    if(qualityBtn)qualityBtn.addEventListener('click',()=>quality(!eco));
    quality(eco);updateSoundButton();setChapter(1);
  }
  initControls();

  let fpsFrames=0,fpsSeconds=0,slowSamples=0,adapted=false;
  function tick(t,dt){
    // Adaptive quality is one-way and only on clear sustained slowdown.
    if(!eco && !adapted && !reduced.matches){
      fpsFrames++;
      fpsSeconds+=Math.min(.1,dt);
      if(fpsSeconds>4.5){
        if(fpsFrames/fpsSeconds<27)slowSamples++;
        else slowSamples=0;
        if(slowSamples>=2){quality(true);adapted=true;}
        fpsFrames=0;fpsSeconds=0;
      }
    }
    if(reduced.matches)return;
    for(const a of actors){
      if(!a.visible)continue;
      const {inner,head,arms,legs}=a.userData.parts;
      const phase=t*1.35+a.userData.phase;
      const destination=a.userData.destination;
      const moving=a.position.distanceTo(destination)>.04;
      if(moving){
        a.position.lerp(destination,Math.min(.055,dt*1.9));
        inner.position.y=Math.sin(phase*2)*.048;
        legs.forEach((leg,i)=>leg.rotation.x=Math.sin(phase*4+i*Math.PI)*.17);
        arms.forEach((arm,i)=>arm.rotation.x=Math.sin(phase*4+(i+1)*Math.PI)*.16);
      }else{
        inner.position.y=Math.sin(phase)*.018;
        legs.forEach(l=>l.rotation.x*=.9);
        arms.forEach((arm,i)=>arm.rotation.z=(i===0?-.1:.1)+Math.sin(phase+i*.9)*.026);
      }
      head.rotation.y=Math.sin(t*.5+a.userData.phase)*.13;
    }
    for(let i=0;i<birds.length;i++){
      const b=birds[i];
      const orbit=t*.24+b.offset;
      b.group.position.set(Math.cos(orbit)*9, b.altitude+Math.sin(t*1.3+b.phase)*.27,Math.sin(orbit)*7);
      b.group.rotation.y=-orbit-Math.PI/2;
      for(const wing of b.wings)wing.pivot.rotation.z=Math.sin(t*7+b.phase)*.37*wing.side;
    }
    if(!eco){
      leafActors.forEach((leaf,i)=>{
        const phase=t*.43+i*1.7;
        const base=leaf.userData.origin;
        leaf.position.x=base.x+Math.sin(phase)*1.15;
        leaf.position.y=base.y+Math.sin(phase*.72)*.55;
        leaf.position.z=base.z+Math.cos(phase*.76)*.73;
        leaf.rotation.y=phase*.32;
      });
    }
    if(audioOn && t-lastBirdSound>17 && selectedSky<7) {
      sound('bird');lastBirdSound=t;
    }
  }
  const diagnostics=()=>{
    return {stage:3,eco,quality:eco?'economy':'full',soundEnabled:audioOn,
      actors:actors.length,activeActors:actors.filter(x=>x.visible).length,invitedActors:actors.filter(x=>x.userData.isInvited).length,
      birds:birds.length,leaves:leafActors.length,
      chapter:selectedSky,rendered:!!renderer,
      dpr:renderer?renderer.getPixelRatio():0,nativeDpr:window.devicePixelRatio||1};
  };
  // Read-only, predictable telemetry for the shipped QA page.
  Object.defineProperty(window,'__eco3dDiagnostics',{configurable:true,value:diagnostics});
  return {createCharacter:makeCharacter,tick,setChapter,sound,quality,toggleSound,updateResolution,isEconomy:()=>eco,diagnostics};
}
