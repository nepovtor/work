/**
 * Eco-Farm / Stage 3 — authored miniature environment.
 * Every detail is real Three.js geometry or physically based material.
 * No rasterized lettering, texture downloads, stock images, AI-generated props,
 * expensive postprocessing passes or hidden remote dependencies.
 */
export function createArtWorld({THREE,scene,renderer,sun,hemisphere,mat,M,group,box,cylinder,sphere,addMesh}) {
  const seed=71423;
  let sequence=seed;
  const random=()=>{sequence=(Math.imul(1664525,sequence)+1013904223)>>>0;return sequence/4294967296;};
  const p=(color,roughness=.86,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const clay=p('#a16f5c',.89),clayRim=p('#c29279',.78),
    mortar=p('#c6bda5',.96),chalk=p('#e6dfcb',.92),
    darkWood=p('#644b3d',.82),windowTrim=p('#9a886b',.8),
    agedMetal=p('#718079',.44,.28),glass=p('#789b98',.19,.05),
    pathStone=p('#c9bfaa',.97),pathWarm=p('#dfd3b9',.95),
    leafDark=p('#486e54',.95),leafLight=p('#829f7a',.94),
    blossom=p('#e4caab',.91),moss=p('#7c9a6f',.98);
  // Intentional palette: warmer architectural surfaces, varied trees and
  // neutral paths. Changes reuse the scene's existing MeshStandardMaterials.
  mat.grass.color.set('#829e78');mat.grass.roughness=.98;
  mat.grassLight.color.set('#9ab48b');mat.grassDark.color.set('#63875f');
  mat.path.color.set('#d5cbb5');mat.pathShade.color.set('#bfb7a3');
  mat.roof.color.set('#80583f');mat.roof.roughness=.86;
  mat.wall.color.set('#eadbc3');mat.wallSide.color.set('#cfbfab');
  mat.wood.color.set('#805d43');mat.woodLight.color.set('#b28b64');
  mat.stone.color.set('#a9a594');mat.window.roughness=.24;
  mat.window.metalness=.05;mat.window.opacity=.88;
  mat.window.color.set('#91b1ad');
  const components={roofTiles:0,stonePieces:0,grassPatches:0,architecturalDetails:0,planters:0,flowerHeads:0,animated:0};
  const animations=[];
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),pos=new THREE.Vector3(),sc=new THREE.Vector3(),rot=new THREE.Euler();
  function addInstances(geometry,material,entries,rotated=false){
    const inst=new THREE.InstancedMesh(geometry,material,entries.length);
    inst.name='art:instanced-details';
    inst.receiveShadow=true;
    inst.castShadow=false; // low-cost phone rendering
    entries.forEach((e,i)=>{
      const [x,y,z,sx,sy,sz,rz=0,ry=0,rx=0]=e;
      rot.set(rx,ry,rz,'XYZ');q.setFromEuler(rot);
      pos.set(x,y,z);sc.set(sx,sy,sz);
      m4.compose(pos,q,sc);
      inst.setMatrixAt(i,m4);
      if(i%4===0){
        const c=new THREE.Color(material.color);
        c.multiplyScalar(.92+(i%6)*.027);
        inst.setColorAt(i,c);
      }
    });
    inst.instanceMatrix.needsUpdate=true;
    if(inst.instanceColor)inst.instanceColor.needsUpdate=true;
    scene.add(inst);return inst;
  }

  // Slender stone seams make the main routes feel constructed rather than painted.
  // The original, fully walkable underlay meshes remain intact.
  const stones=[];
  for(let row=0;row<33;row++){
    for(let col=0;col<5;col++){
      const z=-6.9+row*.49;
      const x=-5.8+col*.54+(row%2?.24:0);
      stones.push([x,.755+(col%2)*.002,z,.49,.022,.43,0,(random()-.5)*.038]);
    }
  }
  for(let row=0;row<8;row++){
    for(let col=0;col<26;col++){
      const x=-5.2+col*.55+(row%2?.23:0);
      const z=1.57+row*.4;
      stones.push([x,.758,x===Infinity?0:z,.49,.018,.35,0,(random()-.5)*.04]);
    }
  }
  // Secondary path to the recycling station.
  for(let row=0;row<6;row++){
    for(let col=0;col<16;col++){
      const x=-2.75+col*.55+(row%2?.20:0),z=-4.25+row*.41;
      stones.push([x,.765,z,.47,.016,.35]);
    }
  }
  addInstances(new THREE.BoxGeometry(1,1,1),pathStone,stones);
  components.stonePieces=stones.length;

  // Roof shingles follow the real sloped gable surface; one drawcall.
  const tiles=[];
  const roofW=5.95,roofD=4.15,rise=2,roofBase=.76+3.17,houseX=-7.45,houseZ=-5.8;
  const incline=Math.atan2(rise,roofW/2);
  for(const sign of [-1,1]){
    for(let r=0;r<5;r++){
      const xx=(.30+r*.50)*sign;
      for(let j=0;j<11;j++){
        const z=-1.88+j*.375+(r%2)*.09;
        const h=roofBase+rise-Math.abs(xx)*rise/(roofW/2);
        tiles.push([houseX+xx,h+.044,houseZ+z,.54,.043,.38,sign>0?-incline:incline]);
      }
    }
  }
  addInstances(new THREE.BoxGeometry(1,1,1),p('#886146',.92),tiles);
  components.roofTiles=tiles.length;
  // Ridge, gutters, chimney and a deliberately small amount of joinery.
  box(scene,.17,.13,4.3,p('#6b4b39'),houseX,roofBase+rise+.04,houseZ);
  for(const side of [-1,1]){
    box(scene,.14,.10,4.2,agedMetal,houseX+side*3.0,roofBase+.02,houseZ);
  }
  const chimney=group(scene,houseX+1.3,.76,houseZ-.78);
  box(chimney,.65,1.37,.67,p('#b9987f'),0,5.09,0);
  box(chimney,.77,.16,.78,mortar,0,5.83,0);
  box(chimney,.47,.07,.48,p('#483e35'),0,5.91,0);
  components.architecturalDetails+=6;

  // Window casings, sill plants, and timber facade details are geometry, not text.
  const frontZ=houseZ+1.90,wallY=.76;
  for(const x of [-7.45-2.05,-7.45+1.1]){
    box(scene,1.13,.09,.22,chalk,x,wallY+2.50,frontZ);
    box(scene,1.07,.10,.27,mortar,x,wallY+1.33,frontZ);
    box(scene,.055,1.0,.13,windowTrim,x,wallY+1.89,frontZ+.065);
    box(scene,.86,.045,.12,windowTrim,x,wallY+1.90,frontZ+.082);
    box(scene,.87,.035,.04,agedMetal,x,wallY+2.24,frontZ+.08);
    components.architecturalDetails+=5;
  }
  // Simple tactile stone foundation.
  const foundation=[];
  for(let i=0;i<18;i++)foundation.push([houseX-2.38+i*.28,.77,frontZ+.08,.25,.16,.09]);
  addInstances(new THREE.BoxGeometry(1,1,1),mortar,foundation);
  components.architecturalDetails+=foundation.length;

  // Repair shop: muted timber slats, inset glass panes, subtle metal awning.
  const shopX=6.9,shopZ=-5.6,shopFront=shopZ+1.69;
  const slats=[];
  for(let i=0;i<27;i++){
    const x=shopX-2.08+i*.155;
    slats.push([x,1.78,shopFront,.046,1.83,.066]);
  }
  addInstances(new THREE.BoxGeometry(1,1,1),p('#b5a287',.9),slats);
  box(scene,4.53,.18,.25,agedMetal,shopX,3.32,shopZ);
  for(let i=-1;i<=1;i++){
    const x=shopX+i*1.32;
    box(scene,.05,1.37,.08,chalk,x,1.74,shopFront+.03);
    box(scene,.98,.07,.09,chalk,x,2.31,shopFront+.03);
    box(scene,.98,.07,.09,chalk,x,1.35,shopFront+.03);
  }
  components.architecturalDetails+=slats.length+10;

  // Weathered terracotta pots with stems and recognizable shaped leaves.
  const planters=[
    [-8.1,-2.65,.75],[-6.35,-2.7,.67],[8.7,-3.25,.68],
    [5.3,-3.2,.7],[1.3,-7.05,.65]
  ];
  for(let i=0;i<planters.length;i++){
    const [x,z,size]=planters[i],g=group(scene,x,.76,z);
    cylinder(g,.32*size,.23*size,.50*size,clay,0,.23*size,0,12);
    cylinder(g,.35*size,.35*size,.075*size,clayRim,0,.49*size,0,12);
    cylinder(g,.30*size,.30*size,.025*size,p('#453f35'),0,.52*size,0,12);
    for(let n=0;n<4;n++){
      const theta=n*Math.PI/2+random()*.4;
      const stem=cylinder(g,.017,.025,.58*size,p('#567a51'),Math.cos(theta)*.1*size,.80*size,Math.sin(theta)*.1*size,5);
      stem.rotation.z=(n%2?-.15:.15);
      const leaf=sphere(g,.21*size,n%2?leafLight:leafDark,Math.cos(theta)*.2*size,1.08*size,Math.sin(theta)*.2*size);
      leaf.scale.set(1,.45,.65);
      if((n+i)%3===0){sphere(g,.055*size,blossom,Math.cos(theta)*.26*size,1.18*size,Math.sin(theta)*.22*size);components.flowerHeads++;}
    }
    components.planters++;
  }

  // Sculptural parcel signs, no unreadable floating text or fake labels.
  const enamel=p('#eee9dd',.62),bolt=p('#77685a',.58,.18);
  for(const [x,z] of [[-4.5,-6.7],[10,-1.3]]){
    const plaque=group(scene,x,.77,z);
    cylinder(plaque,.025,.04,1.1,agedMetal,0,.52,0,8);
    box(plaque,.62,.52,.06,enamel,0,1.1,.03);
    // Small embossed leaf motif.
    const leaf=sphere(plaque,.13,leafDark,0,1.12,.085);
    leaf.scale.set(.85,1.1,.15);
    cylinder(plaque,.02,.02,.24,agedMetal,0,1.02,.095,6).rotation.z=-.35;
    components.architecturalDetails+=4;
  }

  // A handful of textural tufts on lawn edges, batched into a single drawcall.
  const stems=[];
  for(let i=0;i<160;i++){
    const x=(random()-.5)*21.8,z=(random()-.5)*15.0;
    if((x>-6.6&&x<-3.1)||(z>1.2&&z<5.1)||(z>-4.8&&z<-1.8&&x>-4.0))continue;
    stems.push([x,.77+random()*.06,z,.034,.12+random()*.13,.035,0,random()*Math.PI]);
  }
  addInstances(new THREE.ConeGeometry(.5,1,4),moss,stems);
  components.grassPatches=stems.length;

  // Small hanging mobiles add life without constant movement or noisy particles.
  const mobiles=[];
  for(const [x,z] of [[-8.25,-5.0],[7.5,-5.4]]){
    const g=group(scene,x,4.0,z);
    cylinder(g,.02,.02,.54,agedMetal,0,-.28,0,6);
    for(let k=-1;k<=1;k++){
      box(g,.06,.30,.06,agedMetal,k*.13,-.68+Math.abs(k)*.04,0);
    }
    mobiles.push(g);
    components.animated++;
  }
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  let previousBucket=-1;
  function tick(time,dt,eco=false){
    if(reduced||eco)return;
    for(let i=0;i<mobiles.length;i++){
      mobiles[i].rotation.y=Math.sin(time*.46+i*1.4)*.12;
    }
  }
  const diagnostics=()=>({...components,procedural:true,textureDownloads:0,canvasSigns:0,
    animatedEnabled:!reduced});
  if(new URLSearchParams(location.search).has('qa'))Object.defineProperty(window,'__eco3dArtAudit',{configurable:true,value:diagnostics});
  return {tick,diagnostics};
}
