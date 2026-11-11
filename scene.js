/* Hunter System: 3D avatar and its dark-fantasy campsite. Needs three.min.js loaded first. */
(function(){
"use strict";
var T=window.THREE;
if(!T)return;
var REDUCED=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function mat(color,o){return new T.MeshStandardMaterial(Object.assign({color:color,roughness:.88,metalness:0},o||{}))}
function mesh(geo,m,x,y,z){var e=new T.Mesh(geo,m);e.position.set(x||0,y||0,z||0);e.castShadow=true;e.receiveShadow=true;return e}
function group(x,y,z){var g=new T.Group();g.position.set(x||0,y||0,z||0);return g}
function gearMat(tier,color){
  if(tier<=0)return mat(0x6e4b2c,{roughness:.92});
  if(tier===1)return mat(0x97a1b0,{roughness:.42,metalness:.35});
  if(tier===2)return mat(new T.Color(0x9aa6b8).lerp(new T.Color(color),.45),{roughness:.34,metalness:.35,emissive:color,emissiveIntensity:.1});
  if(tier===3)return mat(0x2b2146,{roughness:.5,metalness:.3,emissive:color,emissiveIntensity:.4});
  return mat(0xdcab3c,{roughness:.3,metalness:.4,emissive:0xff9d1a,emissiveIntensity:.3});
}
function trimMat(color){return mat(color,{emissive:color,emissiveIntensity:.9,roughness:.4})}
function glowTexture(inner,outer){
  var c=document.createElement("canvas");c.width=c.height=128;var x=c.getContext("2d");
  var g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,inner);g.addColorStop(1,outer);
  x.fillStyle=g;x.fillRect(0,0,128,128);return new T.CanvasTexture(c);
}

/* ---------- the hunter ---------- */
function buildHunter(){
  var skin=mat(0xd6a27e,{roughness:.7}),hair=mat(0x17110d,{roughness:.95}),tunic=mat(0x3d4258),trousers=mat(0x232838),leather=mat(0x2b2019);
  var J={};
  var av=group();J.av=av;
  var hips=group(0,.95,0);av.add(hips);J.hips=hips;
  hips.add(mesh(new T.CylinderGeometry(.17,.155,.2,14),trousers,0,-.02,0));
  var torso=group(0,.08,0);hips.add(torso);J.torso=torso;
  var belly=mesh(new T.CylinderGeometry(.185,.165,.3,14),tunic,0,.14,0);belly.scale.z=.78;torso.add(belly);J.belly=belly;
  var chestG=group(0,.4,0);torso.add(chestG);J.chest=chestG;
  var chest=mesh(new T.SphereGeometry(.2,18,14),tunic);chest.scale.set(1.1,.98,.7);chestG.add(chest);
  var skirt=mesh(new T.CylinderGeometry(.17,.2,.16,14,1,true),tunic,0,-.08,0);skirt.scale.z=.8;torso.add(skirt);
  torso.add(mesh(new T.CylinderGeometry(.176,.176,.045,14),leather,0,.0,0)).scale.z=.8;
  var neck=mesh(new T.CylinderGeometry(.052,.06,.1,10),skin,0,.6,0);torso.add(neck);
  var head=group(0,.74,.01);torso.add(head);J.head=head;
  var skull=mesh(new T.SphereGeometry(.112,20,16),skin);skull.scale.set(.9,1.1,1);head.add(skull);
  var jaw=mesh(new T.SphereGeometry(.082,16,12),skin,0,-.062,.022);jaw.scale.set(.88,.8,.9);head.add(jaw);
  head.add(mesh(new T.ConeGeometry(.016,.045,6),skin,0,-.012,.112)).rotation.x=-.25;
  var eyeM=mat(0x0c0f18,{roughness:.3});
  J.eyes=[mesh(new T.SphereGeometry(.013,8,6),eyeM,.04,.012,.098),mesh(new T.SphereGeometry(.013,8,6),eyeM,-.04,.012,.098)];
  J.eyes.forEach(function(e){e.castShadow=false;head.add(e)});
  var brow=mat(0x17110d);
  head.add(mesh(new T.BoxGeometry(.034,.007,.01),brow,.04,.036,.1));head.add(mesh(new T.BoxGeometry(.034,.007,.01),brow,-.04,.036,.1));
  head.add(mesh(new T.BoxGeometry(.04,.006,.008),mat(0x8a4f43),0,-.068,.094));
  head.add(mesh(new T.SphereGeometry(.022,8,6),skin,.102,0,0));head.add(mesh(new T.SphereGeometry(.022,8,6),skin,-.102,0,0));
  var hairG=group();head.add(hairG);J.hair=hairG;
  var cap=mesh(new T.SphereGeometry(.12,18,12,0,Math.PI*2,0,Math.PI*.58),hair,0,.012,-.012);cap.scale.set(.94,1.1,1.04);hairG.add(cap);
  var back=mesh(new T.SphereGeometry(.1,14,10),hair,0,-.03,-.05);back.scale.set(.95,1,.8);hairG.add(back);
  J.helmet=group();head.add(J.helmet);
  function arm(side){
    var sh=group(side*.235,.52,0);torso.add(sh);
    sh.add(mesh(new T.SphereGeometry(.062,12,10),tunic));
    sh.add(mesh(new T.CapsuleGeometry(.05,.22,4,10),tunic,0,-.16,0));
    var el=group(0,-.31,0);sh.add(el);
    el.add(mesh(new T.CapsuleGeometry(.041,.2,4,10),skin,0,-.13,0));
    var hand=group(0,-.29,0);el.add(hand);
    var palm=mesh(new T.SphereGeometry(.046,10,8),skin);palm.scale.set(.8,1.15,.55);hand.add(palm);
    var pg=group();sh.add(pg);var gg=group();el.add(gg);
    return{sh:sh,el:el,hand:hand,pauldron:pg,gauntlet:gg};
  }
  J.armL=arm(1);J.armR=arm(-1);
  function leg(side){
    var hip=group(side*.095,-.06,0);hips.add(hip);
    hip.add(mesh(new T.CapsuleGeometry(.074,.28,4,10),trousers,0,-.2,0));
    var knee=group(0,-.42,0);hip.add(knee);
    knee.add(mesh(new T.CapsuleGeometry(.054,.28,4,10),trousers,0,-.19,0));
    var foot=mesh(new T.BoxGeometry(.09,.07,.24),leather,0,-.41,.055);knee.add(foot);
    var bg=group();knee.add(bg);
    return{hip:hip,knee:knee,boot:bg};
  }
  J.legL=leg(1);J.legR=leg(-1);
  J.chestGear=group();chestG.add(J.chestGear);
  J.bellyGear=group();torso.add(J.bellyGear);
  J.back=group(0,.38,-.15);torso.add(J.back);
  J.weapon=group();
  return J;
}

/* ---------- gear ---------- */
function clear(g){while(g.children.length){var c=g.children[0];g.remove(c);c.traverse(function(o){if(o.geometry)o.geometry.dispose()})}}
function buildWeapon(shape,tier,color){
  var g=group(),blade=gearMat(Math.max(1,tier),color),wood=mat(0x5a3d22),guard=mat(0xb9c2d0,{metalness:.3,roughness:.4});
  if(tier>=3){blade=blade.clone();blade.emissiveIntensity=.7}
  function sword(len,w,gw){
    g.add(mesh(new T.CylinderGeometry(.016,.016,.16,8),wood,0,-.02,0));
    g.add(mesh(new T.SphereGeometry(.024,8,6),guard,0,-.11,0));
    g.add(mesh(new T.BoxGeometry(gw,.022,.03),guard,0,.07,0));
    var b=mesh(new T.BoxGeometry(w,len,.012),blade,0,.08+len/2,0);g.add(b);
    var tip=mesh(new T.ConeGeometry(w/2,w*1.6,4),blade,0,.08+len+w*.8,0);tip.scale.z=.24;tip.rotation.y=Math.PI/4;g.add(tip);
  }
  if(shape==="club"){var c=mesh(new T.CylinderGeometry(.05,.018,.62,10),wood,0,.22,0);g.add(c);g.add(mesh(new T.SphereGeometry(.05,10,8),wood,0,.53,0))}
  else if(shape==="dagger")sword(.2,.04,.1);
  else if(shape==="sword")sword(.48,.05,.14);
  else if(shape==="long")sword(.78,.05,.2);
  else if(shape==="sabre"){sword(.62,.045,.12);g.children[3].rotation.z=-.06;g.children[4].position.x=.035;g.children[4].rotation.z=-.2}
  else if(shape==="great")sword(1.02,.085,.28);
  else if(shape==="halberd"){
    g.add(mesh(new T.CylinderGeometry(.017,.017,1.75,8),wood,0,.45,0));
    var ax=mesh(new T.CylinderGeometry(.16,.16,.014,16,1,false,0,Math.PI),blade,.02,1.12,0);ax.rotation.x=Math.PI/2;ax.rotation.z=-Math.PI/2;g.add(ax);
    g.add(mesh(new T.ConeGeometry(.026,.24,6),blade,0,1.44,0));
  }else if(shape==="bow"){
    var arc=mesh(new T.TorusGeometry(.5,.014+.002*tier,6,28,Math.PI*.82),tier?blade:wood);arc.rotation.z=Math.PI*.59;arc.position.x=.5;g.add(arc);
    var str=mesh(new T.CylinderGeometry(.004,.004,.96,4),mat(0xe8e8e8,{emissive:0x888888}),.362,0,0);str.castShadow=false;g.add(str);
    g.add(mesh(new T.CylinderGeometry(.022,.022,.15,8),mat(0x2b2019),0,0,0));
  }
  return g;
}
function buildQuiver(tier,color){
  var g=group();
  var q=mesh(new T.CylinderGeometry(.05,.04,.42,10),mat(0x4a3220),0,0,0);g.add(q);
  for(var i=0;i<4;i++){
    var a=mesh(new T.CylinderGeometry(.005,.005,.5,4),mat(0xcdb892),(i-1.5)*.018,.12,(i%2)*.016);g.add(a);
    var f=mesh(new T.BoxGeometry(.022,.07,.003),trimMat(color),(i-1.5)*.018,.34,(i%2)*.016);f.castShadow=false;g.add(f);
  }
  g.rotation.z=.5;return g;
}
function buildHelmet(tier,color){
  var g=group(),m=gearMat(tier,color),tr=trimMat(color);
  if(tier===3){
    m=m.clone();m.side=T.DoubleSide;
    var hood=mesh(new T.SphereGeometry(.142,20,14,Math.PI/2+.72,Math.PI*2-1.44,0,Math.PI*.74),m,0,.0,-.014);hood.scale.set(.98,1.12,1.08);g.add(hood);
    var top=mesh(new T.SphereGeometry(.143,20,8,0,Math.PI*2,0,Math.PI*.3),m,0,.0,-.014);top.scale.set(.98,1.12,1.08);g.add(top);
    var rim=mesh(new T.TorusGeometry(.1,.007,6,20,Math.PI),tr,0,.045,.094);rim.castShadow=false;g.add(rim);
    return g;
  }
  var dome=mesh(new T.SphereGeometry(.128,18,12,0,Math.PI*2,0,Math.PI*.52),m,0,.012,-.004);dome.scale.set(.95,1.14,1.04);g.add(dome);
  if(tier===1){var brim=mesh(new T.CylinderGeometry(.17,.18,.014,20),m,0,.02,0);g.add(brim)}
  if(tier>=2){
    g.add(mesh(new T.BoxGeometry(.018,.1,.014),m,0,-.02,.118));
    var ck=new T.BoxGeometry(.012,.11,.09);g.add(mesh(ck,m,.106,-.045,.03));g.add(mesh(ck,m,-.106,-.045,.03));
    var crest=mesh(new T.BoxGeometry(.012,.05,.2),tr,0,.16,-.01);crest.castShadow=false;g.add(crest);
  }
  if(tier>=4){
    g.add(mesh(new T.TorusGeometry(.118,.012,6,24),m,0,.05,0)).rotation.x=Math.PI/2;
    for(var i=0;i<8;i++){var a=i/8*Math.PI*2,sp=mesh(new T.ConeGeometry(.016,.07,5),i%2?m:tr,Math.sin(a)*.118,.095,Math.cos(a)*.118);g.add(sp)}
  }
  return g;
}
function buildChest(tier,color,J){
  var m=gearMat(tier,color),tr=trimMat(color);
  var shell=mesh(new T.SphereGeometry(.2,18,14),m);shell.scale.set(1.17,1.03,.78);J.chestGear.add(shell);
  var plate=mesh(new T.CylinderGeometry(.196,.176,.3,14),m,0,.14,0);plate.scale.z=.84;J.bellyGear.add(plate);
  if(tier>=1)[J.armL,J.armR].forEach(function(a){
    var p=mesh(new T.SphereGeometry(.085,14,10,0,Math.PI*2,0,Math.PI*.6),m,0,.012,0);p.scale.set(1.15,.9,1.1);a.pauldron.add(p);
    if(tier>=3){var s=mesh(new T.ConeGeometry(.022,.09,5),tr,0,.1,0);a.pauldron.add(s)}
  });
  if(tier>=2){var gem=mesh(new T.OctahedronGeometry(.036),tr,0,.02,.142);gem.scale.z=.5;gem.castShadow=false;J.chestGear.add(gem)}
  if(tier>=2){var b=mesh(new T.CylinderGeometry(.2,.2,.03,14),tr,0,0,0);b.scale.z=.84;b.castShadow=false;J.bellyGear.add(b)}
}
function buildGauntlets(tier,color,J){
  var m=gearMat(tier,color),tr=trimMat(color);
  [J.armL,J.armR].forEach(function(a){
    a.gauntlet.add(mesh(new T.CylinderGeometry(.056,.048,.2,10),m,0,-.15,0));
    var fist=mesh(new T.SphereGeometry(.056,10,8),m,0,-.29,0);fist.scale.set(.85,1.1,.7);a.gauntlet.add(fist);
    if(tier>=2){var r=mesh(new T.TorusGeometry(.057,.007,5,14),tr,0,-.06,0);r.rotation.x=Math.PI/2;r.castShadow=false;a.gauntlet.add(r)}
  });
}
function buildBoots(tier,color,J){
  var m=gearMat(tier,color),tr=trimMat(color);
  [J.legL,J.legR].forEach(function(l){
    l.boot.add(mesh(new T.CylinderGeometry(.07,.062,.24,10),m,0,-.27,0));
    l.boot.add(mesh(new T.BoxGeometry(.104,.084,.26),m,0,-.41,.058));
    if(tier>=2){var r=mesh(new T.TorusGeometry(.071,.007,5,14),tr,0,-.16,0);r.rotation.x=Math.PI/2;r.castShadow=false;l.boot.add(r)}
  });
}

/* ---------- the world ---------- */
function create(){
  var canvas=document.createElement("canvas"),renderer;
  try{renderer=new T.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:"low-power"})}catch(e){return null}
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  var scene=new T.Scene();scene.fog=new T.FogExp2(0x0a1022,.042);
  var cam=new T.PerspectiveCamera(40,1,.1,140);
  var uTime={value:0},runes=[];

  // sky, moon, stars
  var sc=document.createElement("canvas");sc.width=4;sc.height=256;var sx=sc.getContext("2d"),sg=sx.createLinearGradient(0,0,0,256);
  sg.addColorStop(0,"#02030a");sg.addColorStop(.38,"#090e22");sg.addColorStop(.49,"#1c2350");sg.addColorStop(.53,"#2a2244");sg.addColorStop(.6,"#090b15");sg.addColorStop(1,"#05060c");
  sx.fillStyle=sg;sx.fillRect(0,0,4,256);
  scene.add(new T.Mesh(new T.SphereGeometry(100,24,16),new T.MeshBasicMaterial({map:new T.CanvasTexture(sc),side:T.BackSide,fog:false})));
  var moon=new T.Mesh(new T.SphereGeometry(2.6,24,16),new T.MeshBasicMaterial({color:0xe6ecff,fog:false}));moon.position.set(-8,12.5,-46);scene.add(moon);
  var halo=new T.Sprite(new T.SpriteMaterial({map:glowTexture("rgba(170,190,255,.55)","rgba(170,190,255,0)"),fog:false,depthWrite:false,blending:T.AdditiveBlending}));
  halo.scale.set(22,22,1);halo.position.copy(moon.position);scene.add(halo);
  var sp=[],i;for(i=0;i<420;i++){var a=Math.random()*Math.PI*2,e=Math.random()*1.3+.12,r=90;sp.push(Math.cos(a)*Math.cos(e)*r,Math.sin(e)*r,Math.sin(a)*Math.cos(e)*r)}
  var sgeo=new T.BufferGeometry();sgeo.setAttribute("position",new T.Float32BufferAttribute(sp,3));
  scene.add(new T.Points(sgeo,new T.PointsMaterial({color:0xcfd8ff,size:1.6,sizeAttenuation:false,fog:false,transparent:true,opacity:.85})));

  // light
  scene.add(new T.HemisphereLight(0x6a80c8,0x10161a,1.7));
  var moonL=new T.DirectionalLight(0xa9bfff,2.6);moonL.position.set(-5,9,-3);moonL.castShadow=true;
  moonL.shadow.mapSize.set(1024,1024);var s=moonL.shadow.camera;s.left=-5;s.right=5;s.top=5;s.bottom=-5;s.near=1;s.far=24;moonL.shadow.bias=-.002;scene.add(moonL);
  var FIRE=new T.Vector3(1.3,0,-.95);
  var fireL=new T.PointLight(0xff7a2a,9,11,1.8);fireL.position.set(FIRE.x,.55,FIRE.z);scene.add(fireL);
  var rim=new T.DirectionalLight(0xb8c8ff,1.25);rim.position.set(1.5,2.5,6);scene.add(rim);

  // ground
  var gg=new T.PlaneGeometry(90,90,60,60);gg.rotateX(-Math.PI/2);
  var gp=gg.attributes.position;for(i=0;i<gp.count;i++){var gx=gp.getX(i),gz=gp.getZ(i),d=Math.sqrt(gx*gx+gz*gz);
    gp.setY(i,d<5?0:(Math.sin(gx*.35)+Math.cos(gz*.3+gx*.1))*.22*Math.min(1,(d-5)/6))}
  gg.computeVertexNormals();
  var ground=new T.Mesh(gg,mat(0x1a2a22,{roughness:1}));ground.receiveShadow=true;scene.add(ground);

  // grass with wind
  var blade=new T.ConeGeometry(.028,.36,3);blade.translate(0,.18,0);
  var gm=mat(0x24402e,{roughness:1});
  gm.onBeforeCompile=function(sh){sh.uniforms.uTime=uTime;
    sh.vertexShader="uniform float uTime;\n"+sh.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\n transformed.x+=sin(uTime*1.5+instanceMatrix[3][0]*1.7+instanceMatrix[3][2]*1.1)*.34*transformed.y;\n transformed.z+=cos(uTime*1.1+instanceMatrix[3][0])*.12*transformed.y;")};
  var N=2200,grass=new T.InstancedMesh(blade,gm,N),dm=new T.Object3D(),col=new T.Color();
  for(i=0;i<N;i++){
    var ra=Math.random()*Math.PI*2,rr=1.5+Math.pow(Math.random(),.8)*15,px=Math.cos(ra)*rr,pz=Math.sin(ra)*rr-1;
    if(Math.hypot(px-FIRE.x,pz-FIRE.z)<.8||Math.hypot(px,pz)<1.35){px+=3.2;pz-=4}
    dm.position.set(px,0,pz);dm.rotation.y=Math.random()*6.28;var sc2=.45+Math.random()*.6;dm.scale.set(sc2,sc2*(.7+Math.random()*.8),sc2);dm.updateMatrix();
    grass.setMatrixAt(i,dm.matrix);grass.setColorAt(i,col.setHSL(.33+Math.random()*.07,.4,.24+Math.random()*.16));
  }
  grass.receiveShadow=true;scene.add(grass);

  // ruined keep on the horizon
  var stone=mat(0x0d111c,{roughness:1}),lit=new T.MeshBasicMaterial({color:0xffa24a,fog:false});
  var keep=group(8.5,0,-27);scene.add(keep);
  function tower(x,z,r,hh,roof){keep.add(mesh(new T.CylinderGeometry(r,r*1.12,hh,10),stone,x,hh/2,z));
    if(roof)keep.add(mesh(new T.ConeGeometry(r*1.25,r*2.4,10),stone,x,hh+r*1.2,z));
    else for(var k=0;k<6;k++){var an=k/6*6.28;keep.add(mesh(new T.BoxGeometry(r*.4,r*.5,r*.4),stone,x+Math.cos(an)*r*.85,hh+r*.25,z+Math.sin(an)*r*.85))}}
  tower(-4,0,1.3,8,true);tower(3.5,-1,1.6,11,true);tower(0,1.5,1.1,5.5,false);tower(7,1,1,4,false);
  keep.add(mesh(new T.BoxGeometry(8,3.6,1),stone,-.4,1.8,.6));keep.add(mesh(new T.BoxGeometry(3.5,2.2,1),stone,5.2,1.1,.8));
  [[-4,5.5,1.32],[3.5,8,1.62],[3.5,5,1.62],[-1,2.4,1.12]].forEach(function(w){var q=new T.Mesh(new T.PlaneGeometry(.28,.5),lit);q.position.set(w[0],w[1],w[2]+(w[0]===3.5?-1:w[0]===-1?.6:0));keep.add(q)});

  // dead trees, standing stones, rocks
  var bark=mat(0x110e10,{roughness:1});
  function tree(x,z,hh,ry){var g=group(x,0,z);g.rotation.y=ry;g.add(mesh(new T.CylinderGeometry(.07,.2,hh,7),bark,0,hh/2,0));
    [[.55,.9,.5],[.7,-.8,.42],[.85,.5,.3],[.95,-.4,.22]].forEach(function(b,k){var br=mesh(new T.CylinderGeometry(.02,.06,hh*b[2],5),bark,Math.sin(b[1])*hh*b[2]*.5,hh*b[0]+Math.cos(b[1])*hh*b[2]*.5,k%2?.15:-.1);br.rotation.z=-b[1];g.add(br)});scene.add(g)}
  tree(-4.2,-4.5,4.2,.3);tree(5.2,-7.5,5,1.8);tree(-9,-13,6,.9);tree(-1.5,-15,4.6,2.4);
  var menhir=mat(0x2a3142,{roughness:1}),rune=trimMat(0x54c8ff);
  [[-2.6,-3.6,1.5,.12],[-3.7,-2.6,1.1,-.2],[-1.7,-4.8,1.8,.05]].forEach(function(m,k){
    var st=mesh(new T.BoxGeometry(.5,m[2],.32),menhir,m[0],m[2]/2-.05,m[1]);st.rotation.z=m[3];st.rotation.y=.5+k;scene.add(st);
    if(k!==1){var ru=new T.Mesh(new T.PlaneGeometry(.1,.34),rune.clone());ru.material.transparent=true;ru.position.set(0,.15,.165);st.add(ru);runes.push(ru.material)}});
  var rock=mat(0x1a1f2a,{roughness:1});
  [[2.9,1.6,.3],[-1.9,1.5,.22],[3.6,-2.6,.45],[-5,1,.5],[-.6,-3.2,.26]].forEach(function(r){var k=mesh(new T.DodecahedronGeometry(r[2]),rock,r[0],r[2]*.4,r[1]);k.scale.y=.6;k.rotation.set(r[0],r[1],0);scene.add(k)});

  // campfire
  var fire=group(FIRE.x,0,FIRE.z);scene.add(fire);
  for(i=0;i<7;i++){var fa=i/7*6.28;fire.add(mesh(new T.DodecahedronGeometry(.1),rock,Math.cos(fa)*.36,.05,Math.sin(fa)*.36))}
  for(i=0;i<3;i++){var lg=mesh(new T.CylinderGeometry(.045,.05,.6,7),mat(0x24160e),0,.07,0);lg.rotation.set(Math.PI/2,0,i*2.09);fire.add(lg)}
  var flames=[];[[.15,.62,0xff4a12],[.11,.5,0xff8a22],[.07,.36,0xffd66a]].forEach(function(f){
    var fl=new T.Mesh(new T.ConeGeometry(f[0],f[1],7),new T.MeshBasicMaterial({color:f[2],transparent:true,opacity:.7,fog:false,blending:T.AdditiveBlending,depthWrite:false}));fl.position.y=.1+f[1]/2;fire.add(fl);flames.push(fl)});
  var fglow=new T.Sprite(new T.SpriteMaterial({map:glowTexture("rgba(255,140,50,.6)","rgba(255,120,40,0)"),depthWrite:false,blending:T.AdditiveBlending}));fglow.scale.set(2.4,2.4,1);fglow.position.y=.4;fire.add(fglow);
  var EN=36,ep=new Float32Array(EN*3),es=[];for(i=0;i<EN;i++)es.push({t:Math.random(),x:(Math.random()-.5)*.3,z:(Math.random()-.5)*.3,v:.5+Math.random()*.7});
  var egeo=new T.BufferGeometry();egeo.setAttribute("position",new T.BufferAttribute(ep,3));
  var embers=new T.Points(egeo,new T.PointsMaterial({color:0xffa040,size:.045,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false}));fire.add(embers);

  // fireflies
  var FN=46,fp=new Float32Array(FN*3),fs=[];for(i=0;i<FN;i++)fs.push({x:(Math.random()-.5)*14,y:.3+Math.random()*1.6,z:-6+Math.random()*9,p:Math.random()*6.28,s:.3+Math.random()*.6});
  var fgeo=new T.BufferGeometry();fgeo.setAttribute("position",new T.BufferAttribute(fp,3));
  scene.add(new T.Points(fgeo,new T.PointsMaterial({color:0x9dffb0,size:.06,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false})));

  // hunter, bedroll
  var J=buildHunter(),holder=group();holder.add(J.av);scene.add(holder);
  var bed=group();bed.add(mesh(new T.BoxGeometry(.78,.05,1.95),mat(0x3a1f1f),0,.025,.03));
  var pillow=mesh(new T.CylinderGeometry(.11,.11,.5,10),mat(0x4a3324),0,.09,-.86);pillow.rotation.z=Math.PI/2;bed.add(pillow);
  bed.add(mesh(new T.BoxGeometry(.82,.03,.9),mat(0x243044),0,.24,.5));
  holder.add(bed);
  var ground2=group();scene.add(ground2);

  var pose="stand",gear={},shape=null;
  function applyGear(g){
    gear=g||{};
    [J.helmet,J.chestGear,J.bellyGear,J.back,J.weapon,J.armL.pauldron,J.armR.pauldron,J.armL.gauntlet,J.armR.gauntlet,J.legL.boot,J.legR.boot].forEach(clear);
    if(gear.helmet)J.helmet.add(buildHelmet(gear.helmet.tier,gear.helmet.color));
    J.hair.visible=!gear.helmet;
    if(gear.chest)buildChest(gear.chest.tier,gear.chest.color,J);
    if(gear.gauntlets)buildGauntlets(gear.gauntlets.tier,gear.gauntlets.color,J);
    if(gear.boots)buildBoots(gear.boots.tier,gear.boots.color,J);
    shape=gear.weapon?gear.weapon.shape:null;
    if(gear.weapon){J.weapon.add(buildWeapon(shape,gear.weapon.tier,gear.weapon.color));if(shape==="bow")J.back.add(buildQuiver(gear.weapon.tier,gear.weapon.color))}
    placeWeapon();
  }
  function placeWeapon(){
    var w=J.weapon;if(w.parent)w.parent.remove(w);
    if(!shape)return;
    if(pose==="sleep"){ground2.add(w);
      w.position.set(shape==="bow"?-.2:-.55,shape==="bow"?.03:.04,.78);w.rotation.set(Math.PI/2,0,shape==="bow"?Math.PI/2:1.75)}
    else{J.armR.hand.add(w);w.position.set(0,0,.01);
      if(shape==="halberd"){w.rotation.set(.32,0,0);w.position.set(0,-.02,0)}
      else if(shape==="bow")w.rotation.set(1.25,.35,0);
      else w.rotation.set(1.0,0,.3)}
  }
  function setPose(p){
    pose=p==="sleep"?"sleep":"stand";var L=J.armL,R=J.armR;
    [L.sh,L.el,R.sh,R.el,J.legL.hip,J.legL.knee,J.legR.hip,J.legR.knee,J.head,J.torso,J.hips].forEach(function(o){o.rotation.set(0,0,0)});
    if(pose==="sleep"){
      holder.rotation.y=1.3;holder.position.set(0,0,0);J.av.rotation.x=-Math.PI/2;J.av.position.set(0,.17,.9);
      L.sh.rotation.set(-.55,0,-.3);L.el.rotation.set(-1.5,0,0);R.sh.rotation.set(0,0,-.32);R.el.rotation.set(-.2,0,0);
      J.legL.hip.rotation.x=-.62;J.legL.knee.rotation.x=1.1;J.legR.hip.rotation.z=-.08;J.head.rotation.z=.22;J.head.rotation.x=-.12;
      J.eyes.forEach(function(e){e.scale.y=.18});bed.visible=true;
    }else{
      holder.rotation.y=-.25;holder.position.set(0,0,0);J.av.rotation.x=0;J.av.position.set(0,0,0);
      L.sh.rotation.z=.11;L.el.rotation.x=-.22;R.sh.rotation.set(-.2,0,-.12);R.el.rotation.x=-.5;
      if(shape==="halberd"){R.sh.rotation.set(-.55,0,-.2);R.el.rotation.x=-1.1}
      if(shape==="bow"){R.sh.rotation.set(-.35,0,-.25);R.el.rotation.x=-.9}
      J.eyes.forEach(function(e){e.scale.y=1});bed.visible=false;
    }
    placeWeapon();
  }

  // camera and input
  var az=0,azT=0,drift=0,dragging=false,sx0=0,sy0=0,moved=false,flare=0,onTap=null;
  canvas.style.touchAction="pan-y";canvas.style.cursor="grab";
  canvas.addEventListener("pointerdown",function(e){dragging=true;moved=false;sx0=e.clientX;sy0=e.clientY;canvas.style.cursor="grabbing"});
  window.addEventListener("pointermove",function(e){if(!dragging)return;var dx=e.clientX-sx0;if(Math.abs(dx)>5||Math.abs(e.clientY-sy0)>5)moved=true;
    if(moved){azT=Math.max(-1.25,Math.min(1.25,azT-dx*.008));sx0=e.clientX;drift=0}});
  function up(e){if(!dragging)return;dragging=false;canvas.style.cursor="grab";if(moved||e.type==="pointercancel")return;
    var r=canvas.getBoundingClientRect(),v=new T.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1)),rc=new T.Raycaster();rc.setFromCamera(v,cam);
    if(rc.intersectObject(fire,true).length){flare=1;return}
    if(rc.intersectObject(holder,true).length&&onTap)onTap()}
  window.addEventListener("pointerup",up);window.addEventListener("pointercancel",up);

  var active=false,raf=0,last=0,t=0;
  function frame(now){
    raf=0;if(!active)return;
    var dt=Math.min(.05,(now-last)/1000||0);last=now;t+=dt;uTime.value=t;
    var sleep=pose==="sleep",br=Math.sin(t*(sleep?1.45:2.1));
    // breathing
    J.chest.scale.set(1+br*(sleep?.012:.01),1+br*.012,1+br*(sleep?.075:.03));
    J.belly.scale.set(1,1,.78*(1+br*(sleep?.06:.012)));
    J.bellyGear.scale.z=1+br*(sleep?.05:.01);
    if(sleep){J.armL.sh.rotation.x=-.55-br*.035;J.head.rotation.z=.22+Math.sin(t*.21)*.03}
    else{J.armL.sh.position.y=J.armR.sh.position.y=.52+br*.006;J.hips.rotation.y=Math.sin(t*.45)*.06;J.torso.rotation.z=Math.sin(t*.6)*.012;
      J.head.rotation.y=Math.sin(t*.33)*.3;J.head.rotation.x=Math.sin(t*.27)*.05;
      var bl=(t%4.6)<.12?.12:1;J.eyes.forEach(function(e){e.scale.y=bl})}
    // fire
    flare=Math.max(0,flare-dt*.8);var fk=.82+Math.sin(t*11)*.1+Math.sin(t*23.7)*.08+flare*1.4;
    fireL.intensity=9*fk;fglow.scale.setScalar(2.4*(.9+fk*.18));
    flames.forEach(function(f,k){f.scale.set(1+Math.sin(t*9+k*2)*.14,fk*(1+Math.sin(t*13+k)*.1),1+Math.cos(t*8+k)*.14);f.rotation.y=t*(1.5+k)});
    for(var k=0;k<EN;k++){var em=es[k];em.t+=dt*em.v*(.5+flare);if(em.t>1){em.t=0;em.x=(Math.random()-.5)*.3;em.z=(Math.random()-.5)*.3}
      ep[k*3]=em.x+Math.sin(t*2+k)*.08*em.t;ep[k*3+1]=.2+em.t*(1.6+flare*1.5);ep[k*3+2]=em.z+Math.cos(t*1.7+k)*.08*em.t}
    egeo.attributes.position.needsUpdate=true;
    for(k=0;k<FN;k++){var ff=fs[k];fp[k*3]=ff.x+Math.sin(t*ff.s+ff.p)*.9;fp[k*3+1]=ff.y+Math.sin(t*ff.s*1.7+ff.p)*.35;fp[k*3+2]=ff.z+Math.cos(t*ff.s*.8+ff.p)*.9}
    fgeo.attributes.position.needsUpdate=true;
    runes.forEach(function(m,k){m.opacity=.45+Math.sin(t*1.3+k*2)*.4});
    // camera
    if(!dragging&&!REDUCED){drift+=dt;if(drift>3)azT+=Math.sin(t*.12)*dt*.03}
    az+=(azT-az)*Math.min(1,dt*6);
    var ty=sleep?.3:1.0,rad=sleep?4.3:4.5;
    cam.position.set(Math.sin(az)*rad,ty+(sleep?1.7:.55),Math.cos(az)*rad);cam.lookAt(0,ty,0);
    renderer.render(scene,cam);
    if(!REDUCED||dragging||Math.abs(azT-az)>.002||flare>0||t<.4)raf=requestAnimationFrame(frame);
    else setTimeout(function(){if(active&&!raf)raf=requestAnimationFrame(frame)},400);
  }
  function size(){var w=canvas.clientWidth||300,hh=canvas.clientHeight||300;renderer.setSize(w,hh,false);cam.aspect=w/hh;cam.updateProjectionMatrix()}
  if(window.ResizeObserver)new ResizeObserver(function(){size();if(active&&!raf)raf=requestAnimationFrame(frame)}).observe(canvas);
  setPose("stand");
  return{
    canvas:canvas,
    setGear:applyGear,
    setPose:function(p){setPose(p);if(active&&!raf)raf=requestAnimationFrame(frame)},
    getPose:function(){return pose},
    onTap:function(fn){onTap=fn},
    setActive:function(on){on=!!on;if(on===active)return;active=on;if(on){size();last=performance.now();if(!raf)raf=requestAnimationFrame(frame)}else if(raf){cancelAnimationFrame(raf);raf=0}}
  };
}
window.HunterScene={create:create};
})();
