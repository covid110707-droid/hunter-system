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
  if(tier<=0)return mat(0x5c3d24,{roughness:.86});
  if(tier===1)return mat(0x7a838f,{roughness:.5,metalness:.85,envMapIntensity:1.4});
  if(tier===2)return mat(new T.Color(0xb4bdca).lerp(new T.Color(color),.08),{roughness:.3,metalness:.95,envMapIntensity:1.6});
  if(tier===3)return mat(0x4a4458,{roughness:.36,metalness:.92,envMapIntensity:1.7,emissive:color,emissiveIntensity:.04});
  return mat(0xd9b35c,{roughness:.26,metalness:1,envMapIntensity:1.7});
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
  var g=new T.SphereGeometry(1,52,44),p=g.attributes.position,col=[],i;
  var sk=new T.Color(0xcf9c78),lip=new T.Color(0xa0665a),shade=new T.Color(0x8a5c46),blush=new T.Color(0xc48468),beard=new T.Color(0x35271f),tmp=new T.Color();
  for(i=0;i<p.count;i++){
    var x=p.getX(i),y=p.getY(i),z=p.getZ(i),x0=x,y0=y,ax=Math.abs(x),front=z>0;
    // square jaw: keep the width down to the jaw line, then cut in to a broad chin
    if(y<0){var k=Math.pow(-y,2.2);x*=1-.3*k;z*=front?1-.02*k:1-.24*k}
    x*=1+.07*G(0,y0+.52,1,.16);
    if(!front&&y>-.3)z*=1.07;
    if(y>.2)x*=1-.06*(y-.2);
    if(front){
      var w=Math.min(1,z*2.4),dz=0;
      dz+=.27*G(x0,y0+.08,.085,.22);dz+=.1*G(x0,y0+.25,.14,.055);
      dz+=.095*G(x0,y0-.19,.66,.065);
      dz-=.13*G(ax-.36,y0-.03,.17,.08);
      dz+=.08*G(ax-.56,y0+.1,.2,.13);
      dz-=.11*G(ax-.58,y0+.42,.16,.2);
      dz+=.03*G(x0,y0+.47,.2,.045);dz-=.035*G(x0,y0+.6,.3,.045);
      dz+=.15*G(x0,y0+.84,.27,.14);
      dz+=.05*G(ax-.62,y0+.62,.16,.12);
      z+=dz*w;
    }
    p.setXYZ(i,x,y,z);
    tmp.copy(sk);
    if(front){
      tmp.lerp(shade,.5*G(ax-.36,y0-.03,.2,.1));
      tmp.lerp(blush,.3*G(ax-.52,y0+.16,.2,.14)+.25*G(x0,y0+.25,.1,.08));
      tmp.lerp(shade,.55*G(ax-.58,y0+.42,.16,.2));
      var jaw=y0<-.3?Math.min(1,(-y0-.3)*3.2):0,mous=G(x0,y0+.365,.3,.045),side=Math.min(1,Math.max(0,(ax-.3)*2.2));
      var stub=Math.max(jaw*(0.55+.45*side),mous*.9)*(1-.9*G(x0,y0+.47,.17,.04));
      tmp.lerp(beard,Math.min(.72,stub*.72));
      tmp.lerp(lip,.6*G(x0,y0+.47,.17,.04));
    }else if(y0<-.3)tmp.lerp(beard,Math.min(.6,(-y0-.3)*1.6));
    col.push(tmp.r,tmp.g,tmp.b);
  }
  g.setAttribute("color",new T.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;
}
var _streak=null;
function streakTex(){
  if(_streak)return _streak;
  var c=document.createElement("canvas");c.width=c.height=128;var x=c.getContext("2d");x.fillStyle="#8c8c8c";x.fillRect(0,0,128,128);
  for(var i=0;i<128;i++){var v=70+Math.random()*150|0;x.fillStyle="rgb("+v+","+v+","+v+")";x.fillRect(i,0,1,128)}
  _streak=new T.CanvasTexture(c);_streak.wrapS=_streak.wrapT=T.RepeatWrapping;_streak.repeat.set(3,1);return _streak;
}
function buildHair(){
  var g=group(),RX=.09,RY=.124,RZ=.11,cols=[0x2b1c11,0x33221a,0x241710,0x3d2a1c,0x1e130c];
  var cap=new T.Mesh(new T.SphereGeometry(1,36,24,0,Math.PI*2,0,Math.PI*.62),mat(0x2b1c11,{roughness:.9,map:streakTex()}));
  var p=cap.geometry.attributes.position,i;
  for(i=0;i<p.count;i++){var x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(z>.15&&y<.5)y=.5+(y-.5)*.1*(1-Math.min(1,Math.abs(x)*1.1))+(y-.5)*Math.min(1,Math.abs(x)*1.1)*.7;p.setXYZ(i,x,y,z)}
  cap.geometry.computeVertexNormals();cap.scale.set(RX,RY,RZ);cap.position.set(0,.004,-.007);cap.castShadow=true;g.add(cap);
  // individual locks swept up and back from the hairline
  var up=new T.Vector3(0,1,0),d=new T.Vector3(),q=new T.Quaternion(),mats=cols.map(function(c){return mat(c,{roughness:.85})});
  var seed=7;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647}
  for(i=0;i<230;i++){
    var phi=(rnd()-.5)*Math.PI*2,el=.1+rnd()*1.25,front=Math.cos(phi)*Math.sin(el);
    var px=Math.sin(phi)*Math.sin(el)*RX,py=Math.cos(el)*RY+.004,pz=front*RZ-.007;
    if(front>.1&&py<.07)continue;
    var top=Math.max(0,1-el/.9),fr=Math.max(0,front),len=.022+.03*top+.045*fr+rnd()*.012;
    var lk=new T.Mesh(new T.ConeGeometry(.011+.008*rnd(),len,5),mats[i%mats.length]);lk.geometry.translate(0,len/2,0);
    d.set(px*5,.25+fr*1.1+top*.25-(el>1?.9:0),-1.2+fr*.4).normalize();
    q.setFromUnitVectors(up,d);lk.quaternion.copy(q);lk.rotateY(rnd()*3);
    lk.scale.set(1.5,1,.8);lk.position.set(px,py,pz);lk.castShadow=true;g.add(lk);
  }
  return g;
}
var SH={
  tunic:[[-.2,.186,.122,.136],[-.1,.18,.118,.13],[.02,.166,.108,.114],[.11,.152,.1,.098],[.24,.166,.114,.106],[.36,.198,.14,.122],[.46,.214,.152,.128],[.53,.2,.134,.12],[.575,.166,.104,.106],[.618,.116,.084,.092]],
  neck:[[.48,.19,.118,.114],[.56,.158,.1,.104],[.615,.112,.084,.092],[.66,.078,.072,.08],[.74,.072,.07,.078]],
  pelvis:[[-.17,.1,.085,.09],[-.06,.176,.11,.12],[.06,.17,.105,.112]],
  upper:[[.02,.064,.066],[-.09,.067,.074],[-.2,.055,.058],[-.3,.046,.048]],
  fore:[[0,.047,.049],[-.07,.054,.051],[-.18,.039,.037],[-.265,.03,.026]],
  thigh:[[.03,.094,.098,.1],[-.12,.097,.106,.1],[-.3,.077,.084,.076],[-.48,.06,.062]],
  shin:[[0,.058,.06],[-.11,.062,.056,.082],[-.29,.042,.046],[-.415,.035,.039]],
  shoe:[[-.075,.026,.02,.03],[-.04,.042,.026,.05],[.05,.046,.026,.045],[.13,.05,.024,.03],[.19,.034,.018,.018]]
};
function shoeMesh(m,s){var g=loftGeo(s?grow(SH.shoe,s):SH.shoe,{radial:16});g.rotateX(Math.PI/2);var e=new T.Mesh(g,m);e.castShadow=true;e.receiveShadow=true;return e}
function bulge(parent,m,x,y,z,sx,sy,sz,rz){var e=mesh(new T.SphereGeometry(1,16,12),m,x,y,z);e.scale.set(sx,sy,sz);if(rz)e.rotation.z=rz;parent.add(e);return e}

/* ---------- the hunter ---------- */
function buildHunter(){
  var skin=mat(0xcf9c78,{roughness:.58}),tunic=cloth(0x2c3850),trousers=cloth(0x221f25),leather=mat(0x33241a,{roughness:.8});
  var J={};
  var av=group();J.av=av;
  var hips=group(0,.95,0);av.add(hips);J.hips=hips;
  hips.add(loft(SH.pelvis,trousers));
  var torso=group();hips.add(torso);J.torso=torso;
  var chestG=group();torso.add(chestG);J.chest=chestG;
  chestG.add(loft(SH.neck,skin,{radial:24}));
  chestG.add(loft(SH.tunic,tunic,{radial:32,ur:5,vr:6}));
  [1,-1].forEach(function(sd){
    bulge(chestG,skin,sd*.085,.612,-.02,.075,.036,.06,sd*-.5);            // traps
  });
  chestG.add(loft([[.03,.166,.11,.116],[.16,.156,.104,.101]],cloth(0x1b1a22),{radial:32,sub:2}));
  chestG.add(loft([[.075,.17,.113,.118],[.125,.168,.112,.114]],leather,{radial:32,sub:2}));
  chestG.add(mesh(new T.BoxGeometry(.05,.045,.012),mat(0xb9a36a,{metalness:.8,roughness:.35}),0,.1,.118));
  var strap=mesh(new T.BoxGeometry(.034,.44,.012),leather,.0,.37,.136);strap.rotation.z=.6;strap.rotation.x=-.08;chestG.add(strap);J.strap=strap;
  J.chestGear=group();chestG.add(J.chestGear);
  // head
  var head=group(0,.772,.014);torso.add(head);J.head=head;
  var face=new T.Mesh(headGeo(),new T.MeshStandardMaterial({vertexColors:true,roughness:.58}));face.scale.set(.086,.119,.105);face.castShadow=true;head.add(face);
  var white=mat(0xe9e5de,{roughness:.3}),iris=new T.MeshBasicMaterial({color:0x4a6a7a}),pupil=new T.MeshBasicMaterial({color:0x050505}),browM=mat(0x21150d,{roughness:.9}),lids=[];
  [1,-1].forEach(function(sd){
    var eye=group(sd*.031,.0045,.078);head.add(eye);
    eye.add(new T.Mesh(new T.SphereGeometry(.0122,14,10),white));
    var ir=new T.Mesh(new T.CircleGeometry(.0062,14),iris);ir.position.z=.0121;eye.add(ir);
    var pu=new T.Mesh(new T.CircleGeometry(.003,10),pupil);pu.position.z=.0124;eye.add(pu);
    var lid=new T.Mesh(new T.SphereGeometry(.0138,14,10,0,Math.PI*2,0,Math.PI*.5),skin);eye.add(lid);lids.push(lid);
    eye.add(new T.Mesh(new T.SphereGeometry(.0135,14,8,0,Math.PI*2,Math.PI*.7,Math.PI*.3),skin));
    var brow=mesh(new T.BoxGeometry(.04,.009,.012),browM,sd*.0325,.0235,.098);brow.rotation.z=sd*.2;brow.rotation.y=sd*.28;brow.castShadow=false;head.add(brow);
    var ear=mesh(new T.SphereGeometry(.021,10,8),skin,sd*.086,-.004,-.006);ear.scale.set(.45,1,.7);head.add(ear);
  });
  J.lid=function(closed){lids.forEach(function(l){l.rotation.x=closed?1.2:.02})};J.lid(false);
  J.hair=buildHair();head.add(J.hair);
  J.helmet=group();head.add(J.helmet);
  // arms: bare, with deltoid, biceps, triceps and forearm shape
  function arm(side){
    var sh=group(side*.204,.522,0);torso.add(sh);
    bulge(sh,skin,side*.006,-.012,0,.072,.082,.074);
    sh.add(loft(SH.upper,skin,{radial:20}));
    bulge(sh,skin,0,-.115,.03,.042,.085,.042);
    bulge(sh,skin,0,-.13,-.032,.044,.095,.04);
    var band=mesh(new T.TorusGeometry(.061,.008,6,18),leather,0,-.2,0);band.rotation.x=Math.PI/2;sh.add(band);
    var el=group(0,-.3,0);sh.add(el);
    el.add(mesh(new T.SphereGeometry(.046,12,10),skin));
    el.add(loft(SH.fore,skin,{radial:18}));
    bulge(el,skin,side*.012,-.075,.012,.034,.075,.034);
    el.add(loft(grow(SH.fore.slice(2),.005),leather,{radial:18}));
    var hand=group(0,-.27,0);el.add(hand);
    hand.add(mesh(new T.BoxGeometry(.076,.084,.027),skin,0,-.04,0));
    for(var f=0;f<4;f++){var fg=mesh(new T.CapsuleGeometry(.0092,.05,3,8),skin,(f-1.5)*.02,-.105,.01);fg.rotation.x=-.4;hand.add(fg)}
    var th=mesh(new T.CapsuleGeometry(.0102,.036,3,8),skin,side*-.043,-.045,.012);th.rotation.z=side*-.6;th.rotation.x=-.3;hand.add(th);
    var grip=group(0,-.06,.02);hand.add(grip);
    var pg=group();sh.add(pg);var gg=group();el.add(gg);
    return{sh:sh,el:el,hand:grip,pauldron:pg,gauntlet:gg};
  }
  J.armL=arm(1);J.armR=arm(-1);
  function leg(side){
    var hip=group(side*.092,-.06,0);hips.add(hip);
    hip.add(loft(SH.thigh,trousers,{radial:20}));
    bulge(hip,trousers,side*.012,-.2,.04,.07,.16,.07);
    var knee=group(0,-.48,0);hip.add(knee);
    knee.add(mesh(new T.SphereGeometry(.056,12,10),trousers));
    knee.add(loft(SH.shin,trousers,{radial:18}));
    knee.add(loft([[-.17,.056,.058,.072],[-.29,.046,.05],[-.415,.04,.044]],leather,{radial:18}));
    var shoe=shoeMesh(leather,.004);shoe.position.set(0,-.425,.03);knee.add(shoe);
    var bg=group();knee.add(bg);var cg=group();hip.add(cg);
    return{hip:hip,knee:knee,boot:bg,cuisse:cg};
  }
  J.legL=leg(1);J.legR=leg(-1);
  J.back=group(0,.4,-.15);chestG.add(J.back);
  J.weapon=group();
  return J;
}

/* ---------- sculpted body (MakeHuman base mesh data, CC0) ---------- */
function loadBody(url){
  return fetch(url).then(function(r){if(!r.ok)throw new Error("body "+r.status);return r.arrayBuffer()}).then(function(buf){
    var n=new DataView(buf).getUint32(0,true),meta=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,n))),o=4+n,nv=meta.nv;
    function take(Type,count){var a=new Type(buf.slice(o,o+count*Type.BYTES_PER_ELEMENT));o+=count*Type.BYTES_PER_ELEMENT;return a}
    return{meta:meta,pos:take(Float32Array,nv*3),col:take(Float32Array,nv*3),uv:take(Float32Array,nv*2),si:take(Uint8Array,nv*4),sw:take(Uint8Array,nv*4),idx:take(nv<65536?Uint16Array:Uint32Array,meta.ni)};
  });
}
function buildBody(D){
  var meta=D.meta,lm=meta.lm,geo=new T.BufferGeometry(),J={kind:"body"},i;
  geo.setAttribute("position",new T.BufferAttribute(D.pos,3));geo.setAttribute("color",new T.BufferAttribute(D.col,3));geo.setAttribute("uv",new T.BufferAttribute(D.uv,2));
  geo.setAttribute("skinIndex",new T.BufferAttribute(new Uint16Array(D.si),4));geo.setAttribute("skinWeight",new T.BufferAttribute(D.sw,4,true));
  geo.setIndex(new T.BufferAttribute(D.idx,1));geo.computeVertexNormals();
  var B={},H={},R={},list=[],root=null;
  meta.bones.forEach(function(b){var bone=new T.Bone();bone.name=b.n;H[b.n]=new T.Vector3().fromArray(b.h);
    R[b.n]=new T.Vector3().fromArray(b.t).sub(H[b.n]);bone.userData.len=R[b.n].length();R[b.n].normalize();
    if(b.p){bone.position.copy(H[b.n]).sub(H[b.p]);B[b.p].add(bone)}else{bone.position.copy(H[b.n]);root=bone}
    B[b.n]=bone;list.push(bone)});
  root.updateMatrixWorld(true);
  var hidden=new T.MeshBasicMaterial({visible:false}),mats=[],partIx={};
  meta.parts.forEach(function(p,k){geo.addGroup(p.start,p.count,k);partIx[p.n]=k;mats.push(hidden)});
  mats[0]=new T.MeshStandardMaterial({vertexColors:true,roughness:.52,envMapIntensity:.5});
  var hairM=mat(0x2c1b10,{roughness:.7,map:streakTex(),side:T.DoubleSide});mats[partIx.hair]=hairM;
  function setPart(n,m){if(m)m.side=T.DoubleSide;mats[partIx[n]]=m||hidden}
  var body=new T.SkinnedMesh(geo,mats);
  body.add(root);body.bind(new T.Skeleton(list));body.frustumCulled=false;body.castShadow=true;body.receiveShadow=true;
  var av=group();av.add(body);J.av=av;J.bones=B;
  var front=new T.Vector3(0,0,1);
  function anchor(bone,at,dir,sr,sl){
    var g=group(),y=dir.clone().negate().normalize(),z=front.clone().addScaledVector(y,-front.dot(y)).normalize(),x=new T.Vector3().crossVectors(y,z);
    g.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));g.position.copy(at).sub(H[bone]);g.scale.set(sr,sl,sr);B[bone].add(g);return g;
  }
  function limb(sd){
    var s=sd>0?"_l":"_r",ua="upperarm"+s,la="lowerarm"+s,hd="hand"+s;
    var across=H["index_01"+s].clone().sub(H["pinky_01"+s]),fd=R["middle_01"+s],palm=new T.Vector3().crossVectors(across,fd).normalize();if(sd>0)palm.negate();
    var grip=anchor(hd,H[hd].clone().lerp(H["middle_01"+s],.55).addScaledVector(palm,.022),R[la],1,1);
    return{sh:B[ua],el:B[la],hand:grip,palm:palm,s:s,
      pauldron:anchor(ua,H[ua],R[ua],1.0,1),
      gauntlet:anchor(la,H[la],R[la],1.0,1)};
  }
  function lower(sd){
    var s=sd>0?"_l":"_r",th="thigh"+s,ca="calf"+s;
    return{hip:B[th],knee:B[ca],cuisse:anchor(th,H[th],R[th],1,1),boot:anchor(ca,H[ca],R[ca],1,1)};
  }
  J.armL=limb(1);J.armR=limb(-1);J.legL=lower(1);J.legR=lower(-1);
  var hipY=H.thigh_l.y,shY=H.upperarm_l.y;
  J.chestGear=group();J.chestGear.position.copy(H.spine_03).negate();B.spine_03.add(J.chestGear);
  J.waistGear=group();J.waistGear.position.copy(H.spine_01).negate();B.spine_01.add(J.waistGear);
  J.back=group(0,shY-.14,-lm.chest[2]-.05);J.back.position.sub(H.spine_03);B.spine_03.add(J.back);J.strap={visible:false};
  // head: eyes with lids, brows, hair, helmet frame
  var skin=mat(0xb98466,{roughness:.55}),white=mat(0xcfc8be,{roughness:.3}),iris=new T.MeshBasicMaterial({color:0x2c4654}),pupil=new T.MeshBasicMaterial({color:0x050505}),browM=mat(0x21150d,{roughness:.9}),lids=[],r=lm.eyeR;
  [1,-1].forEach(function(sd){
    var eye=group(sd*lm.eye[0],lm.eye[1],lm.eye[2]);eye.position.sub(H.head);B.head.add(eye);
    eye.add(new T.Mesh(new T.SphereGeometry(r,16,12),white));
    var ir=new T.Mesh(new T.CircleGeometry(r*.54,16),iris);ir.position.z=r*.985;eye.add(ir);
    var pu=new T.Mesh(new T.CircleGeometry(r*.24,12),pupil);pu.position.z=r*1.0;eye.add(pu);
    var lid=new T.Mesh(new T.SphereGeometry(r*1.1,16,10,0,Math.PI*2,0,Math.PI*.5),skin);eye.add(lid);lids.push(lid);
  });
  J.lid=function(closed){lids.forEach(function(l){l.rotation.x=closed?1.25:-.32})};J.lid(false);
  var cz=(lm.skullF-.022+lm.skullB)/2,hz=(lm.skullF-.022-lm.skullB)/2,topH=lm.top-lm.eye[1];
  J.hair={};Object.defineProperty(J.hair,"visible",{set:function(v){mats[partIx.hair]=v?hairM:hidden},get:function(){return mats[partIx.hair]===hairM}});
  J.helmet=group();J.helmet.scale.set(lm.skullX*1.08/.086,1.02,hz*1.13/.105);J.helmet.position.set(0,lm.eye[1]-.02,cz+.004).sub(H.head);B.head.add(J.helmet);
  J.weapon=group();
  var q=new T.Quaternion(),pq=new T.Quaternion(),v=new T.Vector3();
  function aim(name,x,y,z){
    var bone=B[name],p=bone.parent;pq.identity();while(p&&p.isBone){pq.premultiply(p.quaternion);p=p.parent}
    v.set(x,y,z).normalize().applyQuaternion(pq.invert());bone.quaternion.setFromUnitVectors(R[name],v);
  }
  function curl(arm,ang){["index","middle","ring","pinky"].forEach(function(f,k){for(var n=1;n<=3;n++){var nm=f+"_0"+n+arm.s;
    v.crossVectors(R[nm],arm.palm).normalize();B[nm].quaternion.setFromAxisAngle(v,ang*(n===1?.9:1.1)*(1+k*.06))}});
    v.crossVectors(R["thumb_02"+arm.s],arm.palm).normalize();B["thumb_02"+arm.s].quaternion.setFromAxisAngle(v,ang*.5);B["thumb_03"+arm.s].quaternion.setFromAxisAngle(v,ang*.5)}
  J.pose=function(pose,shape){
    list.forEach(function(b){b.quaternion.identity();b.scale.set(1,1,1)});
    if(pose==="sleep"){
      av.rotation.x=-Math.PI/2;av.position.set(0,.115,.98);
      aim("upperarm_l",.3,-1,.3);aim("lowerarm_l",-.9,-.3,.42);aim("upperarm_r",-.34,-1,0);aim("lowerarm_r",-.2,-1,.16);
      aim("thigh_l",.1,-.8,.6);aim("calf_l",.04,-.86,-.5);aim("thigh_r",-.12,-1,0);aim("calf_r",-.1,-1,-.03);
      B.head.rotation.set(-.1,0,.2);curl(J.armL,.35);curl(J.armR,.35);
    }else{
      av.rotation.x=0;av.position.set(0,0,0);
      aim("upperarm_l",.2,-1,.03);aim("lowerarm_l",.12,-1,.24);
      if(shape==="halberd"){aim("upperarm_r",-.22,-.85,.5);aim("lowerarm_r",-.1,.08,1)}
      else if(shape==="bow"){aim("upperarm_r",-.22,-.94,.34);aim("lowerarm_r",-.1,-.31,.95)}
      else if(shape){aim("upperarm_r",-.2,-1,.2);aim("lowerarm_r",-.1,-.76,.64)}
      else{aim("upperarm_r",-.2,-1,.03);aim("lowerarm_r",-.12,-1,.24)}
      aim("thigh_l",.07,-1,.02);aim("calf_l",.035,-1,-.03);aim("thigh_r",-.07,-1,.02);aim("calf_r",-.035,-1,-.03);
      curl(J.armL,.4);curl(J.armR,shape?1.15:.4);
    }
  };
  J.dress=function(gear){
    var c=gear.chest,g=gear.gauntlets,b=gear.boots,gold=goldMat();
    function pm(x,chain){return x?(chain?chainMat():gearMat(x.tier,x.color)):null}
    setPart("cuirass",pm(c,c&&c.tier===1));setPart("skirt",c&&c.tier>=1?pm(c,c.tier===1):null);setPart("uarm",c&&c.tier>=1?pm(c,c.tier===1):null);
    setPart("thigh",c&&c.tier>=3?pm(c):null);setPart("farm",pm(g));setPart("hand",pm(g));setPart("shin",pm(b));
    if(c){
      var wy=lm.waistY,W=lm.waist;
      J.waistGear.add(loft([[wy+.028,W[0]+.024,W[1]+.026,W[2]+.026],[wy+.076,W[0]+.024,W[1]+.028,W[2]+.026]],mat(0x33241a,{roughness:.75}),{radial:32,sub:2}));
      J.waistGear.add(mesh(new T.BoxGeometry(.05,.046,.014),gold,0,wy+.052,W[1]+.03));
      if(c.tier>=1){var go=mesh(new T.TorusGeometry(.082,.017,8,24),c.tier===1?chainMat():gearMat(c.tier,c.color),0,H.neck_01.y+.012,H.neck_01.z);go.rotation.x=Math.PI/2;go.scale.y=.92;J.chestGear.add(go)}
      if(c.tier>=2){
        var gr=ring(.092,.005,gold,H.neck_01.y+.022,1,.92);gr.position.z=H.neck_01.z;J.chestGear.add(gr);
        var gem=mesh(new T.OctahedronGeometry(.028),trimMat(c.color),0,shY-.13,lm.chest[1]+.018);gem.scale.z=.45;gem.castShadow=false;J.chestGear.add(gem);
        var tab=new T.Mesh(new T.PlaneGeometry(.13,.38,2,6),cloth(new T.Color(c.color).multiplyScalar(.55)));tab.geometry.translate(0,-.19,0);
        (function(){var q=tab.geometry.attributes.position;for(var n=0;n<q.count;n++)if(q.getY(n)<-.31)q.setX(n,q.getX(n)*.15)})();
        tab.material.side=T.DoubleSide;tab.position.set(0,wy+.04,W[1]+.036);tab.rotation.x=-.1;tab.castShadow=true;J.waistGear.add(tab);J.tabard=tab;
        var cg=new T.PlaneGeometry(.42,1.02,8,14);cg.translate(0,-.51,0);
        var cm=cloth(c.tier>=4?0x6a1019:new T.Color(c.color).multiplyScalar(.5));cm.side=T.DoubleSide;
        var cape=new T.Mesh(cg,cm);cape.position.set(0,shY+.03,-lm.chest[2]-.035);cape.castShadow=true;J.chestGear.add(cape);cape.userData.base=Float32Array.from(cg.attributes.position.array);J.cape=cape;
        J.chestGear.add(mesh(new T.BoxGeometry(.34,.028,.028),gold,0,shY+.03,-lm.chest[2]-.02));
        [J.armL,J.armR].forEach(function(a,ix){var sd=ix?-1:1,big=c.tier>=4?1.16:1,m=gearMat(c.tier,c.color);
          var p=mesh(new T.SphereGeometry(.098*big,20,12,0,Math.PI*2,0,Math.PI*.56),m,sd*.012,.02,0);p.scale.set(1.14,.9,1.14);a.pauldron.add(p);
          var p2=mesh(new T.SphereGeometry(.09*big,18,8,0,Math.PI*2,Math.PI*.3,Math.PI*.3),m,sd*.01,-.028,0);p2.scale.set(1.08,1.25,1.12);p2.material=m.clone();p2.material.side=T.DoubleSide;a.pauldron.add(p2);
          var tr=ring(.095*big,.006,gold,.014,1.14,1.14);tr.position.x=sd*.012;a.pauldron.add(tr);
          if(c.tier>=3)a.pauldron.add(mesh(new T.ConeGeometry(.02,.09,5),gold,sd*.02,.105,0))});
      }
    }
    if(g)[J.armL,J.armR].forEach(function(a){var m=gearMat(g.tier,g.color);
      if(g.tier>=1){var cop=mesh(new T.SphereGeometry(.05,12,10),m,0,0,-.016);a.gauntlet.add(cop)}
      if(g.tier>=2){a.gauntlet.add(ring(.052,.005,gold,-.03));a.gauntlet.add(ring(.034,.005,gold,-.25))}});
    if(b)[J.legL,J.legR].forEach(function(l){var m=gearMat(b.tier,b.color);
      if(b.tier>=1){var kn=mesh(new T.SphereGeometry(.058,14,10),m,0,0,.022);kn.scale.set(1,1.05,.8);l.boot.add(kn)}
      if(b.tier>=2){l.boot.add(ring(.056,.005,gold,-.05,1,1.05));var fin=mesh(new T.ConeGeometry(.026,.065,4),gold,0,.03,.066);fin.rotation.x=.6;l.boot.add(fin)}});
  };
  J.tick=function(t,sleep,br){
    var sx=1+br*.01,sz=1+br*(sleep?.05:.022);B.spine_03.scale.set(sx,1,sz);
    [B.neck_01,B.clavicle_l,B.clavicle_r].forEach(function(b){b.scale.set(1/sx,1,1/sz)});
    if(sleep){B.head.rotation.z=.2+Math.sin(t*.21)*.03}
    else{B.spine_01.rotation.y=Math.sin(t*.45)*.05;B.spine_02.rotation.z=Math.sin(t*.6)*.012;B.head.rotation.set(Math.sin(t*.27)*.05,Math.sin(t*.33)*.3,0);J.lid((t%4.6)<.13)}
  };
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
/* ---------- armour ---------- */
var _chain=null,_noise=null;
function chainTex(){
  if(_chain)return _chain;
  var c=document.createElement("canvas");c.width=c.height=32;var x=c.getContext("2d");x.fillStyle="#555b66";x.fillRect(0,0,32,32);
  x.strokeStyle="#c9d0da";x.lineWidth=2;
  for(var r=0;r<4;r++)for(var q=0;q<4;q++){x.beginPath();x.arc(q*8+(r%2?4:0),r*8+4,3,0,Math.PI*2);x.stroke()}
  _chain=new T.CanvasTexture(c);_chain.wrapS=_chain.wrapT=T.RepeatWrapping;return _chain;
}
function noiseTex(){
  if(_noise)return _noise;
  var c=document.createElement("canvas");c.width=c.height=64;var x=c.getContext("2d"),d=x.createImageData(64,64);
  for(var i=0;i<d.data.length;i+=4){var v=150+Math.random()*90;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}
  x.putImageData(d,0,0);_noise=new T.CanvasTexture(c);_noise.wrapS=_noise.wrapT=T.RepeatWrapping;return _noise;
}
function goldMat(){return mat(0xcfa64e,{metalness:1,roughness:.3,envMapIntensity:1.6})}
function chainMat(){return mat(0x9aa3b0,{metalness:.8,roughness:.55,map:chainTex(),envMapIntensity:1.3})}
function ring(r,tube,m,y,sx,sz){var e=mesh(new T.TorusGeometry(r,tube,6,28),m,0,y,0);e.rotation.x=Math.PI/2;e.scale.set(sx||1,sz||1,1);e.castShadow=false;return e}
function buildHelmet(tier,color,J){
  var g=group(),m=gearMat(tier,color),gold=goldMat();
  function part(phi0,phiL,th0,thL,mm,s){var mt=(mm||m).clone();mt.side=T.DoubleSide;var e=mesh(new T.SphereGeometry(1,30,18,phi0,phiL,th0,thL),mt,0,.004,-.004);e.scale.set(.1*(s||1),.133*(s||1),.119*(s||1));return e}
  if(tier===3){
    var cm=cloth(0x1c1a2a);cm.side=T.DoubleSide;
    var hood=mesh(new T.SphereGeometry(1,28,18,Math.PI/2+.62,Math.PI*2-1.24,0,Math.PI*.8),cm,0,0,-.012);hood.scale.set(.108,.139,.127);g.add(hood);
    var top=mesh(new T.SphereGeometry(1,28,10,0,Math.PI*2,0,Math.PI*.33),cm,0,0,-.012);top.scale.set(.1085,.1395,.1275);g.add(top);
    var rim=mesh(new T.TorusGeometry(.084,.006,6,22,Math.PI),trimMat(color),0,.062,.096);rim.castShadow=false;g.add(rim);
    var mask=part(Math.PI/2-.62,1.24,Math.PI*.5,Math.PI*.3,gearMat(3,color),.9);g.add(mask);
    return g;
  }
  var cap=group();cap.rotation.x=-.3;g.add(cap);
  if(tier===0){cap.add(part(0,Math.PI*2,0,Math.PI*.44));return g}
  if(tier===1){
    cap.add(part(0,Math.PI*2,0,Math.PI*.47));
    var brim=mesh(new T.CylinderGeometry(.15,.162,.012,28),m,0,.014,-.004);brim.scale.z=1.1;cap.add(brim);
    g.add(part(Math.PI/2+.7,Math.PI*2-1.4,Math.PI*.3,Math.PI*.52,chainMat(),1.02));
    return g;
  }
  // closed helms: skull, visor with eye slit, neck guard
  g.add(part(0,Math.PI*2,0,Math.PI*.5,m,1.03));
  g.add(part(Math.PI/2+.75,Math.PI*2-1.5,Math.PI*.5,Math.PI*.3,m,1.03));
  var visor=part(Math.PI/2-.75,1.5,Math.PI*.44,Math.PI*.36,m,1.1);visor.position.z=.004;g.add(visor);
  for(var b=0;b<5;b++){var br=mesh(new T.BoxGeometry(.006,.034,.02),new T.MeshBasicMaterial({color:0x040506}),(b-2)*.017,-.05,.124-Math.abs(b-2)*.006);br.castShadow=false;g.add(br)}
  var slit=mesh(new T.BoxGeometry(.11,.008,.03),new T.MeshBasicMaterial({color:0x040506}),0,.012,.112);slit.castShadow=false;g.add(slit);
  g.add(ring(.107,.005,gold,.052,.96,1.14));
  var comb=mesh(new T.BoxGeometry(.012,.03,.2),tier>=4?gold:m,0,.134,-.004);g.add(comb);
  if(tier>=4){
    for(var i=0;i<8;i++){var a=i/8*Math.PI*2;g.add(mesh(new T.ConeGeometry(.012,.05,5),gold,Math.sin(a)*.1,.075,Math.cos(a)*.12-.004))}
    g.add(ring(.108,.009,gold,.05,.94,1.12));
  }
  var plume=mesh(new T.ConeGeometry(.03,tier>=4?.26:.16,7),cloth(color),0,.2,-.07);plume.rotation.x=-.9;plume.castShadow=false;g.add(plume);J.plume=plume;
  return g;
}
function buildChest(tier,color,J){
  var m=gearMat(tier,color),gold=goldMat(),steel=tier>=2;
  var body=SH.tunic.filter(function(s){return s[0]>=(tier===1?-.27:.02)&&s[0]<=.63});
  if(tier===1){
    J.chestGear.add(loft(grow(body,.01),chainMat(),{radial:32,ur:22,vr:26}));
    J.chestGear.add(loft(grow([[.07,.173,.115,.11],[.13,.173,.115,.11]],.018),mat(0x2a1d14,{roughness:.8}),{radial:32,sub:2}));
    [J.armL,J.armR].forEach(function(a){a.pauldron.add(loft(grow(SH.upper,.012),chainMat(),{radial:18,ur:10,vr:10}))});
    return;
  }
  J.chestGear.add(loft(grow(body,tier===0?.008:.016),m,{radial:32}));
  if(tier===0){
    J.chestGear.add(loft(grow([[.07,.173,.115,.11],[.13,.173,.115,.11]],.014),mat(0x241a13,{roughness:.8}),{radial:32,sub:2}));
    [.3,.42].forEach(function(y){var st=mesh(new T.BoxGeometry(.3,.018,.01),mat(0x241a13),0,y,.138);st.castShadow=false;J.chestGear.add(st)});
    return;
  }
  // plate: ridge, gorget, faulds, layered pauldrons, tabard, cape
  var ridge=mesh(new T.BoxGeometry(.014,.4,.02),m,0,.33,.15);ridge.rotation.x=-.06;J.chestGear.add(ridge);
  var gorget=mesh(new T.TorusGeometry(.092,.022,8,24),m,0,.628,.002);gorget.rotation.x=Math.PI/2;gorget.scale.y=.85;J.chestGear.add(gorget);
  J.chestGear.add(ring(.1,.006,gold,.645,1,.85));
  J.chestGear.add(loft(grow([[.085,.173,.115,.11],[.125,.173,.115,.11]],.024),mat(0x3a2718,{roughness:.7}),{radial:32,sub:2}));
  J.chestGear.add(mesh(new T.BoxGeometry(.05,.05,.014),gold,0,.105,.142));
  for(var k=0;k<3;k++){
    var y0=.06-k*.075,d=.02+k*.008;
    J.chestGear.add(loft([[y0,.172+d,.112+d,.118+d],[y0-.095,.184+d,.124+d,.132+d]],m,{radial:32,sub:2}));
    var e=ring(.19+d,.005,gold,y0-.095,1,.7);J.chestGear.add(e);
  }
  var gem=mesh(new T.OctahedronGeometry(.03),trimMat(color),0,.46,.156);gem.scale.z=.45;gem.castShadow=false;J.chestGear.add(gem);
  var tab=new T.Mesh(new T.PlaneGeometry(.13,.36,2,6),cloth(new T.Color(color).multiplyScalar(.55)));tab.geometry.translate(0,-.18,0);(function(){var q=tab.geometry.attributes.position;for(var n=0;n<q.count;n++)if(q.getY(n)<-.3)q.setX(n,q.getX(n)*.15)})();tab.material.side=T.DoubleSide;tab.position.set(0,.03,.152);tab.rotation.x=-.1;tab.castShadow=true;J.chestGear.add(tab);J.tabard=tab;
  [J.armL,J.armR].forEach(function(a,ix){
    var sd=ix?-1:1,big=tier>=4?1.18:1;
    var p=mesh(new T.SphereGeometry(.104*big,20,12,0,Math.PI*2,0,Math.PI*.56),m,sd*.014,.022,0);p.scale.set(1.14,.9,1.14);a.pauldron.add(p);
    var p2=mesh(new T.SphereGeometry(.094*big,18,8,0,Math.PI*2,Math.PI*.3,Math.PI*.3),m,sd*.01,-.03,0);p2.scale.set(1.08,1.25,1.12);a.pauldron.add(p2);
    var tr=ring(.1*big,.006,gold,.014,1.14,1.14);tr.position.x=sd*.014;a.pauldron.add(tr);
    a.pauldron.add(loft(grow(SH.upper.slice(1),.014),m,{radial:18}));
    if(tier>=3){var sp=mesh(new T.ConeGeometry(.02,.09,5),gold,sd*.02,.11,0);a.pauldron.add(sp)}
  });
  if(tier>=3)[J.legL,J.legR].forEach(function(l){
    l.cuisse.add(loft([[-.1,.104,.112,.07],[-.28,.086,.094,.06],[-.42,.07,.076,.05]],m,{radial:18}));
  });
  if(tier>=2){
    var cg=new T.PlaneGeometry(.4,1.02,8,14);cg.translate(0,-.51,0);
    var cm=cloth(tier>=4?0x6a1019:new T.Color(color).multiplyScalar(.5));cm.side=T.DoubleSide;
    var cape=new T.Mesh(cg,cm);cape.position.set(0,.585,-.13);cape.castShadow=true;J.chestGear.add(cape);
    cape.userData.base=Float32Array.from(cg.attributes.position.array);J.cape=cape;
    J.chestGear.add(mesh(new T.BoxGeometry(.36,.03,.03),gold,0,.585,-.118));
  }
}
function buildGauntlets(tier,color,J){
  var m=gearMat(tier,color),gold=goldMat();
  [J.armL,J.armR].forEach(function(a){
    a.gauntlet.add(loft([[.02,.068,.068],[-.03,.058,.058],[-.09,.063,.06],[-.2,.048,.046],[-.262,.04,.037]],m,{radial:18}));
    a.gauntlet.add(mesh(new T.BoxGeometry(.09,.104,.04),m,0,-.318,.003));
    if(tier>=1){var cop=mesh(new T.SphereGeometry(.056,12,10),m,0,.0,-.018);cop.scale.set(1,1.1,1);a.gauntlet.add(cop)}
    if(tier>=2){a.gauntlet.add(ring(.069,.005,gold,.02));a.gauntlet.add(ring(.041,.005,gold,-.262));
      for(var k=0;k<4;k++)a.gauntlet.add(mesh(new T.SphereGeometry(.011,8,6),gold,(k-1.5)*.02,-.362,.02))}
  });
}
function buildBoots(tier,color,J){
  var m=gearMat(tier,color),gold=goldMat();
  [J.legL,J.legR].forEach(function(l){
    l.boot.add(loft([[tier>=1?-.03:-.14,.068,.07,.076],[-.11,.07,.066,.09],[-.29,.05,.054],[-.415,.043,.047]],m,{radial:18}));
    var s=shoeMesh(m,.008);s.position.set(0,-.425,.03);if(tier>=2)s.scale.z=1.18;l.boot.add(s);
    if(tier>=1){var kn=mesh(new T.SphereGeometry(.068,14,10),m,0,.0,.02);kn.scale.set(1,1.05,.8);l.boot.add(kn)}
    if(tier>=2){l.boot.add(ring(.07,.005,gold,-.04,1,1.02));l.boot.add(ring(.05,.005,gold,-.38,1,1.05));
      var fin=mesh(new T.ConeGeometry(.03,.07,4),gold,0,.03,.07);fin.rotation.x=.6;l.boot.add(fin)}
  });
}

/* ---------- scenes ---------- */
var THEMES={
  camp:{sky:[[0,"#02030a"],[.38,"#090e22"],[.49,"#1c2350"],[.53,"#2a2244"],[.6,"#090b15"]],fog:[0x0a1022,.042],hemi:[0x6a80c8,0x10161a,1.7],
    key:[0xa9bfff,2.6,[-5,9,-3]],fill:[0xc9d4ff,1.5],exposure:1.5,ground:0x1a2a22,hills:.22,grass:{n:2200,h:.35,s:.4,l:.13,hue:.33,size:1},
    discs:[{p:[-8,12.5,-46],r:2.6,c:0xe6ecff,halo:"170,190,255",hs:22}],stars:1,clouds:{n:5,c:0x5a6a9a,o:.22,sp:.25},
    trees:{kind:"dead",at:[[-4.2,-4.5,4.2],[5.2,-7.5,5],[-9,-13,6],[-1.5,-15,4.6]]},props:["keep","stones","fire","rocks"],parts:[{kind:"float",n:46,c:0x9dffb0,size:.1}]},
  twin:{sky:[[0,"#2f4e5c"],[.3,"#5d7f86"],[.44,"#e39a84"],[.5,"#f2b68c"],[.53,"#d9826f"],[.62,"#3a4a3a"]],fog:[0xc9907c,.022],hemi:[0xffc9a8,0x35502c,2.1],
    key:[0xffb890,2.8,[6,5,-5]],fill:[0xaec8ff,1.2],exposure:1.25,ground:0x3a6230,hills:.5,grass:{n:3200,h:.5,s:.55,l:.3,hue:.29,size:1.15},
    discs:[{p:[12,11,-46],r:6.5,c:0xf6b58c,halo:"255,190,150",hs:30},{p:[-3,15,-50],r:1.6,c:0xf2a58a,halo:"255,180,150",hs:8}],
    clouds:{n:9,c:0xf0a48e,o:.75,sp:.5},flowers:{n:260,c:[0xffffff,0xf4f0d8]},props:["sword","rocks"],parts:[{kind:"float",n:26,c:0xfff0c8,size:.07}],rest:1},
  war:{sky:[[0,"#0a0707"],[.3,"#1c100d"],[.44,"#5a2414"],[.5,"#e06a22"],[.53,"#7a2a12"],[.6,"#120a08"]],fog:[0x2a1410,.036],hemi:[0xc86a3a,0x140a08,1.5],
    key:[0xff8a3a,2.6,[-7,3,-8]],fill:[0xffb080,.9],exposure:1.35,ground:0x1c1512,hills:.7,grass:{n:900,h:.3,s:.25,l:.14,hue:.09,size:.9},
    discs:[{p:[16,3.4,-52],r:2.6,c:0xffb060,halo:"255,150,60",hs:26}],clouds:{n:12,c:0x1a0f0c,o:.85,sp:.9},
    trees:{kind:"dead",at:[[4.6,-5,3.6],[-6,-9,4.4]]},props:["warkeep","banner","rocks","fires"],parts:[{kind:"rise",n:120,c:0xff8a30,size:.08}]},
  autumn:{sky:[[0,"#3f79c9"],[.34,"#7fb0e6"],[.48,"#dfe9f2"],[.52,"#e8d9c0"],[.6,"#7a5a34"]],fog:[0xd8dde6,.014],hemi:[0xcfe2ff,0x8a5a2a,2.3],
    key:[0xfff0d0,3.4,[6,10,5]],fill:[0xfff4e0,.8],exposure:1.05,ground:0x8a5a26,hills:.4,grass:{n:1800,h:.3,s:.6,l:.36,hue:.1,size:.9},
    discs:[],clouds:{n:10,c:0xffffff,o:.9,sp:.6},trees:{kind:"autumn",at:[[-2.2,-5.5,4.2],[2.4,-6.5,4.6],[-3.3,-10,5],[3.5,-11,5.2],[-4.6,-15,5.6],[4.9,-16,5.8],[-6.5,-21,6],[6.8,-22,6]]},
    props:["castle","path","mountains","rocks"],parts:[{kind:"fall",n:90,c:0xe07a22,size:.12}]},
  vale:{sky:[[0,"#01020a"],[.3,"#03082a"],[.47,"#0a1c7a"],[.52,"#081044"],[.6,"#02030c"]],fog:[0x040a36,.034],hemi:[0x3a5cff,0x05061a,1.9],
    key:[0x5a86ff,3,[-3,9,-7]],fill:[0x8aa8ff,1],exposure:1.5,ground:0x0c1238,hills:.9,grass:{n:1200,h:.34,s:.6,l:.2,hue:.63,size:.9},
    discs:[{p:[-7.5,12,-48],r:4.6,c:0x5a8cff,halo:"70,120,255",hs:34}],stars:1,clouds:{n:5,c:0x2a3a9a,o:.3,sp:.2},
    props:["tower","stream","cliffs"],parts:[{kind:"float",n:60,c:0x9fc0ff,size:.09}]},
  meadow:{sky:[[0,"#c9c2d8"],[.3,"#e6d3d6"],[.46,"#f7e3cf"],[.5,"#fbe9d2"],[.54,"#b9c9a0"],[.62,"#5a7a44"]],fog:[0xf0dccc,.02],hemi:[0xfff0e0,0x5a7a3a,2.2],
    key:[0xffe2b8,3,[-6,6,-6]],fill:[0xffffff,.9],exposure:1.05,ground:0x4f7a3a,hills:.6,grass:{n:3000,h:.42,s:.5,l:.34,hue:.27,size:1.05},
    discs:[{p:[-14,7,-50],r:2.4,c:0xfff2d8,halo:"255,235,200",hs:30}],clouds:{n:7,c:0xffffff,o:.6,sp:.35},
    flowers:{n:900,c:[0xff8fc0,0xffffff,0xc79bff,0xffd86a,0xff6f91]},props:["castle","rocks"],parts:[{kind:"float",n:40,c:0xffd0e6,size:.08}]}
};

function create(){
  var canvas=document.createElement("canvas"),renderer;
  try{renderer=new T.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:"low-power"})}catch(e){return null}
  renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  var scene=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.1,160),uTime={value:0};
  var pmrem=new T.PMREMGenerator(renderer),envRT=null;
  var hemi=new T.HemisphereLight(0xffffff,0x000000,1);scene.add(hemi);
  var key=new T.DirectionalLight(0xffffff,1);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  var sc=key.shadow.camera;sc.left=-5;sc.right=5;sc.top=5;sc.bottom=-5;sc.near=1;sc.far=30;key.shadow.bias=-.002;scene.add(key);
  var fill=new T.DirectionalLight(0xffffff,1);fill.position.set(1.2,2.2,6);scene.add(fill);
  var fireL=new T.PointLight(0xff7a2a,0,11,1.8);scene.add(fireL);
  var dot=glowTexture("rgba(255,255,255,1)","rgba(255,255,255,0)");
  var cloudTex=(function(){var c=document.createElement("canvas");c.width=256;c.height=128;var x=c.getContext("2d");
    for(var i=0;i<16;i++){var cx=40+Math.random()*176,cy=50+Math.random()*36,r=22+Math.random()*30,g=x.createRadialGradient(cx,cy,0,cx,cy,r);
      g.addColorStop(0,"rgba(255,255,255,.75)");g.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=g;x.fillRect(0,0,256,128)}return new T.CanvasTexture(c)})();
  var world=null,anim=[],fire=null,flare=0,theme=null,themeId="camp";

  function skyTex(stops){var c=document.createElement("canvas");c.width=4;c.height=256;var x=c.getContext("2d"),g=x.createLinearGradient(0,0,0,256);
    stops.forEach(function(s){g.addColorStop(s[0],s[1])});g.addColorStop(1,stops[stops.length-1][1]);x.fillStyle=g;x.fillRect(0,0,4,256);return new T.CanvasTexture(c)}
  function sway(geoMat,amt){geoMat.onBeforeCompile=function(sh){sh.uniforms.uTime=uTime;
    sh.vertexShader="uniform float uTime;\n"+sh.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\n transformed.x+=sin(uTime*1.5+instanceMatrix[3][0]*1.7+instanceMatrix[3][2]*1.1)*"+amt.toFixed(2)+"*transformed.y;\n transformed.z+=cos(uTime*1.1+instanceMatrix[3][0])*"+(amt*.35).toFixed(2)+"*transformed.y;")};return geoMat}
  function scatter(n,minR,maxR,avoid){var out=[];for(var i=0;i<n;i++){var a=Math.random()*Math.PI*2,r=minR+Math.pow(Math.random(),.8)*(maxR-minR),x=Math.cos(a)*r,z=Math.sin(a)*r-1;
    if(Math.hypot(x,z)<Math.min(1.35,minR)||(avoid&&Math.hypot(x-avoid.x,z-avoid.z)<.8)){x+=3.2;z-=4}if(z>2.3)z=-z-1.5;out.push([x,z])}return out}
  function hillY(x,z,amp){var d=Math.sqrt(x*x+z*z);return d<5?0:(Math.sin(x*.35)+Math.cos(z*.3+x*.1))*amp*Math.min(1,(d-5)/6)}
  function add(o){world.add(o);return o}
  function sprite(tex,color,opacity,additive){return new T.Sprite(new T.SpriteMaterial({map:tex,color:color,opacity:opacity,transparent:true,fog:false,depthWrite:false,blending:additive?T.AdditiveBlending:T.NormalBlending}))}

  var PROPS={
    rocks:function(th){var rock=mat(new T.Color(th.ground).multiplyScalar(.75),{roughness:1});
      [[2.9,1.6,.3],[-1.9,1.5,.22],[3.6,-2.6,.45],[-5,1,.5],[-.6,-3.2,.26],[6,-5,.8],[-7,-6,.9]].forEach(function(r){var k=mesh(new T.DodecahedronGeometry(r[2]),rock,r[0],r[2]*.4,r[1]);k.scale.y=.6;k.rotation.set(r[0],r[1],0);add(k)})},
    stones:function(){var menhir=mat(0x2a3142,{roughness:1});
      [[-2.6,-3.6,1.5,.12],[-3.7,-2.6,1.1,-.2],[-1.7,-4.8,1.8,.05]].forEach(function(m,k){var st=mesh(new T.BoxGeometry(.5,m[2],.32),menhir,m[0],m[2]/2-.05,m[1]);st.rotation.z=m[3];st.rotation.y=.5+k;add(st);
        if(k!==1){var rm=trimMat(0x54c8ff);rm.transparent=true;var ru=new T.Mesh(new T.PlaneGeometry(.1,.34),rm);ru.position.set(0,.15,.165);st.add(ru);anim.push(function(t){rm.opacity=.45+Math.sin(t*1.3+k*2)*.4})}})},
    keep:function(){castle(8.5,-27,1,{color:0x3a4258,roof:0x1c2234,win:0xffa24a,flag:0x7a1c1c})},
    warkeep:function(){castle(-6,-31,1.2,{color:0x4a342a,roof:0x1a1210,win:0xff7a2a,burning:true,flag:0x8a1414})},
    castle:function(th){var day=themeId==="autumn";var mound=mesh(new T.SphereGeometry(15,24,14),mat(new T.Color(th.ground).multiplyScalar(.8),{roughness:1,map:soilTex()}),1,-9.2,-40);mound.scale.y=.75;add(mound);
      castle(1,-40,.82,{color:day?0x9a949c:0xd8ccc2,roof:day?0x3d4c6e:0x7a6a86,win:0xffd9a0,y:2,flag:day?0xb02a1a:0x3a64b8})},
    fire:function(){PROPS._fire(1.02,-1.35,1)},
    fires:function(){PROPS._fire(1.7,-1.9,.8,true)},
    _fire:function(x,z,s,nostones){
      fire=group(x,0,z);fire.scale.setScalar(s);add(fire);var rock=mat(0x1a1f2a,{roughness:1}),i;
      if(!nostones)for(i=0;i<7;i++){var fa=i/7*6.28;fire.add(mesh(new T.DodecahedronGeometry(.1),rock,Math.cos(fa)*.36,.05,Math.sin(fa)*.36))}
      for(i=0;i<3;i++){var lg=mesh(new T.CylinderGeometry(.045,.05,.6,7),mat(0x24160e),0,.07,0);lg.rotation.set(Math.PI/2,0,i*2.09);fire.add(lg)}
      var flames=[];[[.15,.62,0xff4a12],[.11,.5,0xff8a22],[.07,.36,0xffd66a]].forEach(function(f){
        var fl=new T.Mesh(new T.ConeGeometry(f[0],f[1],7),new T.MeshBasicMaterial({color:f[2],transparent:true,opacity:.42,fog:false,blending:T.AdditiveBlending,depthWrite:false}));fl.position.y=.1+f[1]/2;fire.add(fl);flames.push(fl)});
      var fglow=sprite(glowTexture("rgba(255,140,50,.6)","rgba(255,120,40,0)"),0xffffff,1,true);fglow.scale.set(2.4,2.4,1);fglow.position.y=.4;fire.add(fglow);
      var EN=36,ep=new Float32Array(EN*3),es=[];for(i=0;i<EN;i++)es.push({t:Math.random(),x:(Math.random()-.5)*.3,z:(Math.random()-.5)*.3,v:.5+Math.random()*.7});
      var egeo=new T.BufferGeometry();egeo.setAttribute("position",new T.BufferAttribute(ep,3));
      fire.add(new T.Points(egeo,new T.PointsMaterial({color:0xffa040,size:.07,map:dot,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false})));
      fireL.position.set(x,.55,z);
      anim.push(function(t,dt){flare=Math.max(0,flare-dt*.8);var fk=.82+Math.sin(t*11)*.1+Math.sin(t*23.7)*.08+flare*1.4;
        fireL.intensity=9*fk*s;fglow.scale.setScalar(2.4*(.9+fk*.18));
        flames.forEach(function(f,k){f.scale.set(1+Math.sin(t*9+k*2)*.14,fk*(1+Math.sin(t*13+k)*.1),1+Math.cos(t*8+k)*.14);f.rotation.y=t*(1.5+k)});
        for(var k=0;k<EN;k++){var em=es[k];em.t+=dt*em.v*(.5+flare);if(em.t>1){em.t=0;em.x=(Math.random()-.5)*.3;em.z=(Math.random()-.5)*.3}
          ep[k*3]=em.x+Math.sin(t*2+k)*.08*em.t;ep[k*3+1]=.2+em.t*(1.6+flare*1.5);ep[k*3+2]=em.z+Math.cos(t*1.7+k)*.08*em.t}
        egeo.attributes.position.needsUpdate=true})},
    sword:function(){var g=group(-1.35,0,-.75);g.rotation.z=.16;g.rotation.x=-.08;var steel=gearMat(2,0x9fb0c8);
      g.add(mesh(new T.BoxGeometry(.06,.9,.012),steel,0,.42,0));g.add(mesh(new T.BoxGeometry(.3,.03,.035),goldMat(),0,.88,0));
      g.add(mesh(new T.CylinderGeometry(.018,.018,.22,8),mat(0x3a2718),0,1.0,0));g.add(mesh(new T.SphereGeometry(.03,10,8),goldMat(),0,1.13,0));add(g)},
    banner:function(){var g=group(-1.9,0,-1.6);g.add(mesh(new T.CylinderGeometry(.025,.03,3.2,8),mat(0x2a1c12),0,1.6,0));
      var geo=new T.PlaneGeometry(1.1,.75,10,6);geo.translate(.55,0,0);var fl=new T.Mesh(geo,cloth(0x7a1414));fl.material.side=T.DoubleSide;fl.position.set(.02,2.7,0);fl.castShadow=true;g.add(fl);
      var base=Float32Array.from(geo.attributes.position.array),p=geo.attributes.position;
      anim.push(function(t){for(var i=0;i<p.count;i++){var x=base[i*3];p.setZ(i,Math.sin(x*5-t*4)*.1*x);p.setY(i,base[i*3+1]-x*x*.12+Math.sin(x*4-t*3)*.03*x)}p.needsUpdate=true;geo.computeVertexNormals()});add(g)},
    path:function(){var c=document.createElement("canvas");c.width=c.height=128;var x=c.getContext("2d");x.fillStyle="#5a5048";x.fillRect(0,0,128,128);
      for(var i=0;i<60;i++){x.fillStyle="hsl(30,"+(6+Math.random()*8)+"%,"+(34+Math.random()*22)+"%)";var w=14+Math.random()*14;x.beginPath();x.ellipse(Math.random()*128,Math.random()*128,w/2,w/2.6,Math.random()*3,0,6.28);x.fill()}
      var tx=new T.CanvasTexture(c);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(2,16);
      var p=new T.Mesh(new T.PlaneGeometry(1.9,34),mat(0x9a8c80,{map:tx,roughness:1}));p.rotation.x=-Math.PI/2;p.position.set(0,.012,-15);p.receiveShadow=true;add(p)},
    mountains:function(){[[-26,-60,16,0x7f93b0],[-8,-70,22,0x8fa2bd],[18,-64,18,0x7a8eac],[34,-58,13,0x8799b4]].forEach(function(m){
      var k=new T.Mesh(new T.ConeGeometry(m[2]*1.1,m[2],7),mat(m[3],{roughness:1}));k.position.set(m[0],m[2]/2-1,m[1]);add(k);
      var cap=new T.Mesh(new T.ConeGeometry(m[2]*.36,m[2]*.33,7),mat(0xf4f6fa,{roughness:1}));cap.position.set(m[0],m[2]*.835-1,m[1]);add(cap)})},
    cliffs:function(){var rock=mat(0x070b26,{roughness:1});
      [[-12,-12,7,12],[12.5,-14,8,14],[-17,-24,10,18],[18,-26,11,20],[-9,-34,7,10]].forEach(function(c,k){var m=mesh(new T.DodecahedronGeometry(c[2]),rock,c[0],c[3]*.28,c[1]);m.scale.set(1,c[3]/c[2]*.6,1);m.rotation.y=k;add(m)})},
    tower:function(){var g=group(3.2,0,-19),stoneM=stone(0x1a2466,3,6),red=new T.MeshBasicMaterial({color:0xff2a1a,fog:false});
      var mound=mesh(new T.DodecahedronGeometry(4.2),stoneM,0,.4,0);mound.scale.y=.45;g.add(mound);
      g.add(mesh(new T.CylinderGeometry(1.3,1.7,9,8),stoneM,0,6,0));g.add(mesh(new T.CylinderGeometry(1.7,1.4,1,8),stoneM,0,10.8,0));
      g.add(mesh(new T.ConeGeometry(1.5,5,8),stoneM,0,13.8,0));
      for(var i=0;i<4;i++){var a=i/4*6.28+.4;g.add(mesh(new T.ConeGeometry(.3,2.2,6),stoneM,Math.cos(a)*1.6,12,Math.sin(a)*1.6))}
      [[0,8.2,1.42,.5,1.5],[0,3,1.66,.6,1.1],[-.9,5.6,1.2,.3,.7]].forEach(function(w){var q=new T.Mesh(new T.PlaneGeometry(w[3],w[4]),red);q.position.set(w[0],w[1],w[2]);q.rotation.y=w[0]?-.7:0;g.add(q);
        var gl=sprite(glowTexture("rgba(255,40,20,.55)","rgba(255,30,10,0)"),0xffffff,1,true);gl.position.copy(q.position);gl.position.z+=.3;gl.scale.set(3,3.6,1);g.add(gl)});
      add(g)},
    stream:function(){var c=document.createElement("canvas");c.width=64;c.height=256;var x=c.getContext("2d");x.fillStyle="#061a66";x.fillRect(0,0,64,256);
      for(var i=0;i<90;i++){x.strokeStyle="rgba(150,200,255,"+(.2+Math.random()*.6)+")";x.lineWidth=1+Math.random()*2;var px=Math.random()*64,py=Math.random()*256;x.beginPath();x.moveTo(px,py);x.lineTo(px+(Math.random()-.5)*8,py+10+Math.random()*26);x.stroke()}
      var tx=new T.CanvasTexture(c);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(1,3);
      var m=new T.MeshBasicMaterial({map:tx,transparent:true,opacity:.6,fog:false,blending:T.AdditiveBlending,depthWrite:false});
      var w=new T.Mesh(new T.PlaneGeometry(1.3,30),m);w.rotation.x=-Math.PI/2;w.rotation.z=.04;w.position.set(-2.7,.03,-13);add(w);
      var fall=new T.Mesh(new T.PlaneGeometry(1.8,9),m);fall.position.set(-3.8,4.4,-27.5);fall.rotation.y=.4;add(fall);
      var gl=new T.PointLight(0x3a6cff,8,9,1.6);gl.position.set(-2.1,.6,-2.5);add(gl);
      anim.push(function(t){tx.offset.y=t*.22;gl.intensity=8+Math.sin(t*2.3)*1.2})}
  };

  /* ---- scenery textures and builders ---- */
  var UP=new T.Vector3(0,1,0),texCache={};
  function canvasTex(key,w,h,draw,rep){
    if(!texCache[key]){var c=document.createElement("canvas");c.width=w;c.height=h;draw(c.getContext("2d"),w,h);var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;texCache[key]=t}
    if(!rep)return texCache[key];
    var k2=key+"|"+rep[0]+"|"+rep[1];if(!texCache[k2]){var q=texCache[key].clone();q.repeat.set(rep[0],rep[1]);q.needsUpdate=true;texCache[k2]=q}return texCache[k2];
  }
  function grassTex(){return canvasTex("grass",256,256,function(x,w,h){
    for(var i=0;i<80;i++){var bx=8+Math.random()*(w-16),bh=90+Math.random()*160,lean=(Math.random()-.5)*70,bw=4+Math.random()*7;
      var g=x.createLinearGradient(bx,h,bx+lean,h-bh);g.addColorStop(0,"#3f3f3f");g.addColorStop(.55,"#a8a8a8");g.addColorStop(1,"#ffffff");x.fillStyle=g;
      x.beginPath();x.moveTo(bx-bw/2,h);x.quadraticCurveTo(bx-bw/4+lean*.35,h-bh*.6,bx+lean,h-bh);x.quadraticCurveTo(bx+bw/4+lean*.35,h-bh*.6,bx+bw/2,h);x.fill()}})}
  function soilTex(){return canvasTex("soil",256,256,function(x,w,h){x.fillStyle="#b4b4b4";x.fillRect(0,0,w,h);
    for(var i=0;i<900;i++){var v=120+Math.random()*135|0;x.fillStyle="rgba("+v+","+v+","+v+",.5)";var r=2+Math.random()*10;x.beginPath();x.ellipse(Math.random()*w,Math.random()*h,r,r*.6,Math.random()*3,0,6.3);x.fill()}},[36,36])}
  function barkTex(){return canvasTex("bark",128,256,function(x,w,h){x.fillStyle="#9a9a9a";x.fillRect(0,0,w,h);
    for(var i=0;i<140;i++){var v=60+Math.random()*150|0;x.strokeStyle="rgba("+v+","+v+","+v+",.7)";x.lineWidth=1+Math.random()*3;var px=Math.random()*w;x.beginPath();x.moveTo(px,Math.random()*h);x.bezierCurveTo(px+6,Math.random()*h,px-6,Math.random()*h,px+(Math.random()-.5)*10,Math.random()*h);x.stroke()}},[2,3])}
  function stoneTex(rx,ry){return canvasTex("stone",256,256,function(x,w,h){x.fillStyle="#6e6e6e";x.fillRect(0,0,w,h);
    for(var r=0;r<16;r++){var y=r*16,off=(r%2)*18+Math.random()*6;for(var bx=-off;bx<w;){var bw=26+Math.random()*16,v=150+Math.random()*90|0;
      x.fillStyle="rgb("+v+","+v+","+(v+4)+")";x.fillRect(bx+1.5,y+1.5,bw-3,13);bx+=bw}}
    for(var i=0;i<1500;i++){x.fillStyle="rgba(0,0,0,"+Math.random()*.16+")";x.fillRect(Math.random()*w,Math.random()*h,2,2)}},[rx,ry])}
  function leafTex(pal,key){return canvasTex("leaf"+key,128,128,function(x,w,h){
    for(var i=0;i<210;i++){var a=Math.random()*6.28,rr=Math.pow(Math.random(),.7)*56,px=64+Math.cos(a)*rr,py=64+Math.sin(a)*rr;
      x.fillStyle=pal[Math.random()*pal.length|0];x.globalAlpha=.9;x.beginPath();x.ellipse(px,py,5+Math.random()*4,2.5+Math.random()*2,Math.random()*3.1,0,6.3);x.fill()}})}
  function stone(color,rx,ry){var t=stoneTex(rx,ry);return mat(color,{roughness:.96,map:t,bumpMap:t,bumpScale:.8})}
  function crossGeo(){var g=new T.BufferGeometry(),p=[],u=[],n=[],ix=[];
    for(var k=0;k<2;k++){var a=k*Math.PI/2+.4,c=Math.cos(a)*.5,s=Math.sin(a)*.5,b=k*4;
      p.push(-c,0,-s,c,0,s,c,1,s,-c,1,-s);u.push(0,0,1,0,1,1,0,1);n.push(0,1,0,0,1,0,0,1,0,0,1,0);ix.push(b,b+1,b+2,b,b+2,b+3)}
    g.setAttribute("position",new T.Float32BufferAttribute(p,3));g.setAttribute("uv",new T.Float32BufferAttribute(u,2));g.setAttribute("normal",new T.Float32BufferAttribute(n,3));g.setIndex(ix);return g}
  var leafCards=[];
  function limbTo(parent,from,dir,len,r0,r1,m){var c=mesh(new T.CylinderGeometry(r1,r0,len,7),m);c.position.copy(from).addScaledVector(dir,len/2);c.quaternion.setFromUnitVectors(UP,dir);parent.add(c);return from.clone().addScaledVector(dir,len)}
  function makeTree(kind,x,z,hh,ph,th){
    var dead=kind==="dead",g=group(x,0,z),bark=mat(dead?0x2a2422:0x6a4c36,{roughness:1,map:barkTex(),bumpMap:barkTex(),bumpScale:1.2}),seed=(ph*9973+17)|0;
    function rnd(){seed=(seed*16807+11)%2147483647;return seed/2147483647}
    var top=limbTo(g,new T.Vector3(),new T.Vector3(.05,1,.03).normalize(),hh*.48,hh*.055,hh*.036,bark);
    g.add(mesh(new T.CylinderGeometry(hh*.056,hh*.085,hh*.07,9),bark,0,hh*.03,0));
    var crown=group(),ends=[],n=dead?5:7;g.add(crown);
    for(var i=0;i<n;i++){
      var a=i/n*6.283+ph*6+rnd()*.5,tilt=i===0?.12:.45+rnd()*.55,d=new T.Vector3(Math.cos(a)*Math.sin(tilt),Math.cos(tilt),Math.sin(a)*Math.sin(tilt)),L=hh*(.28+rnd()*.2);
      var st=top.clone();st.y-=hh*.08*rnd();var e=limbTo(crown,st,d,L,hh*.026,hh*.013,bark);ends.push(e);
      for(var j=0;j<(dead?3:2);j++){
        var d2=d.clone().add(new T.Vector3(rnd()-.5,rnd()*.6,rnd()-.5).multiplyScalar(1.1)).normalize(),L2=L*(.45+rnd()*.35),s2=st.clone().lerp(e,.45+.22*j);
        var e2=limbTo(crown,s2,d2,L2,hh*.012,hh*.004,bark);ends.push(e2);
        if(dead){var d3=d2.clone().add(new T.Vector3(rnd()-.5,rnd()*.4,rnd()-.5)).normalize();limbTo(crown,s2.clone().lerp(e2,.6),d3,L2*.5,hh*.005,hh*.002,bark)}
      }
    }
    if(!dead)ends.forEach(function(e){for(var c=0;c<5;c++)leafCards.push({p:[x+e.x+(rnd()-.5)*hh*.3,e.y+(rnd()-.35)*hh*.22,z+e.z+(rnd()-.5)*hh*.3],s:hh*(.3+rnd()*.2),r:[rnd()*1.2-.6,rnd()*6.28,rnd()*1.2-.6],c:.72+rnd()*.28})});
    else anim.push(function(t){crown.rotation.z=Math.sin(t*.9+ph*6)*.012;crown.rotation.x=Math.cos(t*.7+ph*4)*.01});
    add(g);
  }
  function flushLeaves(pal,key){
    if(!leafCards.length)return;
    var m=sway(new T.MeshStandardMaterial({map:leafTex(pal,key),alphaTest:.35,side:T.DoubleSide,roughness:1}),.07);
    var im=new T.InstancedMesh(new T.PlaneGeometry(1,1),m,leafCards.length),o=new T.Object3D(),c=new T.Color();
    leafCards.forEach(function(L,k){o.position.fromArray(L.p);o.rotation.fromArray(L.r);o.scale.setScalar(L.s);o.updateMatrix();im.setMatrixAt(k,o.matrix);im.setColorAt(k,c.setScalar(L.c))});
    im.castShadow=true;add(im);leafCards=[];
  }
  function castle(x,z,s,o){
    var K=group(x,o.y||0,z);K.scale.setScalar(s);add(K);
    var wallC=o.color,roofM=mat(o.roof||0x3a4660,{roughness:.85}),lit=new T.MeshBasicMaterial({color:o.win,fog:false}),dark=new T.MeshBasicMaterial({color:0x05060a});
    function merlons(px,py,pz,len,alongX,depth){var cnt=Math.max(2,Math.round(len/.85)),m=stone(wallC,.4,.4);
      for(var i=0;i<cnt;i++){var t=(i+.5)/cnt-.5;K.add(mesh(new T.BoxGeometry(alongX?.42:depth,.42,alongX?depth:.42),m,px+(alongX?t*len:0),py+.21,pz+(alongX?0:t*len)))}}
    function wall(px,pz,w,h,d,alongX){K.add(mesh(new T.BoxGeometry(alongX?w:d,h,alongX?d:w),stone(wallC,w/2.2,h/2.2),px,h/2,pz));merlons(px,h,pz,w,alongX,d+.08)}
    function tower(px,pz,r,h,roof,flag){
      K.add(mesh(new T.CylinderGeometry(r,r*1.07,h,18),stone(wallC,r*2.6,h/2.2),px,h/2,pz));
      K.add(mesh(new T.CylinderGeometry(r*1.16,r*1.02,.36,18),stone(wallC,r*2.6,.3),px,h-.1,pz));
      if(roof){K.add(mesh(new T.ConeGeometry(r*1.3,r*2.7,18),roofM,px,h+.08+r*1.35,pz));
        if(flag){K.add(mesh(new T.CylinderGeometry(.03,.03,1.3,5),dark,px,h+r*2.7+.6,pz));
          var fg=new T.PlaneGeometry(.95,.5,6,3);fg.translate(.475,0,0);var fl=new T.Mesh(fg,new T.MeshStandardMaterial({color:flag,side:T.DoubleSide,roughness:1}));fl.position.set(px,h+r*2.7+.95,pz);K.add(fl);
          var base=Float32Array.from(fg.attributes.position.array),fp=fg.attributes.position;
          anim.push(function(t){for(var i=0;i<fp.count;i++){var vx=base[i*3];fp.setZ(i,Math.sin(vx*6-t*4)*.1*vx)}fp.needsUpdate=true})}}
      else{var m=stone(wallC,.4,.4);for(var k=0;k<10;k++){var an=k/10*6.283;var b=mesh(new T.BoxGeometry(.36,.42,.3),m,px+Math.cos(an)*r*1.04,h+.29,pz+Math.sin(an)*r*1.04);b.rotation.y=-an+Math.PI/2;K.add(b)}}
      for(var w=0;w<Math.floor(h/3);w++){var q=new T.Mesh(new T.PlaneGeometry(.16,.5),w%2?dark:lit);q.position.set(px+(w%2?-.3:.2)*r,1.8+w*2.6,pz+r*1.02);K.add(q)}
    }
    wall(0,3,12,3.1,.9,true);wall(-6,0,6,3.1,.9,false);wall(6,0,6,3.1,.9,false);wall(0,-3,12,3.4,.9,true);
    tower(-6,3,1.25,4.7,false);tower(6,3,1.25,4.7,false);tower(-6,-3,1.2,6.2,true,o.flag);tower(6,-3,1.2,6.2,true);
    tower(-1.15,3.2,.8,4.4,false);tower(1.15,3.2,.8,4.4,false);
    var gate=new T.Mesh(new T.PlaneGeometry(1.3,2.1),dark);gate.position.set(0,1.05,3.47);K.add(gate);
    var arch=new T.Mesh(new T.CircleGeometry(.65,16,0,Math.PI),dark);arch.position.set(0,2.1,3.47);K.add(arch);
    K.add(mesh(new T.BoxGeometry(4.6,7,4),stone(wallC,2.4,3.4),0,3.5,-.6));merlons(0,7,1.4,4.6,true,.4);merlons(0,7,-2.6,4.6,true,.4);merlons(-2.3,7,-.6,4,false,.4);merlons(2.3,7,-.6,4,false,.4);
    [[-2.3,1.4],[2.3,1.4],[-2.3,-2.6],[2.3,-2.6]].forEach(function(c){tower(c[0],c[1],.5,8.2,true)});
    tower(2.9,-2.2,1.45,11.5,true,o.flag);tower(-3.2,-1.6,1,8.6,true);
    for(var r2=0;r2<2;r2++)for(var c2=0;c2<3;c2++){var wq=new T.Mesh(new T.PlaneGeometry(.26,.6),(r2+c2)%2?lit:dark);wq.position.set(-1.3+c2*1.3,3.4+r2*1.9,1.41);K.add(wq)}
    if(o.burning)[[-6,7,-3],[2.9,14,-2.2],[0,8,-.6],[6,5,3],[-9,1,5],[11,1,6]].forEach(function(f,k){
      var fl=sprite(glowTexture("rgba(255,170,70,.95)","rgba(255,90,20,0)"),0xffffff,1,true);fl.position.set(f[0],f[1],f[2]);fl.scale.set(5,6,1);K.add(fl);
      var sm=sprite(cloudTex,0x0e0908,.8);sm.position.set(f[0]+1,f[1]+6,f[2]-1);sm.scale.set(9,16,1);K.add(sm);
      anim.push(function(t){var q=.8+Math.sin(t*7+k*3)*.15+Math.sin(t*17+k)*.08;fl.scale.set(5*q,6*q,1);sm.position.y=f[1]+6+((t*.6+k)%4);sm.material.opacity=.8*(1-((t*.6+k)%4)/4)})});
  }
  function particles(o){
    var n=o.n,pos=new Float32Array(n*3),ps=[],i;
    for(i=0;i<n;i++)ps.push({x:(Math.random()-.5)*(o.kind==="rise"?24:14),y:Math.random()*(o.kind==="float"?1.6:6)+.3,z:-9+Math.random()*12,p:Math.random()*6.28,s:.3+Math.random()*.6});
    var geo=new T.BufferGeometry();geo.setAttribute("position",new T.BufferAttribute(pos,3));
    add(new T.Points(geo,new T.PointsMaterial({color:o.c,size:o.size,map:dot,transparent:true,opacity:.9,blending:o.kind==="fall"?T.NormalBlending:T.AdditiveBlending,depthWrite:false})));
    anim.push(function(t,dt){for(var k=0;k<n;k++){var f=ps[k];
      if(o.kind==="rise"){f.y+=dt*f.s*1.3;if(f.y>7)f.y=.2}else if(o.kind==="fall"){f.y-=dt*f.s*.9;if(f.y<.05){f.y=6;f.x=(Math.random()-.5)*14}}
      var wob=o.kind==="float"?.9:.5;pos[k*3]=f.x+Math.sin(t*f.s+f.p)*wob+(o.kind==="float"?0:t*.0);pos[k*3+1]=f.y+(o.kind==="float"?Math.sin(t*f.s*1.7+f.p)*.35:0);pos[k*3+2]=f.z+Math.cos(t*f.s*.8+f.p)*wob}
      geo.attributes.position.needsUpdate=true});
  }

  function buildWorld(id){
    if(world){scene.remove(world);world.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material&&o.material.dispose&&!o.material.map)o.material.dispose()})}
    world=group();scene.add(world);anim=[];fire=null;fireL.intensity=0;
    themeId=THEMES[id]?id:"camp";var th=theme=THEMES[themeId],i;
    scene.fog=new T.FogExp2(th.fog[0],th.fog[1]);renderer.toneMappingExposure=th.exposure;
    hemi.color.set(th.hemi[0]);hemi.groundColor.set(th.hemi[1]);hemi.intensity=th.hemi[2];
    key.color.set(th.key[0]);key.intensity=th.key[1];key.position.fromArray(th.key[2]);fill.color.set(th.fill[0]);fill.intensity=th.fill[1];
    var stex=skyTex(th.sky);
    add(new T.Mesh(new T.SphereGeometry(110,24,16),new T.MeshBasicMaterial({map:stex,side:T.BackSide,fog:false})));
    // reflections for metal: a small copy of the sky with bright cards where the lights are
    var es=new T.Scene();es.add(new T.Mesh(new T.SphereGeometry(50,24,16),new T.MeshBasicMaterial({map:stex,side:T.BackSide})));
    function card(p,r,c,k){var m=new T.Mesh(new T.SphereGeometry(r,10,8),new T.MeshBasicMaterial({color:new T.Color(c).multiplyScalar(k)}));m.position.copy(new T.Vector3().fromArray(p).normalize().multiplyScalar(40));es.add(m)}
    card(th.key[2],7,th.key[0],5);card([1.2,2.2,6],9,th.fill[0],2.5);card([-6,3,3],8,th.hemi[0],1.6);
    if(th.props.indexOf("fire")>=0||th.props.indexOf("fires")>=0)card([3,.6,-3],6,0xff7a2a,5);
    if(envRT)envRT.dispose();envRT=pmrem.fromScene(es,.03);scene.environment=envRT.texture;
    es.traverse(function(o){if(o.geometry)o.geometry.dispose()});
    th.discs.forEach(function(d){var m=new T.Mesh(new T.SphereGeometry(d.r,24,16),new T.MeshBasicMaterial({color:d.c,fog:false}));m.position.fromArray(d.p);add(m);
      var h=sprite(glowTexture("rgba("+d.halo+",.55)","rgba("+d.halo+",0)"),0xffffff,1,true);h.scale.set(d.hs,d.hs,1);h.position.fromArray(d.p);add(h)});
    if(th.stars){var sp=[];for(i=0;i<420;i++){var a=Math.random()*Math.PI*2,e=Math.random()*1.3+.12;sp.push(Math.cos(a)*Math.cos(e)*90,Math.sin(e)*90,Math.sin(a)*Math.cos(e)*90)}
      var sgeo=new T.BufferGeometry();sgeo.setAttribute("position",new T.Float32BufferAttribute(sp,3));
      add(new T.Points(sgeo,new T.PointsMaterial({color:0xcfd8ff,size:1.6,sizeAttenuation:false,fog:false,transparent:true,opacity:.85})))}
    if(th.clouds){var cl=[];for(i=0;i<th.clouds.n;i++){var c=sprite(cloudTex,th.clouds.c,th.clouds.o*(.6+Math.random()*.4));
        c.position.set(-70+Math.random()*140,9+Math.random()*16,-42-Math.random()*26);var w=26+Math.random()*26;c.scale.set(w,w*(.3+Math.random()*.16),1);c.userData.v=th.clouds.sp*(.6+Math.random()*.8);add(c);cl.push(c)}
      anim.push(function(t,dt){cl.forEach(function(c){c.position.x+=c.userData.v*dt;if(c.position.x>75)c.position.x=-75})})}
    // ground
    var gg=new T.PlaneGeometry(110,110,70,70);gg.rotateX(-Math.PI/2);var gp=gg.attributes.position;
    for(i=0;i<gp.count;i++)gp.setY(i,hillY(gp.getX(i),gp.getZ(i),th.hills));gg.computeVertexNormals();
    var ground=new T.Mesh(gg,mat(th.ground,{roughness:1,map:soilTex()}));ground.receiveShadow=true;add(ground);
    var firePos=th.props.indexOf("fire")>=0?{x:1.02,z:-1.35}:th.props.indexOf("fires")>=0?{x:1.7,z:-1.9}:null;
    // grass: crossed blade cards, bent by the wind
    var G=th.grass,GN=Math.round(G.n*1.15),dm=new T.Object3D(),col=new T.Color();
    var grass=new T.InstancedMesh(crossGeo(),sway(new T.MeshStandardMaterial({map:grassTex(),alphaTest:.4,side:T.DoubleSide,roughness:1}),.2),GN);
    var onPath=th.props.indexOf("path")>=0;
    scatter(GN,1.0,19,firePos).forEach(function(p,k){dm.position.set(p[0],hillY(p[0],p[1],th.hills)-.01,p[1]);dm.rotation.set(0,Math.random()*6.28,0);
      var dd=Math.hypot(p[0],p[1]),near=Math.max(.32,Math.min(1,(dd-.9)/3.2)),w=(.5+Math.random()*.5)*G.size,hgt=(G.h/.35)*(.2+Math.random()*.24)*G.size*near;
      if(onPath&&Math.abs(p[0])<1.1&&p[1]<1){w=0;hgt=0}dm.scale.set(w,hgt,w);dm.updateMatrix();
      grass.setMatrixAt(k,dm.matrix);grass.setColorAt(k,col.setHSL(G.hue+Math.random()*.07,G.s+.05,Math.min(.6,G.l*1.25+Math.random()*.16)))});
    grass.receiveShadow=true;add(grass);
    if(th.flowers){var F=th.flowers,head=new T.SphereGeometry(.045,6,5);head.scale(1,.55,1);head.translate(0,.34,0);
      var fl=new T.InstancedMesh(head,sway(mat(0xffffff,{roughness:.8}),.3),F.n);
      scatter(F.n,1.4,15,firePos).forEach(function(p,k){dm.position.set(p[0],hillY(p[0],p[1],th.hills),p[1]);dm.rotation.set(0,Math.random()*6.28,0);var s3=.7+Math.random()*.7;dm.scale.set(s3,s3,s3);dm.updateMatrix();
        fl.setMatrixAt(k,dm.matrix);fl.setColorAt(k,col.set(F.c[k%F.c.length]))});add(fl)}
    if(th.trees){th.trees.at.forEach(function(t,k){makeTree(th.trees.kind,t[0],t[1],t[2],(k*.37)%1+.05,th)});flushLeaves(["#d9661a","#e88a1c","#c4441a","#f0a52a","#b5381c","#8a2a14"],"autumn")}
    th.props.forEach(function(p){PROPS[p](th)});
    th.parts.forEach(particles);
  }

  // hunter
  var J=null,holder=group();scene.add(holder);
  var bed=group();bed.add(mesh(new T.BoxGeometry(.78,.05,1.95),cloth(0x4a2626),0,.025,.03));
  var pillow=mesh(new T.CylinderGeometry(.11,.11,.5,10),cloth(0x5a4030),0,.09,-.86);pillow.rotation.z=Math.PI/2;bed.add(pillow);holder.add(bed);
  var ground2=group();scene.add(ground2);
  var pose="stand",gear={},shape=null;
  function applyGear(g){
    gear=g||{};if(!J)return;J.cape=J.tabard=J.plume=null;
    [J.helmet,J.chestGear,J.waistGear,J.back,J.weapon,J.armL.pauldron,J.armR.pauldron,J.armL.gauntlet,J.armR.gauntlet,J.legL.boot,J.legR.boot,J.legL.cuisse,J.legR.cuisse].filter(Boolean).forEach(clear);
    if(gear.helmet)J.helmet.add(buildHelmet(gear.helmet.tier,gear.helmet.color,J));
    J.hair.visible=!gear.helmet;J.strap.visible=!gear.chest;
    if(J.kind==="body")J.dress(gear);
    else{
      if(gear.chest)buildChest(gear.chest.tier,gear.chest.color,J);
      if(gear.gauntlets)buildGauntlets(gear.gauntlets.tier,gear.gauntlets.color,J);
      if(gear.boots)buildBoots(gear.boots.tier,gear.boots.color,J);
    }
    shape=gear.weapon?gear.weapon.shape:null;
    if(gear.weapon){J.weapon.add(buildWeapon(shape,gear.weapon.tier,gear.weapon.color));if(shape==="bow")J.back.add(buildQuiver(gear.weapon.tier,gear.weapon.color))}
    if(J.cape)J.cape.visible=pose!=="sleep";
    placeWeapon();
  }
  function placeWeapon(){
    if(!J)return;var w=J.weapon;if(w.parent)w.parent.remove(w);
    if(!shape)return;
    if(pose==="sleep"){ground2.add(w);
      w.position.set(shape==="bow"?-.2:-.55,shape==="bow"?.03:.04,.78);w.rotation.set(Math.PI/2,0,shape==="bow"?Math.PI/2:1.75)}
    else{J.armR.hand.add(w);w.position.set(0,0,0);
      if(shape==="halberd"){w.rotation.set(.32,0,0);w.position.set(0,-.02,0)}
      else if(shape==="bow")w.rotation.set(1.25,.35,0);
      else w.rotation.set(1.0,0,.3)}
  }
  function setPose(p){
    pose=p==="sleep"?"sleep":"stand";if(!J)return;
    if(J.kind==="body"){holder.rotation.y=pose==="sleep"?1.3:-.25;J.pose(pose,shape);J.lid(pose==="sleep");bed.visible=pose==="sleep"&&!(theme&&theme.rest);if(J.cape)J.cape.visible=pose!=="sleep";placeWeapon();return}
    var L=J.armL,R=J.armR;
    [L.sh,L.el,R.sh,R.el,J.legL.hip,J.legL.knee,J.legR.hip,J.legR.knee,J.head,J.torso,J.hips].forEach(function(o){o.rotation.set(0,0,0)});
    if(pose==="sleep"){
      holder.rotation.y=1.3;holder.position.set(0,0,0);J.av.rotation.x=-Math.PI/2;J.av.position.set(0,.19,.9);
      L.sh.rotation.set(-.38,0,.12);L.el.rotation.set(-.25,0,-1.3);R.sh.rotation.set(0,0,-.32);R.el.rotation.set(-.2,0,0);
      J.legL.hip.rotation.x=-.62;J.legL.knee.rotation.x=1.1;J.legR.hip.rotation.z=-.08;J.head.rotation.z=.22;J.head.rotation.x=-.12;
      J.lid(true);bed.visible=!(theme&&theme.rest);
    }else{
      holder.rotation.y=-.25;holder.position.set(0,0,0);J.av.rotation.x=0;J.av.position.set(0,0,0);
      L.sh.rotation.z=.11;L.el.rotation.x=-.22;R.sh.rotation.set(-.2,0,-.12);R.el.rotation.x=-.5;
      if(shape==="halberd"){R.sh.rotation.set(-.55,0,-.2);R.el.rotation.x=-1.1}
      if(shape==="bow"){R.sh.rotation.set(-.35,0,-.25);R.el.rotation.x=-.9}
      J.lid(false);bed.visible=false;
    }
    if(J.cape)J.cape.visible=pose!=="sleep";
    placeWeapon();
  }

  // camera and input
  var az=0,azT=0,drift=0,dragging=false,sx0=0,sy0=0,moved=false,onTap=null;
  canvas.style.touchAction="pan-y";canvas.style.cursor="grab";
  canvas.addEventListener("pointerdown",function(e){dragging=true;moved=false;sx0=e.clientX;sy0=e.clientY;canvas.style.cursor="grabbing"});
  window.addEventListener("pointermove",function(e){if(!dragging)return;var dx=e.clientX-sx0;if(Math.abs(dx)>5||Math.abs(e.clientY-sy0)>5)moved=true;
    if(moved){azT=Math.max(-1.25,Math.min(1.25,azT-dx*.008));sx0=e.clientX;drift=0}});
  function up(e){if(!dragging)return;dragging=false;canvas.style.cursor="grab";if(moved||e.type==="pointercancel")return;
    var r=canvas.getBoundingClientRect(),v=new T.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1)),rc=new T.Raycaster();rc.setFromCamera(v,cam);
    if(fire&&rc.intersectObject(fire,true).length){flare=1;return}
    if(rc.intersectObject(holder,true).length&&onTap)onTap()}
  window.addEventListener("pointerup",up);window.addEventListener("pointercancel",up);

  var active=false,raf=0,last=0,t=0;
  function frame(now){
    raf=0;if(!active)return;
    var dt=Math.min(.05,(now-last)/1000||0);last=now;t+=dt;uTime.value=t;
    var sleep=pose==="sleep",br=Math.sin(t*(sleep?1.45:2.1));
    if(!J){}
    else if(J.kind==="body")J.tick(t,sleep,br);
    else if(sleep){J.chest.scale.set(1+br*.008,1,1+br*.07);J.armL.sh.rotation.x=-.38-br*.03;J.head.rotation.z=.22+Math.sin(t*.21)*.03}
    else{J.chest.scale.set(1+br*.008,1,1+br*.028);J.armL.sh.position.y=J.armR.sh.position.y=.522+br*.005;J.hips.rotation.y=Math.sin(t*.45)*.06;J.torso.rotation.z=Math.sin(t*.6)*.012;
      J.head.rotation.y=Math.sin(t*.33)*.3;J.head.rotation.x=Math.sin(t*.27)*.05;J.lid((t%4.6)<.13)}
    if(J&&J.cape&&J.cape.visible){var cp=J.cape.geometry.attributes.position,b=J.cape.userData.base;
      for(var i=0;i<cp.count;i++){var v=-b[i*3+1]/1.02,x=b[i*3];cp.setZ(i,-v*v*.16-Math.sin(t*1.7+v*4.2+x*3)*.04*v);cp.setX(i,x*(1+v*.25)+Math.sin(t*1.2+v*3)*.02*v)}
      cp.needsUpdate=true;J.cape.geometry.computeVertexNormals()}
    if(J&&J.tabard)J.tabard.rotation.x=-.1+Math.sin(t*1.4)*.035;
    if(J&&J.plume)J.plume.rotation.z=Math.sin(t*1.9)*.12;
    for(var k=0;k<anim.length;k++)anim[k](t,dt);
    if(!dragging&&!REDUCED){drift+=dt;if(drift>3)azT+=Math.sin(t*.12)*dt*.03}
    az+=(azT-az)*Math.min(1,dt*6);
    var ty=sleep?.5:1.02,rad=sleep?4.3:3.55;
    cam.position.set(Math.sin(az)*rad,ty+(sleep?.7:.42),Math.cos(az)*rad);cam.lookAt(0,ty,0);
    renderer.render(scene,cam);
    if(!REDUCED||dragging||Math.abs(azT-az)>.002||flare>0||t<.4)raf=requestAnimationFrame(frame);
    else setTimeout(function(){if(active&&!raf)raf=requestAnimationFrame(frame)},400);
  }
  function size(){var w=canvas.clientWidth||300,hh=canvas.clientHeight||300;renderer.setSize(w,hh,false);cam.aspect=w/hh;cam.updateProjectionMatrix()}
  if(window.ResizeObserver)new ResizeObserver(function(){size();if(active&&!raf)raf=requestAnimationFrame(frame)}).observe(canvas);
  function kick(){if(active&&!raf)raf=requestAnimationFrame(frame)}
  buildWorld("camp");
  function adopt(j){J=j;holder.add(J.av);applyGear(gear);setPose(pose);kick()}
  loadBody("hunter.bin").then(function(d){adopt(buildBody(d))}).catch(function(){adopt(buildHunter())});
  return{
    canvas:canvas,
    setGear:function(g){applyGear(g);kick()},
    setScene:function(id){if(id!==themeId||!world){buildWorld(id);setPose(pose)}kick()},
    getScene:function(){return themeId},
    setPose:function(p){setPose(p);kick()},
    getPose:function(){return pose},
    onTap:function(fn){onTap=fn},
    setActive:function(on){on=!!on;if(on===active)return;active=on;if(on){size();last=performance.now();if(!raf)raf=requestAnimationFrame(frame)}else if(raf){cancelAnimationFrame(raf);raf=0}}
  };
}
window.HunterScene={create:create};
})();
