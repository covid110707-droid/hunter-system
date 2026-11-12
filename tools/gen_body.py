# Builds the hunter body from the MakeHuman base mesh DATA files (CC0): base.obj, morph targets, rig joints and weights.
# No code from the add-on is executed; this script only reads its data files.
import sys,json,gzip,struct,math,os,random
import numpy as np
D=sys.argv[1]; OUT=sys.argv[2]; EXPLORE=len(sys.argv)>3
def P(*a): return os.path.join(D,*a)
# ---- base mesh
V=[];faces=[];groups={};cur=None
for line in open(P('3dobjs','base.obj')):
    if line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('g '): cur=line.split()[1]; groups.setdefault(cur,[])
    elif line.startswith('f '): groups[cur].append([int(t.split('/')[0])-1 for t in line.split()[1:]])
V=np.array(V,dtype=np.float64)
def target(rel,w):
    if w==0: return
    with gzip.open(P('targets',rel+'.target.gz'),'rt') as f:
        for ln in f:
            if not ln.strip() or ln[0]=='#': continue
            a=ln.split(); V[int(a[0])]+=w*np.array([float(a[1]),float(a[2]),float(a[3])])
M='macrodetails/'
target(M+'caucasian-male-young',1)
target(M+'universal-male-young-maxmuscle-averageweight',1)
target(M+'height/male-young-maxmuscle-averageweight-maxheight',.35)
target(M+'proportions/male-young-maxmuscle-averageweight-idealproportions',1)
for t,w in [('head/head-square',.55),('chin/chin-prominent-incr',.45),('chin/chin-width-incr',.45),('chin/chin-bones-incr',.4),
            ('cheek/l-cheek-bones-incr',.5),('cheek/r-cheek-bones-incr',.5),('cheek/l-cheek-volume-decr',.45),('cheek/r-cheek-volume-decr',.45),
            ('neck/measure-neck-circ-incr',.5),('torso/torso-muscle-pectoral-incr',.6),('torso/torso-muscle-dorsi-incr',.5),
            ('arms/l-upperarm-shoulder-muscle-incr',.45),('arms/r-upperarm-shoulder-muscle-incr',.45),
            ('arms/l-upperarm-muscle-incr',.6),('arms/r-upperarm-muscle-incr',.6),('arms/l-lowerarm-muscle-incr',.3),('arms/r-lowerarm-muscle-incr',.3)]:
    target(t,w)
V*=0.1  # decimetres -> metres; x = character's left, y = up, z = front
def cube(name): return V[sorted({i for f in groups[name] for i in f})].mean(axis=0)
ground=cube('joint-ground')[1]; V[:,1]-=ground
# ---- rig
rig=json.load(open(P('rigs','standard','rig.game_engine.json')))
def pos(spec):
    s=spec.get('strategy')
    if s=='CUBE' and spec.get('cube_name') in groups: return cube(spec['cube_name'])
    if s=='MEAN': return V[spec['vertex_indices']].mean(axis=0)
    if s=='VERTEX': return V[spec['vertex_index']]
    d=spec['default_position']; return np.array([d[0],d[2],-d[1]])
bones={n:{'h':pos(b['head']),'t':pos(b['tail']),'p':b['parent']} for n,b in rig.items()}
order=[];
def add(n):
    if n in order: return
    if bones[n]['p']: add(bones[n]['p'])
    order.append(n)
for n in rig: add(n)
W=json.load(open(P('rigs','standard','weights.game_engine.json')))['weights']
nv=len(V); wts=[[] for _ in range(nv)]
for b,lst in W.items():
    bi=order.index(b)
    for i,w in lst: wts[i].append((w,bi))
if EXPLORE:
    print('strategies',{b[k].get('strategy') for b in rig.values() for k in ('head','tail')})
    for n in order: print(n,bones[n]['p'],np.round(bones[n]['h'],3),np.round(bones[n]['t'],3))
    for g in ['body','helper-tights','helper-l-eye','helper-hair','helper-skirt']:
        idx=sorted({i for f in groups[g] for i in f}); print(g,len(groups[g]),len(idx),np.round(V[idx].min(0),3),np.round(V[idx].max(0),3), 'weighted',sum(1 for i in idx if wts[i]))
    for j in ['joint-l-eye','joint-head','joint-head-2','joint-jaw','joint-mouth','joint-l-knee','joint-pelvis','joint-l-upper-leg','joint-neck','joint-l-shoulder','joint-l-elbow','joint-l-hand']:
        if j in groups: print(j,np.round(cube(j),3))
    sys.exit()

# ---- scale to game height
S=1.86/V[sorted({i for f in groups['body'] for i in f})][:,1].max()
V*=S
for b in bones.values(): b['h']=b['h']*S; b['t']=b['t']*S
dom=[max(w)[1] if w else 0 for w in wts]
bi={n:i for i,n in enumerate(order)}
def J(n): return cube(n)
kneeY=J('joint-l-knee')[1]; hipY=J('joint-l-upper-leg')[1]
waistY=hipY+.075*S/0.932; hemY=kneeY+.5*(hipY-kneeY)
under={bi['pelvis'],bi['thigh_l'],bi['thigh_r'],bi['spine_01']}
tris=[];kind=[]
def addf(f,k):
    for a in range(1,len(f)-1): tris.append((f[0],f[a],f[a+1])); kind.append(k)
for f in groups['body']:
    ys=V[f][:,1]
    if all(dom[i] in under for i in f) and ys.min()>hemY+.012 and ys.max()<waistY-.012 and np.abs(V[f][:,0]).max()<.3: continue
    addf(f,0)
short=set()
for f in groups['helper-tights']:
    ys=V[f][:,1]
    if ys.min()>=hemY-.004 and ys.max()<=waistY+.004 and np.abs(V[f][:,0]).max()<.3:
        addf(f,1); short.update(f)
used=sorted({i for t in tris for i in t}); remap={o:n for n,o in enumerate(used)}
P3=V[used].copy(); T=np.array([[remap[i] for i in t] for t in tris],dtype=np.int64)
isShort=np.array([o in short for o in used])
def normals(P,T):
    n=np.zeros_like(P); fn=np.cross(P[T[:,1]]-P[T[:,0]],P[T[:,2]]-P[T[:,0]])
    for k in range(3): np.add.at(n,T[:,k],fn)
    return n/np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-12)
N=normals(P3,T)
FLIP=N[P3[:,1].argmax()][1]<0
if FLIP: T=T[:,::-1].copy(); N=-N
P3[isShort]+=N[isShort]*.004
N=normals(P3,T)
# ---- ambient occlusion baked to vertex colour (gives the muscle definition its shading)
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
bvh=BVHTree.FromPolygons([Vector(p) for p in P3.tolist()],T.tolist())
rng=np.random.default_rng(3)
def hemi(n,count):
    v=rng.normal(size=(count,3)); v/=np.linalg.norm(v,axis=1,keepdims=True); d=v@n; v[d<0]-=2*np.outer(d[d<0],n); return v
def ao(dist,count):
    out=np.ones(len(P3))
    for i in range(len(P3)):
        o=Vector((P3[i]+N[i]*.0015).tolist()); occ=0.0
        for d in hemi(N[i],count):
            h=bvh.ray_cast(o,Vector(d.tolist()),dist)
            if h[0] is not None: occ+=1-h[3]/dist
        out[i]=1-occ/count
    return out
aoL=ao(.3,40); aoS=ao(.035,28)
aoS=np.clip((aoS-.45)/.55,0,1)
def lin(c): c=np.array(c,dtype=np.float64); return np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4)
skin=np.array([.80,.585,.46]); eye=J('joint-l-eye')
col=np.tile(skin,(len(P3),1))
headB=bi['head']; domU=np.array([dom[o] for o in used])
jaw=J('joint-jaw'); 
# stubble on the jaw and upper lip, darker scalp under the hair
for i in np.where(domU==headB)[0]:
    x,y,z=P3[i]
    if z>eye[2]-.075 and y<eye[1]-.047:
        k=min(1,(eye[1]-.047-y)/.02)*min(1,max(0,(z-(eye[2]-.075))/.03)); col[i]=col[i]*(1-.42*k)+np.array([.27,.2,.17])*.42*k
    if (y>eye[1]+.075 and z<eye[2]-.01) or y>eye[1]+.09 or (z<eye[2]-.12 and y>eye[1]-.02):
        col[i]=col[i]*.45+np.array([.16,.11,.08])*.55
for i in np.where(domU==headB)[0]:
    x,y,z=P3[i]; ax=abs(x)
    if z>eye[2]-.03 and .006<ax<.056:
        arch=eye[1]+.0165+.004*math.sin((ax-.006)/.05*math.pi)-.004*max(0,(ax-.04)/.016)
        k=max(0,1-abs(y-arch)/.0055)
        if k>0: col[i]=col[i]*(1-.85*k)+np.array([.1,.07,.05])*.85*k
col[isShort]=np.array([.07,.07,.085])
shade=(.5+.5*aoL)*(.62+.38*aoS)
warm=np.array([1.0,.74,.64])
t=((1-aoS)*.6)[:,None]
col=col*shade[:,None]*(1-t+t*warm)
col[isShort]=np.array([.07,.07,.085])*(.55+.45*aoL[isShort,None])*(.7+.3*aoS[isShort,None])
col=lin(np.clip(col,0,1)).astype(np.float32)
# ---- measurements for fitting gear, hair and eyes
def axisR(bone,lo=.25,hi=.75):
    h=bones[bone]['h'];t=bones[bone]['t'];d=t-h;L=np.linalg.norm(d);d/=L
    idx=np.where(domU==bi[bone])[0]; rel=P3[idx]-h; al=rel@d; m=(al>lo*L)&(al<hi*L)
    return float(np.linalg.norm(rel[m]-np.outer(al[m],d),axis=1).max())
hv=P3[(domU==headB)&(P3[:,1]>eye[1])]
tor=np.isin(domU,[bi['spine_01'],bi['spine_02'],bi['spine_03'],bi['pelvis']])&~isShort
def band(y0,y1):
    m=tor&(P3[:,1]>y0)&(P3[:,1]<y1); p=P3[m]; return [float(np.abs(p[:,0]).max()),float(p[:,2].max()),float(-p[:,2].min())]
sh=bones['upperarm_l']['h'][1]
eidx=sorted({i for f in groups['helper-l-eye'] for i in f}); er=float((V[eidx][:,0].max()-V[eidx][:,0].min())/2)

LM={'eye':[float(x) for x in eye],'eyeR':er,'jaw':[float(x) for x in jaw],'top':float(hv[:,1].max()),'skullX':float(np.abs(hv[:,0]).max()),'skullF':float(hv[:,2].max()),'skullB':float(hv[:,2].min()),
       'chest':band(sh-.2,sh-.1),'waist':band(waistY+.02,waistY+.1),'hip':band(hipY-.02,hipY+.06) if (tor&(P3[:,1]>hipY-.02)&(P3[:,1]<hipY+.06)).any() else None,
       'rUpper':axisR('upperarm_l'),'rFore':axisR('lowerarm_l'),'rThigh':axisR('thigh_l'),'rCalf':axisR('calf_l'),'waistY':float(waistY),'hemY':float(hemY)}
# ---- fitted pieces: shells grown from the body's own surface, sharing its skin weights
flip=bool(FLIP)
def vnormals(faces):
    n=np.zeros_like(V)
    for f in faces:
        for a in range(1,len(f)-1):
            fn=np.cross(V[f[a]]-V[f[0]],V[f[a+1]]-V[f[0]]); n[f[0]]+=fn; n[f[a]]+=fn; n[f[a+1]]+=fn
    n/=np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-12)
    return -n if flip else n
Nt=vnormals(groups['helper-tights']); Nb=vnormals(groups['body']); Ns=vnormals(groups['helper-skirt'])
def fdom(f):
    c={}
    for i in f: c[dom[i]]=c.get(dom[i],0)+1
    return max(c,key=c.get)
B=lambda *n:{bi[x] for x in n}
neckY=bones['neck_01']['h'][1]
fingers={i for n,i in bi.items() if n.split('_')[0] in('index','middle','ring','pinky','thumb')}
sel={'cuirass':[],'uarm':[],'farm':[],'thigh':[],'shin':[]}
armB={}
for sd in ('_l','_r'):
    h=bones['upperarm'+sd]['h']; t=bones['upperarm'+sd]['t']; L=np.linalg.norm(t-h); armB[sd]=(h,(t-h)/L,L)
legset=B('thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r','ball_l','ball_r')
for f in groups['helper-tights']:
    d=fdom(f); ys=V[f][:,1]; c=V[f].mean(axis=0)
    if d in B('spine_01','spine_02','spine_03','clavicle_l','clavicle_r','neck_01','pelvis'):
        if ys.min()>waistY-.035 and ys.max()<neckY+.012: sel['cuirass'].append(f)
    elif d in B('upperarm_l','upperarm_r','lowerarm_l','lowerarm_r'):
        h,dv,L=armB['_l' if c[0]>0 else '_r']; sel['uarm' if (c-h)@dv<L-.012 else 'farm'].append(f)
    elif d in legset:
        if ys.max()<kneeY+.035: sel['shin'].append(f)
        elif ys.max()<hemY+.05 and ys.min()>kneeY-.02: sel['thigh'].append(f)
hand=[f for f in groups['body'] if fdom(f) in (B('hand_l','hand_r')|fingers)]
skirt=[f for f in groups['helper-skirt'] if V[f][:,1].min()>hemY+.05 and V[f][:,1].max()<waistY+.03]
# hair: grown from the scalp with a low hairline, short sides and volume on top
cz=(hv[:,2].max()-.022+hv[:,2].min())/2; hz=(hv[:,2].max()-.022-hv[:,2].min())/2
def hairline(z):
    f0=eye[2]-.035; f1=eye[2]-.095; b=hv[:,2].min()+.055
    if z>=f0: return eye[1]+.05
    if z>=f1: return eye[1]+.05-(f0-z)/(f0-f1)*.048
    if z>=b: return eye[1]+.002-(f1-z)/max(1e-6,f1-b)*.05
    return eye[1]-.048
scalp=[f for f in groups['body'] if all(dom[i]==headB for i in f) and all(V[i][1]>hairline(V[i][2]) for i in f)]
def hair_off(i):
    x,y,z=V[i]; top=min(1,max(0,(y-(eye[1]+.03))/.06)); top=top*top*(3-2*top); fr=max(0,(z-cz)/hz)
    edge=min(1,max(0,(y-hairline(z))/.02))
    n=.5+.5*math.sin(x*190+y*70)*math.cos(z*160+y*40)
    return (.004+.019*top+.013*fr*top)*(.35+.65*edge)*(.86+.28*n)
parts=[('hair',scalp,Nb,hair_off),('cuirass',sel['cuirass'],Nt,lambda i:.013),('skirt',skirt,Ns,lambda i:.02),('uarm',sel['uarm'],Nt,lambda i:.012),
       ('farm',sel['farm'],Nt,lambda i:.010),('hand',hand,Nb,lambda i:.0055),('thigh',sel['thigh'],Nt,lambda i:.013),('shin',sel['shin'],Nt,lambda i:.012)]
PP=[P3.astype(np.float64)];CC=[col];WI=list(used);TT=[T];ranges=[{'n':'body','start':0,'count':int(T.size)}];base=len(P3);istart=int(T.size)
for name,faces,Nsrc,off in parts:
    vs=sorted({i for f in faces for i in f}); rm={o:base+k for k,o in enumerate(vs)}
    PP.append(np.array([V[i]+Nsrc[i]*off(i) for i in vs])); CC.append(np.ones((len(vs),3),dtype=np.float32)); WI+=vs
    tt=[]
    for f in faces:
        for a in range(1,len(f)-1):
            t=(rm[f[0]],rm[f[a]],rm[f[a+1]]); tt.append(t[::-1] if flip else t)
    tt=np.array(tt,dtype=np.int64); TT.append(tt); ranges.append({'n':name,'start':istart,'count':int(tt.size)}); istart+=int(tt.size); base+=len(vs)
    print(name,len(vs),len(tt))
P3=np.vstack(PP); col=np.vstack(CC).astype(np.float32); T=np.vstack(TT); used=WI
UV=np.stack([P3[:,0]*16+P3[:,2]*9,P3[:,1]*16+P3[:,2]*5],axis=1).astype(np.float32)
# ---- skin weights (top 4, normalised to bytes)
SI=np.zeros((len(P3),4),dtype=np.uint8); SW=np.zeros((len(P3),4),dtype=np.uint8)
for n,o in enumerate(used):
    w=sorted(wts[o],reverse=True)[:4] or [(1.0,0)]
    tot=sum(a for a,_ in w); q=[int(round(a/tot*255)) for a,_ in w]; q[0]+=255-sum(q)
    for k,(a,b) in enumerate(w): SI[n,k]=b; SW[n,k]=q[k]
meta={'parts':ranges,'bones':[{'n':n,'p':bones[n]['p'],'h':[round(float(x),5) for x in bones[n]['h']],'t':[round(float(x),5) for x in bones[n]['t']]} for n in order],
 'nv':int(len(P3)),'ni':int(T.size),'cz':float(cz),'hz':float(hz),
 'lm':LM}
hj=json.dumps(meta,separators=(',',':')).encode(); hj+=b' '*((4-len(hj)%4)%4)
idx=T.astype(np.uint16 if len(P3)<65536 else np.uint32)
with open(OUT,'wb') as f:
    f.write(struct.pack('<I',len(hj))); f.write(hj); f.write(P3.astype(np.float32).tobytes()); f.write(col.tobytes()); f.write(UV.tobytes()); f.write(SI.tobytes()); f.write(SW.tobytes()); f.write(idx.tobytes())
print('verts',len(P3),'tris',len(T),'bytes',os.path.getsize(OUT)); print(json.dumps(meta['lm']))
