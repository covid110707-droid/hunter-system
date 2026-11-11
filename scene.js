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
  if(tier===1)return mat(0x7f8896,{roughness:.45,metalness:.4});
  if(tier===2)return mat(new T.Color(0x8793a6).lerp(new T.Color(color),.22),{roughness:.36,metalness:.4,emissive:color,emissiveIntensity:.05});
  if(tier===3)return mat(0x231a3a,{roughness:.5,metalness:.35,emissive:color,emissiveIntensity:.12});
  return mat(0xdcab3c,{roughness:.3,metalness:.4,emissive:0xff9d1a,emissiveIntensity:.3});
}
function trimMat(color){return mat(color,{emissive:color,emissiveIntensity:.9,roughness:.4})}
function glowTexture(inner,outer){
  var c=document.createElement("canvas");c.width=c.height=128;var x=c.getContext("2d");
  var g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,inner);g.addColorStop(1,outer);
  x.fillStyle=g;x.fillRect(0,0,128,128);return new T.CanvasTexture(c);
}

/* ---------- shaping helpers ---------- */
function crv(a,b,c,d,t){var t2=t*t,t3=t2*t;return .5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3)}
// Loft a smooth skin through elliptical cross-sections: [y, halfWidth, frontDepth, backDepth, xOffset, zOffset]
function loftGeo(secs,opt){
  opt=opt||{};var R=opt.radial||24,sub=opt.sub||5,rings=[],i,j,k,q;
  secs=secs.map(function(s){return[s[0],s[1],s[2],s[3]==null?s[2]:s[3],s[4]||0,s[5]||0]});
  for(i=0;i<secs.length-1;i++){var a=secs[Math.max(0,i-1)],b=secs[i],c=secs[i+1],d=secs[Math.min(secs.length-1,i+2)];
    for(j=0;j<sub;j++){var r=[];for(k=0;k<6;k++)r.push(crv(a[k],b[k],c[k],d[k],j/sub));rings.push(r)}}
  rings.push(secs[secs.length-1]);
  var pos=[],uv=[],idx=[],n=rings.length,up=rings[n-1][0]>rings[0][0];
  for(i=0;i<n;i++){var g=rings[i];for(q=0;q<=R;q++){var an=q/R*Math.PI*2-Math.PI/2,cs=Math.cos(an),sn=Math.sin(an);
    pos.push(g[4]+Math.max(.0005,g[1])*cs,g[0],g[5]+Math.max(.0005,sn>=0?g[2]:g[3])*sn);uv.push(q/R*(opt.ur||3),i/(n-1)*(opt.vr||3))}}
  for(i=0;i<n-1;i++)for(q=0;q<R;q++){var A=i*(R+1)+q,B=A+R+1,C=A+1,D=B+1;if(up)idx.push(A,B,C,B,D,C);else idx.push(A,C,B,B,C,D)}
  [0,n-1].forEach(function(ri,e){var g=rings[ri],ci=pos.length/3;pos.push(g[4],g[0],g[5]);uv.push(.5,e);
    for(q=0;q<R;q++){var A=ri*(R+1)+q,C=A+1;if((e===0)===up)idx.push(ci,A,C);else idx.push(ci,C,A)}});
  var geo=new T.BufferGeometry();geo.setAttribute("position",new T.Float32BufferAttribute(pos,3));geo.setAttribute("uv",new T.Float32BufferAttribute(uv,2));
  geo.setIndex(idx);geo.computeVertexNormals();return geo;
}
function loft(secs,m,opt){var e=new T.Mesh(loftGeo(secs,opt),m);e.castShadow=true;e.receiveShadow=true;return e}
function grow(secs,d){return secs.map(function(s){return[s[0],s[1]+d,s[2]+d,(s[3]==null?s[2]:s[3])+d,s[4]||0,s[5]||0]})}
var _weave=null;
function weave(){
  if(_weave)return _weave;
  var c=document.createElement("canvas");c.width=c.height=64;var x=c.getContext("2d");x.fillStyle="#e9e9e9";x.fillRect(0,0,64,64);
  for(var i=0;i<64;i+=2){x.fillStyle="rgba(0,0,0,"+(.05+Math.random()*.1)+")";x.fillRect(0,i,64,1);x.fillStyle="rgba(0,0,0,"+(.03+Math.random()*.08)+")";x.fillRect(i,0,1,64)}
  _weave=new T.CanvasTexture(c);_weave.wrapS=_weave.wrapT=T.RepeatWrapping;return _weave;
}
function cloth(color){return mat(color,{roughness:.96,map:weave()})}
function G(dx,dy,sx,sy){return Math.exp(-((dx/sx)*(dx/sx)+(dy/sy)*(dy/sy)))}
function headGeo(){
  var g=new T.SphereGeometry(1,48,40),p=g.attributes.position,col=[],i;
  var sk=new T.Color(0xd2a07e),lip=new T.Color(0xa45f55),shade=new T.Color(0x94664f),blush=new T.Color(0xc98570),beard=new T.Color(0x86705f),tmp=new T.Color();
  for(i=0;i<p.count;i++){
    var x=p.getX(i),y=p.getY(i),z=p.getZ(i),x0=x,y0=y,ax=Math.abs(x),front=z>0;
    if(y<0){var k=Math.pow(-y,1.7);x*=1-.2*k;z*=front?1-.04*k:1-.26*k}
    if(!front&&y>-.3)z*=1.07;
    if(y>.2)x*=1-.05*(y-.2);
    if(front){
      var w=Math.min(1,z*2.4),dz=0;
      dz+=.24*G(x0,y0+.1,.1,.2);dz+=.1*G(x0,y0+.24,.15,.06);
      dz+=.055*G(x0,y0-.2,.62,.07);
      dz-=.1*G(ax-.36,y0-.04,.17,.085);
      dz+=.05*G(ax-.52,y0+.16,.2,.15);
      dz+=.075*G(x0,y0+.47,.24,.065);dz-=.035*G(x0,y0+.6,.3,.045);
      dz+=.1*G(x0,y0+.84,.24,.14);
      dz-=.05*G(ax-.62,y0+.5,.16,.2);
      z+=dz*w;
    }
    p.setXYZ(i,x,y,z);
    tmp.copy(sk);
    if(front){
      tmp.lerp(shade,.4*G(ax-.36,y0-.04,.2,.1));
      tmp.lerp(blush,.35*G(ax-.5,y0+.2,.2,.14)+.3*G(x0,y0+.24,.1,.08));
      if(y0<-.3)tmp.lerp(beard,Math.min(.2,(-y0-.3)*.8));
      tmp.lerp(beard,.15*G(x0,y0+.36,.26,.05));
      tmp.lerp(lip,.9*G(x0,y0+.47,.2,.045));
    }else if(y0<-.3)tmp.lerp(beard,Math.min(.3,(-y0-.3)));
    col.push(tmp.r,tmp.g,tmp.b);
  }
  g.setAttribute("color",new T.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;
}
function hairGeo(){
  var g=new T.SphereGeometry(1,36,24,0,Math.PI*2,0,Math.PI*.66),p=g.attributes.position,i;
  for(i=0;i<p.count;i++){
    var x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(z>.15&&y<.5)y=.5+(y-.5)*.12*(1-Math.min(1,Math.abs(x)*1.1))+(y-.5)*Math.min(1,Math.abs(x)*1.1)*.75;
    var n=1+.035*Math.sin(x*23+y*17)*Math.cos(z*19+y*11)+.02*Math.sin(z*41+x*7);
    p.setXYZ(i,x*n,y*n,z*n);
  }
  g.computeVertexNormals();return g;
}
var SH={
  tunic:[[-.27,.2,.128,.142],[-.1,.186,.126,.136],[.02,.18,.116,.12],[.11,.166,.108,.102],[.24,.17,.113,.106],[.36,.184,.13,.117],[.46,.192,.138,.12],[.53,.186,.124,.115],[.58,.16,.102,.104],[.612,.125,.084,.09],[.635,.094,.074,.08]],
  neck:[[.5,.11,.075,.085],[.61,.085,.07,.076],[.655,.068,.063,.07],[.73,.064,.063,.07]],
  pelvis:[[-.17,.1,.085,.09],[-.06,.172,.108,.118],[.06,.172,.105,.112]],
  upper:[[.02,.056,.058],[-.08,.055,.061],[-.2,.046,.05],[-.3,.04,.042]],
  fore:[[0,.041,.043],[-.07,.045,.044],[-.18,.034,.033],[-.265,.027,.023]],
  thigh:[[.03,.088,.092,.096],[-.12,.088,.094,.096],[-.3,.07,.074],[-.48,.057,.06]],
  shin:[[0,.056,.058],[-.11,.058,.054,.072],[-.29,.04,.044],[-.415,.034,.038]],
  shoe:[[-.075,.026,.02,.03],[-.04,.042,.026,.05],[.05,.046,.026,.045],[.13,.05,.024,.03],[.19,.034,.018,.018]]
};
function shoeMesh(m,s){var g=loftGeo(s?grow(SH.shoe,s):SH.shoe,{radial:16});g.rotateX(Math.PI/2);var e=new T.Mesh(g,m);e.castShadow=true;e.receiveShadow=true;return e}

/* ---------- the hunter ---------- */
function buildHunter(){
  var skin=mat(0xd2a07e,{roughness:.62}),hairM=mat(0x1d140e,{roughness:1}),tunic=cloth(0x4a4f66),trousers=cloth(0x262b3b),leather=mat(0x2e2118,{roughness:.8});
  var J={};
  var av=group();J.av=av;
  var hips=group(0,.95,0);av.add(hips);J.hips=hips;
  hips.add(loft(SH.pelvis,trousers));
  var torso=group();hips.add(torso);J.torso=torso;
  var chestG=group();torso.add(chestG);J.chest=chestG;
  chestG.add(loft(SH.neck,skin,{radial:20}));
  chestG.add(loft(SH.tunic,tunic,{radial:32,ur:5,vr:6}));
  var collar=mesh(new T.TorusGeometry(.088,.012,8,24),leather,0,.633,.002);collar.rotation.x=Math.PI/2;collar.scale.y=.85;chestG.add(collar);
  chestG.add(loft([[.075,.173,.115,.11],[.125,.173,.115,.11]],leather,{radial:32,sub:2}));
  chestG.add(mesh(new T.BoxGeometry(.045,.04,.012),mat(0xb9a36a,{metalness:.4,roughness:.4}),0,.1,.118));
  J.chestGear=group();chestG.add(J.chestGear);
  // head
  var head=group(0,.772,.014);torso.add(head);J.head=head;
  var face=new T.Mesh(headGeo(),new T.MeshStandardMaterial({vertexColors:true,roughness:.6}));face.scale.set(.087,.117,.104);face.castShadow=true;head.add(face);
  var white=mat(0xeeeae4,{roughness:.3}),iris=new T.MeshBasicMaterial({color:0x3a2616}),pupil=new T.MeshBasicMaterial({color:0x050505}),lids=[];
  [1,-1].forEach(function(sd){
    var eye=group(sd*.0317,.005,.079);head.add(eye);
    var ball=new T.Mesh(new T.SphereGeometry(.0122,14,10),white);eye.add(ball);
    var ir=new T.Mesh(new T.CircleGeometry(.0062,14),iris);ir.position.z=.0121;eye.add(ir);
    var pu=new T.Mesh(new T.CircleGeometry(.003,10),pupil);pu.position.z=.0124;eye.add(pu);
    var lid=new T.Mesh(new T.SphereGeometry(.0136,14,10,0,Math.PI*2,0,Math.PI*.5),skin);eye.add(lid);lids.push(lid);
    var low=new T.Mesh(new T.SphereGeometry(.0134,14,8,0,Math.PI*2,Math.PI*.72,Math.PI*.28),skin);eye.add(low);
    var brow=mesh(new T.BoxGeometry(.032,.0055,.008),hairM,sd*.0335,.0305,.095);brow.rotation.z=sd*-.14;brow.rotation.y=sd*.25;brow.castShadow=false;head.add(brow);
    var ear=mesh(new T.SphereGeometry(.021,10,8),skin,sd*.086,-.004,-.006);ear.scale.set(.45,1,.7);head.add(ear);
  });
  J.lid=function(closed){lids.forEach(function(l){l.rotation.x=closed?1.2:-.25})};J.lid(false);
  var hairG=group();head.add(hairG);J.hair=hairG;
  var hr=new T.Mesh(hairGeo(),hairM);hr.scale.set(.0935,.1235,.111);hr.position.set(0,.005,-.007);hr.castShadow=true;hairG.add(hr);
  J.helmet=group();head.add(J.helmet);
  // arms
  function arm(side){
    var sh=group(side*.188,.525,0);torso.add(sh);
    var delt=mesh(new T.SphereGeometry(.058,16,12),tunic,0,-.014,0);delt.scale.set(1,1.1,1.05);sh.add(delt);
    sh.add(loft(grow(SH.upper,.006),tunic,{radial:18}));
    var cuff=mesh(new T.TorusGeometry(.048,.008,6,18),tunic,0,-.295,0);cuff.rotation.x=Math.PI/2;sh.add(cuff);
    var el=group(0,-.3,0);sh.add(el);
    el.add(mesh(new T.SphereGeometry(.041,12,10),skin));
    el.add(loft(SH.fore,skin,{radial:18}));
    var hand=group(0,-.27,0);el.add(hand);
    var palm=mesh(new T.BoxGeometry(.07,.08,.024),skin,0,-.04,0);hand.add(palm);
    for(var f=0;f<4;f++){var fg=mesh(new T.CapsuleGeometry(.0085,.05,3,8),skin,(f-1.5)*.0185,-.105,.01);fg.rotation.x=-.4;hand.add(fg)}
    var th=mesh(new T.CapsuleGeometry(.0095,.036,3,8),skin,side*-.04,-.045,.012);th.rotation.z=side*-.6;th.rotation.x=-.3;hand.add(th);
    var grip=group(0,-.06,.02);hand.add(grip);
    var pg=group();sh.add(pg);var gg=group();el.add(gg);
    return{sh:sh,el:el,hand:grip,pauldron:pg,gauntlet:gg};
  }
  J.armL=arm(1);J.armR=arm(-1);
  function leg(side){
    var hip=group(side*.09,-.06,0);hips.add(hip);
    hip.add(loft(SH.thigh,trousers,{radial:20}));
    var knee=group(0,-.48,0);hip.add(knee);
    knee.add(mesh(new T.SphereGeometry(.052,12,10),trousers));
    knee.add(loft(SH.shin,trousers,{radial:18}));
    var shoe=shoeMesh(leather);shoe.position.set(0,-.425,.03);knee.add(shoe);
    var bg=group();knee.add(bg);
    return{hip:hip,knee:knee,boot:bg};
  }
  J.legL=leg(1);J.legR=leg(-1);
  J.back=group(0,.4,-.14);chestG.add(J.back);
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
  function shell(theta,sx,sy,sz){var e=mesh(new T.SphereGeometry(1,28,16,0,Math.PI*2,0,Math.PI*theta),m,0,.004,-.004);e.scale.set(sx,sy,sz);return e}
  if(tier===3){
    m=m.clone();m.side=T.DoubleSide;
    var hood=mesh(new T.SphereGeometry(1,28,18,Math.PI/2+.62,Math.PI*2-1.24,0,Math.PI*.8),m,0,0,-.012);hood.scale.set(.108,.139,.127);g.add(hood);
    var top=mesh(new T.SphereGeometry(1,28,10,0,Math.PI*2,0,Math.PI*.33),m,0,0,-.012);top.scale.set(.1085,.1395,.1275);g.add(top);
    var rim=mesh(new T.TorusGeometry(.084,.006,6,22,Math.PI),tr,0,.062,.096);rim.castShadow=false;g.add(rim);
    return g;
  }
  var cap=group();cap.rotation.x=-.3;g.add(cap);
  cap.add(shell(tier===0?.44:.47,.1,.133,.119));
  if(tier===1){var brim=mesh(new T.CylinderGeometry(.15,.162,.012,28),m,0,.014,-.004);brim.scale.z=1.1;cap.add(brim)}
  if(tier>=2){
    g.add(mesh(new T.BoxGeometry(.016,.085,.012),m,0,.0,.113));
    var ck=new T.BoxGeometry(.01,.11,.085);g.add(mesh(ck,m,.094,-.05,.02));g.add(mesh(ck,m,-.094,-.05,.02));
    var nape=mesh(new T.SphereGeometry(1,24,10,Math.PI,Math.PI,Math.PI*.5,Math.PI*.22),m,0,.004,-.004);nape.scale.set(.101,.133,.119);nape.material=m.clone();nape.material.side=T.DoubleSide;g.add(nape);
    var crest=mesh(new T.BoxGeometry(.01,.04,.19),tr,0,.136,-.004);crest.castShadow=false;cap.add(crest);
  }
  if(tier>=4){
    var band=mesh(new T.TorusGeometry(.104,.01,6,28),m,0,.03,-.004);band.rotation.x=Math.PI/2;band.scale.set(.93,1.1,1);cap.add(band);
    for(var i=0;i<8;i++){var a=i/8*Math.PI*2;cap.add(mesh(new T.ConeGeometry(.013,.06,5),i%2?m:tr,Math.sin(a)*.094,.07,Math.cos(a)*.11-.004))}
  }
  return g;
}
function buildChest(tier,color,J){
  var m=gearMat(tier,color),tr=trimMat(color);
  var body=SH.tunic.filter(function(s){return s[0]>=(tier>=2?-.1:.02)&&s[0]<=.59});
  J.chestGear.add(loft(grow(body,tier===0?.008:.014),m,{radial:32}));
  if(tier>=1){
    var gorget=mesh(new T.TorusGeometry(.092,.018,8,24),m,0,.628,.002);gorget.rotation.x=Math.PI/2;gorget.scale.y=.85;J.chestGear.add(gorget);
    [J.armL,J.armR].forEach(function(a,ix){
      var p=mesh(new T.SphereGeometry(.09,18,12,0,Math.PI*2,0,Math.PI*.58),m,(ix?-1:1)*.012,.014,0);p.scale.set(1.12,.92,1.12);a.pauldron.add(p);
      if(tier>=2){var p2=mesh(new T.SphereGeometry(.076,16,8,0,Math.PI*2,Math.PI*.3,Math.PI*.3),m,0,-.02,0);p2.scale.set(1.05,1.2,1.1);a.pauldron.add(p2)}
      if(tier>=3)a.pauldron.add(mesh(new T.ConeGeometry(.02,.085,5),tr,0,.105,0));
    });
  }
  if(tier>=2){
    var gem=mesh(new T.OctahedronGeometry(.032),tr,0,.44,.152);gem.scale.z=.45;gem.castShadow=false;J.chestGear.add(gem);
    var band=loft(grow([[.085,.173,.115,.11],[.122,.173,.115,.11]],.02),tr,{radial:32,sub:2});band.castShadow=false;J.chestGear.add(band);
  }else J.chestGear.add(loft(grow([[.07,.173,.115,.11],[.13,.173,.115,.11]],.012),mat(0x241a13,{roughness:.8}),{radial:32,sub:2}));
}
function buildGauntlets(tier,color,J){
  var m=gearMat(tier,color),tr=trimMat(color);
  [J.armL,J.armR].forEach(function(a){
    a.gauntlet.add(loft([[.01,.05,.052],[-.07,.055,.054],[-.18,.043,.042],[-.255,.036,.033]],m,{radial:18}));
    a.gauntlet.add(mesh(new T.BoxGeometry(.082,.1,.036),m,0,-.318,.003));
    if(tier>=1){var cuff=mesh(new T.TorusGeometry(.053,.008,6,18),tier>=2?tr:m,0,0,0);cuff.rotation.x=Math.PI/2;cuff.castShadow=false;a.gauntlet.add(cuff)}
    if(tier>=2)for(var k=0;k<4;k++)a.gauntlet.add(mesh(new T.SphereGeometry(.011,8,6),tr,(k-1.5)*.02,-.36,.02));
  });
}
function buildBoots(tier,color,J){
  var m=gearMat(tier,color),tr=trimMat(color);
  [J.legL,J.legR].forEach(function(l){
    l.boot.add(loft([[tier>=1?-.02:-.14,tier>=1?.062:.06,.064,.07],[-.11,.062,.06,.076],[-.29,.046,.05],[-.415,.04,.044]],m,{radial:18}));
    var s=shoeMesh(m,.007);s.position.set(0,-.425,.03);l.boot.add(s);
    if(tier>=1){var kn=mesh(new T.SphereGeometry(.058,12,8,0,Math.PI*2,0,Math.PI*.5),m,0,-.005,.012);kn.rotation.x=Math.PI/2*.9;l.boot.add(kn)}
    if(tier>=2){var r=mesh(new T.TorusGeometry(.064,.007,5,16),tr,0,-.1,.004);r.rotation.x=Math.PI/2;r.castShadow=false;l.boot.add(r)}
  });
}

/* ---------- the world ---------- */
function create(){
  var canvas=document.createElement("canvas"),renderer;
  try{renderer=new T.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:"low-power"})}catch(e){return null}
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
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
  var FIRE=new T.Vector3(1.02,0,-1.35);
  var fireL=new T.PointLight(0xff7a2a,9,11,1.8);fireL.position.set(FIRE.x,.55,FIRE.z);scene.add(fireL);
  var rim=new T.DirectionalLight(0xc9d4ff,1.5);rim.position.set(1.2,2.2,6);scene.add(rim);
  var dot=glowTexture("rgba(255,255,255,1)","rgba(255,255,255,0)");

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
    var fl=new T.Mesh(new T.ConeGeometry(f[0],f[1],7),new T.MeshBasicMaterial({color:f[2],transparent:true,opacity:.42,fog:false,blending:T.AdditiveBlending,depthWrite:false}));fl.position.y=.1+f[1]/2;fire.add(fl);flames.push(fl)});
  var fglow=new T.Sprite(new T.SpriteMaterial({map:glowTexture("rgba(255,140,50,.6)","rgba(255,120,40,0)"),depthWrite:false,blending:T.AdditiveBlending}));fglow.scale.set(2.4,2.4,1);fglow.position.y=.4;fire.add(fglow);
  var EN=36,ep=new Float32Array(EN*3),es=[];for(i=0;i<EN;i++)es.push({t:Math.random(),x:(Math.random()-.5)*.3,z:(Math.random()-.5)*.3,v:.5+Math.random()*.7});
  var egeo=new T.BufferGeometry();egeo.setAttribute("position",new T.BufferAttribute(ep,3));
  var embers=new T.Points(egeo,new T.PointsMaterial({color:0xffa040,size:.07,map:dot,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false}));fire.add(embers);

  // fireflies
  var FN=46,fp=new Float32Array(FN*3),fs=[];for(i=0;i<FN;i++)fs.push({x:(Math.random()-.5)*14,y:.3+Math.random()*1.6,z:-6+Math.random()*9,p:Math.random()*6.28,s:.3+Math.random()*.6});
  var fgeo=new T.BufferGeometry();fgeo.setAttribute("position",new T.BufferAttribute(fp,3));
  scene.add(new T.Points(fgeo,new T.PointsMaterial({color:0x9dffb0,size:.1,map:dot,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false})));

  // hunter, bedroll
  var J=buildHunter(),holder=group();holder.add(J.av);scene.add(holder);
  var bed=group();bed.add(mesh(new T.BoxGeometry(.78,.05,1.95),mat(0x3a1f1f),0,.025,.03));
  var pillow=mesh(new T.CylinderGeometry(.11,.11,.5,10),mat(0x4a3324),0,.09,-.86);pillow.rotation.z=Math.PI/2;bed.add(pillow);
  holder.add(bed);
  var ground2=group();scene.add(ground2);

  var pose="stand",gear={},shape=null;
  function applyGear(g){
    gear=g||{};
    [J.helmet,J.chestGear,J.back,J.weapon,J.armL.pauldron,J.armR.pauldron,J.armL.gauntlet,J.armR.gauntlet,J.legL.boot,J.legR.boot].forEach(clear);
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
    else{J.armR.hand.add(w);w.position.set(0,0,0);
      if(shape==="halberd"){w.rotation.set(.32,0,0);w.position.set(0,-.02,0)}
      else if(shape==="bow")w.rotation.set(1.25,.35,0);
      else w.rotation.set(1.0,0,.3)}
  }
  function setPose(p){
    pose=p==="sleep"?"sleep":"stand";var L=J.armL,R=J.armR;
    [L.sh,L.el,R.sh,R.el,J.legL.hip,J.legL.knee,J.legR.hip,J.legR.knee,J.head,J.torso,J.hips].forEach(function(o){o.rotation.set(0,0,0)});
    if(pose==="sleep"){
      holder.rotation.y=1.3;holder.position.set(0,0,0);J.av.rotation.x=-Math.PI/2;J.av.position.set(0,.19,.9);
      L.sh.rotation.set(-.38,0,.12);L.el.rotation.set(-.25,0,-1.3);R.sh.rotation.set(0,0,-.32);R.el.rotation.set(-.2,0,0);
      J.legL.hip.rotation.x=-.62;J.legL.knee.rotation.x=1.1;J.legR.hip.rotation.z=-.08;J.head.rotation.z=.22;J.head.rotation.x=-.12;
      J.lid(true);bed.visible=true;
    }else{
      holder.rotation.y=-.25;holder.position.set(0,0,0);J.av.rotation.x=0;J.av.position.set(0,0,0);
      L.sh.rotation.z=.11;L.el.rotation.x=-.22;R.sh.rotation.set(-.2,0,-.12);R.el.rotation.x=-.5;
      if(shape==="halberd"){R.sh.rotation.set(-.55,0,-.2);R.el.rotation.x=-1.1}
      if(shape==="bow"){R.sh.rotation.set(-.35,0,-.25);R.el.rotation.x=-.9}
      J.lid(false);bed.visible=false;
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
    J.chest.scale.set(1+br*.008,1,1+br*(sleep?.07:.028));
    if(sleep){J.armL.sh.rotation.x=-.38-br*.03;J.head.rotation.z=.22+Math.sin(t*.21)*.03}
    else{J.armL.sh.position.y=J.armR.sh.position.y=.525+br*.005;J.hips.rotation.y=Math.sin(t*.45)*.06;J.torso.rotation.z=Math.sin(t*.6)*.012;
      J.head.rotation.y=Math.sin(t*.33)*.3;J.head.rotation.x=Math.sin(t*.27)*.05;
      J.lid((t%4.6)<.13)}
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
    var ty=sleep?.3:1.02,rad=sleep?3.9:3.55;
    cam.position.set(Math.sin(az)*rad,ty+(sleep?1.6:.42),Math.cos(az)*rad);cam.lookAt(0,ty,0);
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
