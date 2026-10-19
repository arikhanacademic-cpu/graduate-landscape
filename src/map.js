import {SCALE,project,colourAt,contourRadii,heightFor,hasEarnings,metricFor,money,shortName,coastlinePaths} from './model.js';
const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs={})=>{const node=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));return node;};
const pathString=polygons=>polygons.map(p=>p.map(r=>r.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(5)},${y.toFixed(5)}`).join('')+'Z').join('')).join('');
const initialBox=[-4.2,-6.55,8.4,12];

export class LandscapeMap {
  constructor({geo,onSelect,onHover}) {
    this.geo=geo;this.onSelect=onSelect;this.onHover=onHover;this.box=[...initialBox];this.view='flat';
    this.flat=document.querySelector('#flat-map');this.threeHost=document.querySelector('#three-map');
    this.svg=el('svg',{viewBox:this.box.join(' '),role:'group','aria-label':'University earnings contour map; use university search as an alternative'});
    this.flat.append(this.svg);this.setupFlat();
    this.flat.addEventListener('wheel',e=>{e.preventDefault();this.zoom(e.deltaY>0?0.88:1.12);},{passive:false});
    let drag;
    this.svg.addEventListener('pointerdown',e=>{if(e.target.closest('[data-provider]'))return;drag={x:e.clientX,y:e.clientY,box:[...this.box]};this.svg.setPointerCapture(e.pointerId);});
    this.svg.addEventListener('pointermove',e=>{if(!drag)return;const rect=this.svg.getBoundingClientRect(),scale=Math.min(rect.width/this.box[2],rect.height/this.box[3]);this.box[0]=drag.box[0]-(e.clientX-drag.x)/scale;this.box[1]=drag.box[1]-(e.clientY-drag.y)/scale;this.applyBox();});
    this.svg.addEventListener('pointerup',()=>drag=null);
    this.svg.addEventListener('pointercancel',()=>drag=null);
  }
  setupFlat(){
    const defs=el('defs');const clip=el('clipPath',{id:'land-clip'});const uk=coastlinePaths(this.geo).find(p=>p.name==='United Kingdom');
    clip.append(el('path',{d:pathString(uk.polygons),'clip-rule':'evenodd'}));defs.append(clip);this.svg.append(defs);
    const graticule=el('g',{class:'graticule'});
    for(let lat=50;lat<=60;lat+=2){const y=project(0,lat)[1];graticule.append(el('path',{d:`M-4.6 ${y}H4.6`}));const t=el('text',{transform:`translate(-3.97 ${y-.08}) scale(.012)`});t.textContent=`${lat}°N`;graticule.append(t);}
    for(let lon=-8;lon<=2;lon+=2){const x=project(lon,54)[0];graticule.append(el('path',{d:`M${x} -6V5.4`}));}
    this.svg.append(graticule);
    const land=el('g',{class:'land'});
    for(const feature of coastlinePaths(this.geo)){
      feature.polygons.forEach(poly=>{
        const average=poly[0].reduce((a,[x,y])=>[a[0]+x/poly[0].length,a[1]+y/poly[0].length],[0,0]);
        const ni=feature.name==='United Kingdom' && average[0]<-1.5 && average[1]>-.9 && average[1]<1.1;
        land.append(el('path',{d:pathString([poly]),'fill-rule':'evenodd',class:feature.name==='Ireland'?'ireland':ni?'northern-ireland':'britain'}));
      });
    }
    this.svg.append(land);
    this.hills=el('g',{'clip-path':'url(#land-clip)'});this.svg.append(this.hills);
    this.markers=el('g');this.svg.append(this.markers);this.labels=el('g',{class:'place-labels'});this.svg.append(this.labels);
    const note=el('g',{class:'ni-note',transform:'translate(-2.7 .08) scale(.0125)'});const t1=el('text',{y:0});t1.textContent='NORTHERN IRELAND';const t2=el('text',{y:18.4});t2.textContent='Not covered by this dataset';note.append(t1,t2);this.svg.append(note);
    const ireland=el('text',{transform:'translate(-3.1 2) scale(.013)',class:'ireland-label'});ireland.textContent='IRELAND';this.svg.append(ireland);
  }
  update(providers,subject,selected){
    this.providers=providers;this.subject=subject;this.selected=selected;
    this.hills.replaceChildren();this.markers.replaceChildren();this.labels.replaceChildren();
    for(const p of providers){
      if(!p.location)continue;const [x,y]=project(p.location.lon,p.location.lat);const metric=metricFor(p,subject);const valid=hasEarnings(metric);const active=p.id===selected;
      if(valid){
        const group=el('g',{transform:`translate(${x} ${y})`,class:'hill'});
        group.append(el('circle',{r:SCALE.radius,fill:colourAt(0)}));
        for(const ring of contourRadii(metric.median)){group.append(el('circle',{r:ring.radius,fill:colourAt(ring.value),stroke:'#f4f1d9','stroke-width':.006,'stroke-opacity':.7}));}
        this.hills.append(group);
      }
      const group=el('g',{'data-provider':p.id,role:'button',tabindex:'0',class:`university-marker ${active?'selected':''} ${valid?'':'unavailable'}`,
        'aria-label':`${shortName(p.name)}, ${valid?money(metric.median):'five-year earnings not published'}`,'aria-pressed':String(active),transform:`translate(${x} ${y})`});
      group.append(el('circle',{r:active?.11:.043,class:'marker-ring'}));group.append(el('circle',{r:.018,class:'marker-core'}));
      const title=el('title');title.textContent=`${shortName(p.name)} · ${valid?money(metric.median):'Not published'}`;group.append(title);
      group.addEventListener('click',()=>this.onSelect(p.id));
      group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.onSelect(p.id);this.markers.querySelector(`[data-provider="${p.id}"]`)?.focus({preventScroll:true});}});
      group.addEventListener('pointerenter',e=>this.onHover(p,e));group.addEventListener('pointerleave',()=>this.onHover(null));
      this.markers.append(group);
    }
    // Sparse geographic labels are decorative; every university is searchable.
    const cities=[['Edinburgh',-3.19,55.95,.3,-.18],['Glasgow',-4.25,55.86,-.34,-.12],['Newcastle',-1.61,54.98,.3,-.1],['Manchester',-2.24,53.48,-.35,-.13],['Cardiff',-3.18,51.48,-.28,-.1],['Bristol',-2.59,51.45,.27,.27],['Oxford',-1.25,51.75,-.3,-.18],['Cambridge',.12,52.21,.25,-.2],['London',-.12,51.51,.4,.15],['Exeter',-3.53,50.72,-.3,-.12]];
    for(const [name,lon,lat,dx,dy] of cities){const [x,y]=project(lon,lat);const t=el('text',{transform:`translate(${x+dx} ${y+dy}) scale(.015)`,'text-anchor':dx<0?'end':'start'});t.textContent=name;this.labels.append(el('path',{d:`M${x} ${y}L${x+dx*.8} ${y+dy*.8}`,stroke:'#6d8972','stroke-width':.008,opacity:.65,fill:'none','pointer-events':'none'}),t);}
    if(this.three)this.updateThree();
  }
  applyBox(){this.svg.setAttribute('viewBox',this.box.join(' '));}
  zoom(factor){if(this.view==='three'&&this.three){const {camera,controls}=this.three;camera.zoom=Math.max(.7,Math.min(8,camera.zoom*factor));camera.updateProjectionMatrix();controls.update();return;}
    const width=Math.max(1.2,Math.min(12,this.box[2]/factor)),ratio=width/this.box[2];this.box=[this.box[0]+this.box[2]*(1-ratio)/2,this.box[1]+this.box[3]*(1-ratio)/2,width,this.box[3]*ratio];this.applyBox();}
  focus(provider){if(!provider?.location)return;const [x,y]=project(provider.location.lon,provider.location.lat);
    if(this.view==='three'&&this.three){const {camera,controls,THREE}=this.three;const offset=camera.position.clone().sub(controls.target);controls.target.set(x,-y,0);camera.position.copy(controls.target).add(offset);camera.zoom=2.1;camera.updateProjectionMatrix();controls.update();}
    else{const w=3.5,h=w*initialBox[3]/initialBox[2];this.box=[x-w/2,y-h/2,w,h];this.applyBox();}}
  reset(){this.box=[...initialBox];this.applyBox();if(this.three){this.three.controls.reset();this.three.camera.zoom=1;this.three.camera.updateProjectionMatrix();}}
  async setView(view){
    if(view==='three'&&!this.three){await this.setupThree();}
    this.view=view;this.flat.hidden=view!=='flat';this.threeHost.hidden=view!=='three';
    if(view==='three'){this.three.resize();this.tiltCamera();}
  }
  tiltCamera(){const {camera,controls,THREE}=this.three;controls.target.set(0,0,0);camera.zoom=1;camera.updateProjectionMatrix();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,start=performance.now();
    const step=now=>{if(this.view!=='three')return;const t=reduced?1:Math.min(1,(now-start)/650);const k=t*t*(3-2*t);camera.position.set(0,-.1-10*k,18-5*k);camera.lookAt(0,0,0);controls.update();if(t<1)requestAnimationFrame(step);else controls.saveState();};requestAnimationFrame(step);}
  async setupThree(){
    const THREE=await import('three');const {OrbitControls}=await import('three/addons/controls/OrbitControls.js');
    const {hillGeometry}=await import('./terrain.js');
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xdce6e6,0);
    const canvas=renderer.domElement;canvas.setAttribute('aria-label','Rotatable 3D earnings terrain. Use university search for keyboard selection.');canvas.setAttribute('role','img');this.threeHost.append(canvas);
    const scene=new THREE.Scene();const camera=new THREE.OrthographicCamera(-6,6,6,-6,.1,100);camera.up.set(0,0,1);camera.position.set(0,-10,13);
    const controls=new OrbitControls(camera,canvas);controls.target.set(0,0,0);controls.minZoom=.7;controls.maxZoom=8;controls.maxPolarAngle=Math.PI*.46;controls.enableDamping=false;controls.screenSpacePanning=true;controls.update();controls.saveState();
    scene.add(new THREE.HemisphereLight(0xffffff,0x89978b,2.4));const light=new THREE.DirectionalLight(0xfff3d5,3.2);light.position.set(-5,-3,12);scene.add(light);
    const coast=coastlinePaths(this.geo);
    for(const feature of coast){for(const polygon of feature.polygons){
      const shape=new THREE.Shape(polygon[0].map(([x,y])=>new THREE.Vector2(x,-y)));
      polygon.slice(1).forEach(hole=>shape.holes.push(new THREE.Path(hole.map(([x,y])=>new THREE.Vector2(x,-y)))));
      const ni=feature.name==='United Kingdom'&&polygon[0].every(([x,y])=>x<-1.3&&y>-.9&&y<1.2);
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:false});geometry.translate(0,0,-.05);
      const material=new THREE.MeshStandardMaterial({color:feature.name==='Ireland'?0xd1d8cc:ni?0xbcc5bd:0xe2e3ce,roughness:1,side:THREE.DoubleSide});scene.add(new THREE.Mesh(geometry,material));
      const points=polygon[0].map(([x,y])=>new THREE.Vector3(x,-y,.002));scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x83998d,transparent:true,opacity:.55})));
    }}
    const hills=new THREE.Group();scene.add(hills);const hits=[];
    const resize=()=>{const w=this.threeHost.clientWidth||600,h=this.threeHost.clientHeight||650;renderer.setSize(w,h);const half=6.25;camera.top=half;camera.bottom=-half;camera.left=-half*w/h;camera.right=half*w/h;camera.updateProjectionMatrix();};
    this.three={THREE,hillGeometry,renderer,scene,camera,controls,hills,hits,resize};this.updateThree();new ResizeObserver(resize).observe(this.threeHost);
    const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();let down;
    canvas.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
    const intersect=e=>{const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(this.three.hits,false)[0]?.object.userData.provider;};
    canvas.addEventListener('click',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const p=intersect(e);if(p)this.onSelect(p.id);});
    canvas.addEventListener('pointermove',e=>{const p=intersect(e);canvas.style.cursor=p?'pointer':'grab';this.onHover(p||null,e);});canvas.addEventListener('pointerleave',()=>this.onHover(null));
    renderer.setAnimationLoop(()=>{if(this.view==='three')renderer.render(scene,camera);});resize();
  }
  updateThree(){
    const {THREE,hillGeometry,hills,hits}=this.three;hills.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});hills.clear();hits.length=0;
    for(const p of this.providers){if(!p.location)continue;const [x,y]=project(p.location.lon,p.location.lat),metric=metricFor(p,this.subject),valid=hasEarnings(metric),height=heightFor(metric?.median);
      if(valid){const geometry=hillGeometry(THREE,metric.median,x,y);
        const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}));mesh.userData.provider=p;hills.add(mesh);hits.push(mesh);
        for(const {value,radius} of contourRadii(metric.median)){const points=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2;points.push(new THREE.Vector3(x+radius*Math.cos(a),-y+radius*Math.sin(a),heightFor(value)+.012));}
          hills.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xf1eed5,transparent:true,opacity:.65})));}
      }
      const dot=new THREE.Mesh(new THREE.SphereGeometry(p.id===this.selected? .06:.035,10,8),new THREE.MeshBasicMaterial({color:p.id===this.selected?0xd49c43:valid?0x173d36:0x9b9f94}));
      dot.position.set(x,-y,(height??0)+.035);dot.userData.provider=p;hills.add(dot);hits.push(dot);
      if(p.id===this.selected){const ring=new THREE.Mesh(new THREE.TorusGeometry(.105,.014,8,40),new THREE.MeshBasicMaterial({color:0xe7ae47}));ring.position.set(x,-y,(height??0)+.03);hills.add(ring);}
    }
  }
}

export function posterSVG(map,subject,data){
  const clone=map.svg.cloneNode(true);clone.setAttribute('viewBox',initialBox.join(' '));clone.setAttribute('x','90');clone.setAttribute('y','180');clone.setAttribute('width','1020');clone.setAttribute('height','1260');clone.querySelectorAll('[tabindex]').forEach(n=>{n.removeAttribute('tabindex');n.removeAttribute('role');});
  const text=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  return `<svg xmlns="${NS}" width="1200" height="1660" viewBox="0 0 1200 1660"><defs><linearGradient id="legend"><stop stop-color="#e8e8d1"/><stop offset=".25" stop-color="#a6bb9f"/><stop offset=".5" stop-color="#35766a"/><stop offset=".7" stop-color="#1f584e"/><stop offset="1" stop-color="#dda941"/></linearGradient></defs><style>.britain{fill:#e4e6d4;stroke:#718d7c;stroke-width:.012}.ireland{fill:#d0d8cd;stroke:#9dafa0;stroke-width:.01}.northern-ireland{fill:#c8d0c8;stroke:#899d90;stroke-width:.01}.graticule path{stroke:#c2d1d1;stroke-width:.007;fill:none}.graticule text{font:9px sans-serif;fill:#798f8c}.place-labels text{font:italic 12px Georgia;fill:#233f39;stroke:none}.marker-ring{fill:#244f44;stroke:#faf6df;stroke-width:.012}.marker-core{fill:#fff7dd}.unavailable .marker-ring{fill:#ccd1c5;stroke:#626e64}.ni-note text{font:8px sans-serif;fill:#49685f;text-anchor:middle}.ireland-label{font:10px sans-serif;fill:#738f80;letter-spacing:1.5px}</style><rect width="1200" height="1660" fill="#f5f3eb"/><text x="600" y="75" text-anchor="middle" font-family="Georgia" font-size="46" fill="#21483c">The Graduate Landscape</text><text x="600" y="120" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#4b675c">${text(subject.label)} · Median annualised earnings five years after graduation</text><text x="600" y="153" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#63766b">Tax year 2023–24 · Graduating cohort 2017/18 · UK-domiciled first-degree HEI graduates</text><rect x="80" y="178" width="1040" height="1270" rx="6" fill="#dce6e6"/>${new XMLSerializer().serializeToString(clone)}<rect x="300" y="1470" width="600" height="14" fill="url(#legend)"/><g font-family="sans-serif" font-size="16" fill="#2b5044"><text x="300" y="1510">£0</text><text x="435" y="1510">£25k</text><text x="585" y="1510">£50k</text><text x="735" y="1510">£75k</text><text x="850" y="1510">£100k+</text></g><g font-family="sans-serif" font-size="14" fill="#526b5d" text-anchor="middle"><text x="600" y="1545">Contours every £5,000 · fixed footprints · no earnings inferred between universities</text><text x="600" y="1572">Northern Ireland not covered. Hollow dots: unpublished earnings. Unlocated providers omitted.</text><text x="600" y="1599">Source: DfE LEO 2026 release · © Crown copyright, OGL v3.0 · Natural Earth · Wikidata CC0</text><text x="600" y="1625">${text(data.meta.release)}</text></g></svg>`;
}
