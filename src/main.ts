import * as THREE from 'three';
import './style.css';

type Mode='menu'|'playing'|'paused'|'dead'|'training'|'settings'|'stats';
type Kind='RUNNER'|'SNIPER'|'TANK'|'DRONE'|'INTERCEPTOR';
type Weapon='ARC'|'BREACH'|'RAIL';
type Enemy={root:THREE.Group;core:THREE.Mesh;hitProxy:THREE.Mesh;kind:Kind;hp:number;max:number;speed:number;cool:number;alive:boolean;boss:boolean};
type EnemyProjectile={mesh:THREE.Mesh;velocity:THREE.Vector3;damage:number;life:number};
type Save={runs:number;highestStage:number;highestScore:number;kills:number;distance:number;longestCombo:number;highestSpeed:number;bossesDefeated:number};
const $=(s:string)=>document.querySelector<HTMLElement>(s)!;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const saveKey='flowstate-career-v1';
const baseSave:Save={runs:0,highestStage:0,highestScore:0,kills:0,distance:0,longestCombo:0,highestSpeed:0,bossesDefeated:0};
let save:Save;try{save={...baseSave,...JSON.parse(localStorage.getItem(saveKey)||'{}')};}catch{save={...baseSave};}
const persist=()=>localStorage.setItem(saveKey,JSON.stringify(save));
const app=$('#app');
app.innerHTML=String.raw`<canvas id="game"></canvas><div class="shell">
<section id="menu" class="screen"><div class="eyebrow">FIRST-PERSON MOVEMENT COMBAT // BUILD 02</div><div class="brand">FLOW<span>STATE</span></div><div class="tagline">BUILD SPEED. TAKE THE HIGH GROUND. CLEAR THE SECTOR.</div><div class="menu-intro"><b>YOUR FIRST RUN</b><p>Move through the arena, build momentum, and eliminate every hostile. Start in Training to learn movement without enemies.</p></div><nav class="menu"><button class="primary" data-action="play">START FIRST RUN <span>→</span></button><button data-action="training">MOVEMENT TRAINING</button><button data-action="daily">DAILY CHALLENGE</button><button data-action="stats">CAREER RECORD</button><button data-action="settings">SETTINGS</button></nav><div class="control-guide"><b>CONTROLS</b><span><kbd>W A S D</kbd> Move</span><span><kbd>MOUSE</kbd> Look</span><span><kbd>CLICK</kbd> Fire</span><span><kbd>SPACE</kbd> Jump</span><span><kbd>SHIFT</kbd> Sprint / slide</span><span><kbd>E</kbd> Grapple</span><span><kbd>1 2 3</kbd> Weapons</span><span><kbd>R</kbd> Reload</span><span><kbd>ESC</kbd> Pause</span></div><div class="foot">DESKTOP: CLICK START, THEN CLICK THE ARENA TO CAPTURE MOUSE LOOK.</div></section>
<section id="hud" class="hud"><div class="hud-top"><div><div class="hud-label">SECTOR / STAGE</div><div id="stage" class="hud-value">01</div></div><div style="text-align:center"><div class="hud-label">FLOW SCORE</div><div id="score" class="hud-value">000000</div><div id="combo" class="combo">FLOW x1.0</div></div><div style="text-align:right"><div class="hud-label">VELOCITY</div><div id="speed" class="speed">0</div><div class="hud-label">M / SEC</div></div></div><div class="crosshair" id="crosshair"></div><div id="notice" class="notice"></div><div class="objective"><b id="objective-title">SECTOR OBJECTIVE</b><span id="objective-copy">Eliminate all hostiles</span></div><div class="inrun-controls"><b>QUICK CONTROLS</b><span>WASD move · Mouse aim</span><span>Click fire · Space jump</span><span>Shift sprint/slide · E grapple</span><span>Esc pause</span></div><div id="bossbar" class="bossbar hidden"><span id="bossname">HOSTILE</span><div><i id="bossfill"></i></div></div><div class="hud-bottom"><div><div class="health" id="health">100 <small>/ 100 HP</small></div><div class="hud-label" id="ability">GRAPPLE READY · Q OVERDRIVE</div></div><div class="weapon"><span id="weapon">ARC PISTOL</span><small id="ammo">12 / 72 · 1/2/3 SWITCH</small></div></div></section>
<section id="pause" class="screen hidden"><div class="panel"><div class="eyebrow">SIMULATION SUSPENDED</div><h2>PAUSED.</h2><p>WASD move · Mouse aim · Left-click fire · Space jump · Shift sprint/slide · E grapple · R reload · 1/2/3 weapons.</p><div class="menu"><button class="primary" data-action="resume">RESUME RUN</button><button data-action="restart">RESTART RUN</button><button data-action="settings">SETTINGS</button><button data-action="menu">MAIN MENU</button></div></div></section>
<section id="dead" class="screen hidden"><div class="panel"><div class="eyebrow">SIGNAL LOST // RUN TERMINATED</div><h2>FLOW BROKEN.</h2><p id="deathcopy"></p><div class="menu"><button class="primary" data-action="retry">RUN IT BACK</button><button data-action="menu">MAIN MENU</button></div></div></section>
<section id="settings" class="screen hidden"><div class="panel"><div class="eyebrow">SYSTEM CONFIGURATION</div><h2>YOUR RIG.</h2><div class="settings-row"><label for="sens">Trackpad sensitivity</label><input id="sens" type="range" min=".3" max="2.5" step=".1" value="1"></div><div class="settings-row"><label for="fov">Field of view</label><input id="fov" type="range" min="75" max="110" step="1" value="94"></div><div class="settings-row"><label for="quality">Graphics quality</label><select id="quality"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div><div class="settings-row"><label for="motion">Reduced motion</label><input id="motion" type="checkbox"></div><div class="menu"><button class="primary" data-action="settings-back">SAVE / BACK</button></div></div></section>
<section id="stats" class="screen hidden"><div class="panel"><div class="eyebrow">PILOT TELEMETRY // LOCAL RECORDS</div><h2>CAREER DATA.</h2><div id="statgrid" class="statgrid"></div><div class="menu"><button class="primary" data-action="menu">BACK</button></div></div></section><div id="hint" class="hint hidden">CLICK TO CAPTURE AIM · ESC TO PAUSE</div></div>`;

const canvas=$('#game') as HTMLCanvasElement;
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x080b10);scene.fog=new THREE.FogExp2(0x080b10,.012);
const camera=new THREE.PerspectiveCamera(94,innerWidth/innerHeight,.08,260);camera.rotation.order='YXZ';scene.add(camera);
const viewModel=new THREE.Group();camera.add(viewModel);viewModel.position.set(.34,-.3,-.62);
const gunDark=new THREE.MeshStandardMaterial({color:0x18232d,roughness:.38,metalness:.72}),gunEdge=new THREE.MeshStandardMaterial({color:0x60717d,roughness:.32,metalness:.8}),gunAccent=new THREE.MeshStandardMaterial({color:0xff6b35,emissive:0x8b260b,emissiveIntensity:1.2}),gunBlue=new THREE.MeshStandardMaterial({color:0x4e9acb,emissive:0x153b5b,emissiveIntensity:1.1});
const gunBody=new THREE.Mesh(new THREE.BoxGeometry(.22,.17,.52),gunDark);viewModel.add(gunBody);
const gunBarrel=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.42,10),gunEdge);gunBarrel.rotation.x=Math.PI/2;gunBarrel.position.set(0,.035,-.42);viewModel.add(gunBarrel);
const gunTop=new THREE.Mesh(new THREE.BoxGeometry(.12,.045,.3),gunAccent);gunTop.position.set(0,.12,-.1);viewModel.add(gunTop);
const gunGrip=new THREE.Mesh(new THREE.BoxGeometry(.12,.24,.14),gunDark);gunGrip.position.set(0,-.16,.12);gunGrip.rotation.x=-.18;viewModel.add(gunGrip);
const gunSide=new THREE.Mesh(new THREE.BoxGeometry(.025,.09,.24),gunBlue);gunSide.position.set(.125,.01,-.08);viewModel.add(gunSide);

scene.add(new THREE.HemisphereLight(0x9bb9d6,0x171c24,1.5));const sun=new THREE.DirectionalLight(0xd7e5ff,1.5);sun.position.set(8,18,7);scene.add(sun);
const glow=new THREE.PointLight(0xff642e,22,32);glow.position.set(0,5,0);scene.add(glow);
const world=new THREE.Group(),foes=new THREE.Group();scene.add(world,foes);
const material=(c:number,r=.75,m=.15)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const floorMat=material(0x202a34,.88,.22),wallMat=material(0x303d49,.72,.38),darkMat=material(0x101923,.58,.5);
const orangeMat=new THREE.MeshStandardMaterial({color:0xff6b35,emissive:0x8b260b,emissiveIntensity:1.2});
const blueMat=new THREE.MeshStandardMaterial({color:0x4e9acb,emissive:0x153b5b,emissiveIntensity:1.1});
const box=new THREE.BoxGeometry(1,1,1),colliders:THREE.Box3[]=[];
function block(x:number,y:number,z:number,sx:number,sy:number,sz:number,mat:THREE.Material,solid=true){const m=new THREE.Mesh(box,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);world.add(m);if(solid)colliders.push(new THREE.Box3().setFromObject(m));return m;}
function clear(g:THREE.Group){const disposed=new Set<THREE.Material>();for(const o of [...g.children]){g.remove(o);o.traverse(child=>{if(child instanceof THREE.Mesh){if(child.geometry!==box)child.geometry.dispose();const mats=Array.isArray(child.material)?child.material:[child.material];for(const mat of mats){if(!([floorMat,wallMat,darkMat,orangeMat,blueMat,gunDark,gunEdge,gunAccent,gunBlue,hitProxyMaterial] as THREE.Material[]).includes(mat)&&!disposed.has(mat)){mat.dispose();disposed.add(mat);}}}});}}
let mode:Mode='menu',stage=1,score=0,kills=0,hp=100,combo=1,bestCombo=1,comboTime=0,distance=0,bestSpeed=0,hurtIFrames=0;
let weapon:Weapon='ARC',mag:Record<Weapon,number>={ARC:12,BREACH:6,RAIL:4},reserve:Record<Weapon,number>={ARC:72,BREACH:30,RAIL:20};
const weaponData:Record<Weapon,{name:string;damage:number;rate:number;reload:number;spread:number;size:number}>={ARC:{name:'ARC PISTOL',damage:28,rate:.19,reload:1.1,spread:.006,size:12},BREACH:{name:'BREACH SHOTGUN',damage:17,rate:.72,reload:1.5,spread:.075,size:6},RAIL:{name:'RAIL PRECISION',damage:105,rate:1.05,reload:1.8,spread:0,size:4}};
let enemies:Enemy[]=[];
const enemyProjectiles:EnemyProjectile[]=[];
const keys=new Set<string>(),velocity=new THREE.Vector3(),position=new THREE.Vector3(0,1.7,8),forward=new THREE.Vector3(),right=new THREE.Vector3(),move=new THREE.Vector3();
let yaw=0,pitch=0,grounded=false,sliding=false,slideTime=0,slideCooldown=0,slideNeedsRelease=false,landingKick=0,wasGrounded=true,wallrun=0,wallSide=0,settingsReturn:Mode='menu',coyote=0,jumpBuffer=0,grapple:THREE.Vector3|null=null,grappleCD=0,fireCD=0,reloadTime=0,overdrive=0,ability=100,noticeTime=0,walkPhase=0;
const ray=new THREE.Raycaster(),clock=new THREE.Clock();
const visualEffects:{object:THREE.Object3D;life:number}[]=[];
const hitProxyMaterial=new THREE.MeshBasicMaterial({visible:false,depthWrite:false});
const shotGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
const shotMaterial=new THREE.LineBasicMaterial({color:0xffd18a,transparent:true,opacity:1,depthTest:false});
const playerShot=new THREE.Line(shotGeometry,shotMaterial);playerShot.renderOrder=30;playerShot.visible=false;scene.add(playerShot);
const muzzleFlash=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshBasicMaterial({color:0xffc078,transparent:true,opacity:0,depthWrite:false}));muzzleFlash.visible=false;viewModel.add(muzzleFlash);muzzleFlash.position.set(.12,.02,-.78);
let playerShotLife=0,muzzleLife=0;
function addTracer(from:THREE.Vector3,to:THREE.Vector3,color:number=0xffb15e,life=.2){const glowGeo=new THREE.BufferGeometry().setFromPoints([from,to]);const glow=new THREE.Line(glowGeo,new THREE.LineBasicMaterial({color:0xff7138,transparent:true,opacity:.32,depthTest:false}));glow.renderOrder=19;scene.add(glow);visualEffects.push({object:glow,life});const geo=new THREE.BufferGeometry().setFromPoints([from,to]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:1,depthTest:false}));line.renderOrder=20;scene.add(line);visualEffects.push({object:line,life});}
function launchEnemyProjectile(from:THREE.Vector3,target:THREE.Vector3,speed:number,damage:number){
 const direction=target.clone().sub(from).normalize();
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),new THREE.MeshBasicMaterial({color:0xff315b}));
 mesh.position.copy(from);scene.add(mesh);
 enemyProjectiles.push({mesh,velocity:direction.multiplyScalar(speed),damage,life:3.2});
}
function clearEnemyProjectiles(){for(const p of enemyProjectiles){scene.remove(p.mesh);p.mesh.geometry.dispose();const materials=p.mesh.material; if(Array.isArray(materials))materials.forEach(m=>m.dispose());else materials.dispose();}enemyProjectiles.length=0;}
function updateEnemyProjectiles(dt:number){
 for(let i=enemyProjectiles.length-1;i>=0;i--){const p=enemyProjectiles[i],step=p.velocity.length()*dt;p.life-=dt;
   ray.set(p.mesh.position,p.velocity.clone().normalize());ray.far=step+.16;
   const blocked=ray.intersectObjects(world.children,true).length>0;
   p.mesh.position.addScaledVector(p.velocity,dt);
   if(!blocked&&p.mesh.position.distanceTo(position)<.78){hurt(p.damage);p.life=0;}
   if(blocked)p.life=0;
   if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();const materials=p.mesh.material;if(Array.isArray(materials))materials.forEach(m=>m.dispose());else materials.dispose();enemyProjectiles.splice(i,1);}
 }
}
function note(t:string){$('#notice').textContent=t;noticeTime=1.8;}
let audioContext:AudioContext|null=null;function sound(freq:number,dur=.08,type:OscillatorType='sawtooth',vol=.035){try{const c=audioContext??(audioContext=new AudioContext()),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+dur);}catch{}}
function ui(next:Mode){mode=next;for(const id of ['menu','pause','dead','settings','stats'])$('#'+id).classList.toggle('hidden',id!==next);$('#hud').classList.toggle('active',next==='playing'||next==='training');if(next!=='playing'&&next!=='training'&&document.pointerLockElement)document.exitPointerLock();$('#hint').classList.toggle('hidden',next!=='playing'&&next!=='training');}
function setWeaponModel(){const v=weapon==='ARC'?{body:[1,1,1],barrel:1,top:[1,1,1]}:weapon==='BREACH'?{body:[1.28,1.12,1.2],barrel:1.45,top:[1.15,1.2,1.25]}:{body:[.92,.95,1.28],barrel:2.05,top:[.9,.9,1.65]};gunBody.scale.set(...v.body as [number,number,number]);gunBarrel.scale.z=v.barrel;gunTop.scale.set(...v.top as [number,number,number]);gunBarrel.position.z=weapon==='ARC' ? -0.42 : weapon==='BREACH' ? -0.5 : -0.66;viewModel.position.x=weapon==='BREACH' ? 0.38 : 0.34;viewModel.position.z=weapon==='RAIL'?-.72:-.62;}
function hud(){setWeaponModel();$('#stage').textContent=String(stage).padStart(2,'0');$('#score').textContent=Math.floor(score).toString().padStart(6,'0');$('#health').innerHTML=Math.max(0,Math.ceil(hp))+' <small>/ 100 HP</small>';$('#weapon').textContent=weaponData[weapon].name;$('#ammo').textContent=reloadTime>0?'RELOADING '+reloadTime.toFixed(1)+'s · R':mag[weapon]+' / '+reserve[weapon]+' · R RELOAD';$('#ammo').classList.toggle('ammo-low',mag[weapon]<=Math.max(1,Math.ceil(weaponData[weapon].size*.25)));$('#ammo').classList.toggle('reloading',reloadTime>0);$('#combo').textContent='FLOW x'+combo.toFixed(1);}
function spawn(kind:Kind,p:THREE.Vector3,boss=false){
 const g=new THREE.Group(),colors:Record<Kind,number>={RUNNER:0xe85e45,SNIPER:0x64a9db,TANK:0x9a6e53,DRONE:0x9a7ee5,INTERCEPTOR:0xffa04a};
 const scale=boss?1.55:kind==='TANK'?1.3:1;
 const armor=material(colors[kind],.42,.55),dark=material(0x17232e,.5,.65),glowMat=new THREE.MeshStandardMaterial({color:0xff794d,emissive:0xc42d12,emissiveIntensity:2});
 const add=(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;};
 if(kind==='DRONE'){
   const shell=add(new THREE.SphereGeometry(.58*scale,16,12),armor,0,0,0);shell.scale.set(1,.72,1);
   add(new THREE.TorusGeometry(.78*scale,.055,6,24),dark,0,0,0).rotation.x=Math.PI/2;
   add(new THREE.BoxGeometry(.58,.12,.14),glowMat,0,0,-.5*scale);
   for(const side of [-1,1]){add(new THREE.CylinderGeometry(.06,.09,.5,8),dark,side*.75,0,0).rotation.z=Math.PI/2;}
 }else{
   const tall=kind==='TANK'?1.95:1.48,wide=kind==='TANK'?.82:.54;
   const torso=add(new THREE.BoxGeometry(wide*scale,.78*scale,.42*scale),armor,0,.98*scale,0);
   torso.rotation.z=kind==='INTERCEPTOR'?.08:0;
   add(new THREE.BoxGeometry(.48*scale,.16*scale,.48*scale),dark,0,1.48*scale,.02);
   add(new THREE.BoxGeometry(.46*scale,.2*scale,.35*scale),armor,0,1.57*scale,0);
   add(new THREE.BoxGeometry(.42*scale,.13*scale,.08),glowMat,0,1.58*scale,-.2*scale);
   add(new THREE.BoxGeometry(.22*scale,.5*scale,.3*scale),dark,0,.9*scale,.3*scale);
   for(const side of [-1,1]){
     const arm=add(new THREE.BoxGeometry(.2*scale,.62*scale,.24*scale),armor,side*.43*scale,1.02*scale,0);
     arm.rotation.z=side*-.12;
     add(new THREE.BoxGeometry(.23*scale,.62*scale,.28*scale),dark,side*.2*scale,.34*scale,0);
     add(new THREE.BoxGeometry(.13*scale,.16*scale,.18*scale),glowMat,side*.43*scale,.84*scale,-.14*scale);
   }
   if(kind==='SNIPER'){
     add(new THREE.BoxGeometry(.13,.13,1.0),dark,.48*scale,1.05*scale,-.36);
     add(new THREE.CylinderGeometry(.055,.055,.6,8),glowMat,0,1.9*scale,0);
   }
   if(kind==='TANK'){
     for(const side of [-1,1])add(new THREE.BoxGeometry(.38,.35,.5),dark,side*.58,1.34,0);
     add(new THREE.BoxGeometry(.16,.16,.7),glowMat,0,1.04,-.24);
   }
   if(kind==='INTERCEPTOR'){add(new THREE.BoxGeometry(1.2,.12,.3),dark,0,1.25,.08);add(new THREE.BoxGeometry(.12,.4,.12),glowMat,0,.95,-.25);}
 }
 const core=add(new THREE.SphereGeometry(boss?.58:.42,14,10),new THREE.MeshBasicMaterial({color:0xffbd72}),0,kind==='DRONE'?0:1.05*scale,-.28);
 const hitProxy=new THREE.Mesh(new THREE.SphereGeometry(kind==='TANK'?1.18:kind==='DRONE'?.92:.88,10,8),hitProxyMaterial);hitProxy.position.set(0,kind==='DRONE'?0:.94*scale,0);hitProxy.userData.hitTarget=true;g.add(hitProxy);
 g.position.copy(p);foes.add(g);
 const difficulty=1+Math.min(.95,Math.max(0,stage-1)*.065),h=(boss?850:kind==='TANK'?210:kind==='DRONE'?55:kind==='SNIPER'?65:kind==='INTERCEPTOR'?140:48)*difficulty;
 enemies.push({root:g,core,hitProxy,kind,hp:h,max:h,speed:(kind==='RUNNER'?3.8:kind==='INTERCEPTOR'?5.5:kind==='TANK'?1.5:kind==='DRONE'?2.2:0)*(1+Math.min(.55,Math.max(0,stage-1)*.035)),cool:Math.random()+1.3,alive:true,boss});
 if(boss){$('#bossbar').classList.remove('hidden');$('#bossname').textContent=stage%25===0?'THE COLOSSUS':'THE HUNTER';}
}
const arenaLights:THREE.PointLight[]=[];
function buildArena(){clearEnemyProjectiles();for(const light of arenaLights)scene.remove(light);arenaLights.length=0;colliders.length=0;clear(world);clear(foes);enemies=[];
 // Flat spawn lane, clear sightline, raised side routes and strong landmarks.
 block(0,-.5,0,56,1,56,floorMat);
 block(0,9,-28,56,18,1,wallMat);block(0,9,28,56,18,1,wallMat);
 block(-28,9,0,1,18,56,wallMat);block(28,9,0,1,18,56,wallMat);
 for(let z=-24;z<=22;z+=4){block(-2.8,.025,z,.08,.04,1.8,blueMat,false);block(2.8,.025,z,.08,.04,1.8,blueMat,false);}
 for(const side of [-1,1]){
   block(side*15,2.2,-2,7,.7,25,darkMat);block(side*15,2.62,-2,6.6,.12,24.6,blueMat,false);
   block(side*10,4.6,-12,5,.7,7,darkMat);block(side*10,5,-12,4.7,.1,6.7,orangeMat,false);
   block(side*22,4,0,1,8,38,wallMat);
   for(let z=-18;z<=14;z+=8)block(side*25,3,z,.25,5,.25,orangeMat,false);
 }
 block(0,1.05,-5,5,2.1,1.4,darkMat);block(0,2.14,-5,4.8,.08,1.25,orangeMat,false);
 block(-6,1.3,-13,3,2.6,3,darkMat);block(6,1.3,-13,3,2.6,3,darkMat);
 block(0,.06,19,7,.12,7,orangeMat,false);block(0,5,-25,10,.5,.7,blueMat,false);
 // Industrial arena dressing: illuminated pylons, overhead trusses, and lane markers.
 for(const x of [-23,-17,17,23])for(const z of [-22,0,20]){
   const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.38,.58,7,8),darkMat);shaft.position.set(x,3.5,z);world.add(shaft);
   const band=new THREE.Mesh(new THREE.TorusGeometry(.48,.075,6,12),x<0?blueMat:orangeMat);band.rotation.x=Math.PI/2;band.position.set(x,5.9,z);world.add(band);
   const lamp=new THREE.PointLight(x<0?0x3b9dff:0xff7138,5,11);lamp.position.set(x,6.2,z);world.add(lamp);
 }
 for(const z of [-24,-16,-8,0,8,16,24]){
   block(-27,7,z,.35,.18,5,blueMat,false);block(27,7,z,.35,.18,5,orangeMat,false);
 }
 for(const x of [-12,12]){
   block(x,8,-7,8,.28,.35,darkMat,false);
   block(x,8.18,-7,7.5,.06,.12,x<0?blueMat:orangeMat,false);
 }
 // Central reactor landmark with stacked emissive rings.
 const reactor=new THREE.Group();reactor.position.set(0,0,-23);world.add(reactor);
 const coreMesh=new THREE.Mesh(new THREE.CylinderGeometry(.65,.9,4.8,10),darkMat);coreMesh.position.y=2.4;reactor.add(coreMesh);
 for(const y of [1.1,2.4,3.7]){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.09,8,24),orangeMat);ring.rotation.x=Math.PI/2;ring.position.y=y;reactor.add(ring);}
 const reactorLight=new THREE.PointLight(0xff642e,16,24);reactorLight.position.set(0,3,-23);scene.add(reactorLight);arenaLights.push(reactorLight);
 position.set(0,1.7,17);velocity.set(0,0,0);yaw=0;pitch=0;camera.position.copy(position);camera.rotation.set(pitch,yaw,0,'YXZ');hp=100;grounded=true;sliding=false;grapple=null;grappleCD=0;wallrun=0;coyote=.12;
 if(mode!=='training'){
   const count=stage===1?3:stage%5===0?5:stage>=13?7:stage>=9?6:stage%3===0?5:4;
   const types:Kind[]=['RUNNER','RUNNER','SNIPER','DRONE','TANK','INTERCEPTOR'];
   for(let i=0;i<count;i++){
     const xs=[-9,0,9,-14,14,-5,5,0,-18,18,-11,11],zs=[-10,-13,-10,-18,-18,-22,-22,-25,-6,-6,-15,-15];
     const kind=stage===1?(['RUNNER','RUNNER','SNIPER'][i%3] as Kind):stage%5===0?(i===0?'TANK':i===1?'DRONE':i===2?'SNIPER':'INTERCEPTOR'):stage%3===0?(i<2?'INTERCEPTOR':i===2?'DRONE':i===3?'RUNNER':'SNIPER'):types[(i+stage)%types.length];
     spawn(kind,new THREE.Vector3(xs[i],kind==='DRONE'?3:0,zs[i]));
   }
   if(stage%5===0)spawn('TANK',new THREE.Vector3(0,0,-21),true);
 }
 $('#bossbar').classList.toggle('hidden',!enemies.some(e=>e.boss));hud();updateObjective();}
function updateObjective(){
 const alive=enemies.filter(e=>e.alive).length,total=enemies.length,cleared=total-alive;
 $('#objective-title').textContent=mode==='training'?'MOVEMENT TRAINING':stage%4===0?'HAZARD SECTOR // OVERLOAD SWEEP':'SECTOR '+String(stage).padStart(2,'0')+' OBJECTIVE';
 $('#objective-copy').textContent=mode==='training'?'Practice movement. No enemies here.':alive===0?'SECTOR CLEAR — NEXT SECTOR INCOMING':cleared+'/'+total+' CLEARED · '+alive+' HOSTILES REMAINING'+(stage%4===0?' · JUMP THE SWEEP':'')';
}
function start(training=false,daily=false){stage=1;score=0;kills=0;hp=100;combo=1;bestCombo=1;comboTime=0;distance=0;ability=100;mag={ARC:12,BREACH:6,RAIL:4};reserve={ARC:72,BREACH:30,RAIL:20};mode=training?'training':'playing';if(!training)save.runs++;buildArena();ui(mode);note(daily?'DAILY CHALLENGE // SECTOR 01':training?'TRAINING // PRACTICE MOVEMENT':'OBJECTIVE // ELIMINATE ALL HOSTILES');updateObjective();}
function endRun(){save.highestStage=Math.max(save.highestStage,stage);save.highestScore=Math.max(save.highestScore,Math.floor(score));save.kills+=kills;save.distance+=Math.floor(distance);save.longestCombo=Math.max(save.longestCombo,bestCombo);save.highestSpeed=Math.max(save.highestSpeed,bestSpeed);persist();$('#deathcopy').textContent='STAGE '+stage+' // SCORE '+Math.floor(score).toLocaleString()+' // '+kills+' ELIMINATIONS // BEST FLOW x'+bestCombo.toFixed(1)+'. PERSONAL BEST: '+save.highestScore.toLocaleString()+'.';ui('dead');}
function nextStage(){stage++;score+=stage*100;hp=Math.min(100,hp+15);mag.ARC=Math.min(12,mag.ARC+5);mag.BREACH=Math.min(6,mag.BREACH+2);mag.RAIL=Math.min(4,mag.RAIL+1);buildArena();note('SECTOR '+String(stage).padStart(2,'0')+' // INCOMING');updateObjective();}
function hurt(n:number){if(mode!=='playing'||hurtIFrames>0)return;hurtIFrames=.72;hp-=n;$('#hud').classList.add('taking-damage');setTimeout(()=>$('#hud').classList.remove('taking-damage'),180);sound(65,.13,'sawtooth',.06);if(hp<=0)endRun();hud();}
function damage(e:Enemy,n:number){e.hp-=n;const bonus=Math.floor(velocity.length()*1.8)+(grounded?0:35)+(sliding?25:0)+(grapple?50:0);score+=Math.round(n*.35+bonus)*combo;if(e.hp<=0){e.alive=false;foes.remove(e.root);kills++;combo=Math.min(8,combo+.35);comboTime=4.5;bestCombo=Math.max(bestCombo,combo);score+=Math.round((100+bonus)*combo);note((velocity.length()>13?'KINETIC ELIMINATION':!grounded?'AIRBORNE ELIMINATION':'HOSTILE NEUTRALIZED')+'  +'+Math.round((100+bonus)*combo));sound(520,.13,'triangle',.05);if(e.boss){save.bossesDefeated++;$('#bossbar').classList.add('hidden');}}else sound(160,.035,'square',.02);hud();}
function shoot(){
 if(fireCD>0||reloadTime>0)return;
 if(mag[weapon]<=0){note('MAG EMPTY // PRESS R TO RELOAD');$('#ammo').classList.add('ammo-low');reload();return;}
 const w=weaponData[weapon];mag[weapon]--;fireCD=w.rate;
 sound(weapon==='RAIL'?110:weapon==='BREACH'?75:220,weapon==='BREACH'?.2:.09,weapon==='RAIL'?'triangle':'sawtooth',weapon==='BREACH'?.09:.045);
 const dir=new THREE.Vector3();camera.getWorldDirection(dir);
 for(let i=0;i<(weapon==='BREACH'?7:1);i++){
   const shotDir=dir.clone().add(new THREE.Vector3((Math.random()-.5)*w.spread,(Math.random()-.5)*w.spread,0).applyQuaternion(camera.quaternion)).normalize();
   ray.set(camera.position,shotDir);ray.far=weapon==='RAIL'?150:65;
   const targets=enemies.filter(e=>e.alive).map(e=>e.hitProxy);
   const hits=ray.intersectObjects(targets,false);
   const hit=hits[0],end=hit?hit.point:camera.position.clone().addScaledVector(shotDir,ray.far);
   const muzzle=camera.position.clone().addScaledVector(shotDir,.8).add(new THREE.Vector3(.16,-.12,0).applyQuaternion(camera.quaternion));
    addTracer(muzzle,end,weapon==='RAIL'?0x9ceaff:weapon==='BREACH'?0xff7a3b:0xffe0a3,weapon==='RAIL'?.26:.2);
   if(i===0){shotGeometry.setFromPoints([muzzle,end]);shotMaterial.color.setHex(weapon==='RAIL'?0x8feaff:weapon==='BREACH'?0xff5a24:0xffd18a);playerShot.visible=true;playerShotLife=weapon==='RAIL'?.2:.16;muzzleFlash.material.color.setHex(weapon==='RAIL'?0x9ceaff:0xffb15e);muzzleFlash.material.opacity=1;muzzleFlash.scale.setScalar(weapon==='BREACH'?1.8:1);muzzleFlash.visible=true;muzzleLife=.075;}
   if(hit){
     const target=enemies.find(e=>e.alive&&e.hitProxy===hit.object);
     $('#crosshair').classList.add('hit');$('#crosshair').classList.add('hit-confirm');setTimeout(()=>$('#crosshair').classList.remove('hit','hit-confirm'),110);
     if(target)damage(target,w.damage);
   }
 }
 if(weapon==='RAIL')velocity.addScaledVector(dir,-.45);
 hud();
}
function reload(){if(reloadTime>0||mag[weapon]===weaponData[weapon].size||reserve[weapon]<=0)return;reloadTime=weaponData[weapon].reload;$('#ammo').classList.remove('ammo-low');$('#ammo').classList.add('reloading');note('RELOADING // '+weaponData[weapon].reload.toFixed(1)+' SEC');}
function grappleStart(){if(grappleCD>0)return;const d=new THREE.Vector3();camera.getWorldDirection(d);ray.set(camera.position,d);ray.far=38;const hit=ray.intersectObjects(world.children);if(hit.length){grapple=hit[0].point.clone();grappleCD=2;note('TETHER ACQUIRED');sound(680,.13,'sine',.045);}else note('NO GRAPPLE ANCHOR');}
function updateEnemies(dt:number){
 for(const e of enemies){
   if(!e.alive)continue;
   const p=e.root.position,d=position.clone().sub(p),dist=d.length();e.cool-=dt;
   if(e.kind==='DRONE'){
     p.y=3+Math.sin(performance.now()*.001+e.root.id)*.8;
     if(dist>8)p.addScaledVector(d.normalize(),e.speed*dt*.45);
     if(e.cool<0&&dist<28){const from=p.clone();from.y=p.y;launchEnemyProjectile(from,position.clone(),15,4);note('DRONE // INCOMING ORB');e.cool=3.1;}
   }else if(['RUNNER','INTERCEPTOR','TANK'].includes(e.kind)){
     if(dist>1.8)p.addScaledVector(d.normalize(),e.speed*dt*(e.boss?1.35:1));
     else if(e.cool<0){addTracer(p.clone().add(new THREE.Vector3(0,1,0)),position.clone(),0xff243f,.28);note('CONTACT ATTACK // CREATE DISTANCE');hurt(e.kind==='TANK'?9:6);e.cool=2.0;}
   }else if(e.kind==='SNIPER'&&e.cool<0&&dist<35){
     const from=p.clone().add(new THREE.Vector3(0,1.5,0));addTracer(from,position.clone(),0xff315b,.42);launchEnemyProjectile(from,position.clone(),29,6);note('SNIPER // BREAK LINE OF SIGHT');e.cool=3.8;
   }
   if(e.boss&&e.cool<0){const from=p.clone().add(new THREE.Vector3(0,1,0));launchEnemyProjectile(from,position.clone(),11,8);note('BOSS // SHOCKWAVE INBOUND');e.cool=4.2;}
   e.root.lookAt(position.x,p.y+.5,position.z);
 }
}
function collides(p:THREE.Vector3){const r=.34,b=new THREE.Box3(new THREE.Vector3(p.x-r,p.y-1.66,p.z-r),new THREE.Vector3(p.x+r,p.y,p.z+r));return colliders.some(c=>c.intersectsBox(b));}
function movePlayer(dt:number){
 camera.getWorldDirection(forward);forward.y=0;forward.normalize();right.crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
 move.set(0,0,0);if(keys.has('KeyW'))move.add(forward);if(keys.has('KeyS'))move.sub(forward);if(keys.has('KeyD'))move.add(right);if(keys.has('KeyA'))move.sub(right);if(move.lengthSq())move.normalize();
 const sprint=keys.has('ShiftLeft')||keys.has('ShiftRight');
 const hs=Math.hypot(velocity.x,velocity.z);
 // A slide is a deliberate momentum move, not simply a slower sprint.
 if(!sprint)slideNeedsRelease=false;
 if(sprint&&!slideNeedsRelease&&grounded&&move.lengthSq()>.1&&hs>6.5&&!sliding&&slideCooldown<=0){sliding=true;slideNeedsRelease=true;slideTime=.82;velocity.x*=1.13;velocity.z*=1.13;sound(105,.11,'triangle',.035);note('SLIDE // KEEP YOUR MOMENTUM');}
 if(sliding){slideTime-=dt;if(slideTime<=0||!grounded){sliding=false;slideCooldown=.22;}}
 if(slideCooldown>0)slideCooldown=Math.max(0,slideCooldown-dt);
 const accel=grounded?(sliding?5.5:sprint?38:29):9.5;
 if(move.lengthSq()){
   const steer=sliding?.32:1;
   velocity.x+=move.x*accel*dt*steer;velocity.z+=move.z*accel*dt*steer;
 }else if(grounded){
   const drag=Math.exp(-(sliding?1.05: sprint?2.8:7.2)*dt);
   velocity.x*=drag;velocity.z*=drag;
 }
 const max=overdrive>0?28:sliding?23:sprint?21:12.5;
 const speedNow=Math.hypot(velocity.x,velocity.z);
 if(speedNow>max){const scale=max/speedNow;velocity.x*=scale;velocity.z*=scale;}
 if(grapple){
   const d=grapple.clone().sub(position),len=d.length();
   if(len<2.1){grapple=null;grappleCD=1.15;velocity.y=Math.max(velocity.y,3.2);note('TETHER RELEASE // LAUNCH');}
   else velocity.addScaledVector(d.normalize(),34*dt);
 }
 if(!grounded)velocity.y-=22*dt;
 if(jumpBuffer>0&&(grounded||coyote>0||wallrun>0)){
   velocity.y=sliding?10.8:9.8;
   if(sliding){velocity.x*=1.08;velocity.z*=1.08;sliding=false;slideCooldown=.3;}
   if(wallrun>0)velocity.x+=wallSide*-6;
   grounded=false;coyote=0;wallrun=0;jumpBuffer=0;
   sound(360,.075,'triangle',.035);
 }
 const next=position.clone().addScaledVector(velocity,dt),horizontal=next.clone();horizontal.y=position.y;
 if(!collides(horizontal)){position.x=next.x;position.z=next.z;}
 else{velocity.x*=sliding?.55:.22;velocity.z*=sliding?.55:.22;sliding=false;}
 const fallSpeed=Math.abs(velocity.y),y=position.y+velocity.y*dt;let support:THREE.Box3|undefined;
 if(velocity.y<=0){
   const feet=position.y-1.7,nextFeet=y-1.7;
   support=colliders.find(c=>position.x>c.min.x-.34&&position.x<c.max.x+.34&&position.z>c.min.z-.34&&position.z<c.max.z+.34&&feet>=c.max.y-.06&&nextFeet<=c.max.y&&c.max.y>=0);
 }
 let landed=false;
 if(support){position.y=support.max.y+1.7;landed=!grounded;velocity.y=0;grounded=true;coyote=.13;}
 else if(y<=1.7){position.y=1.7;landed=!grounded;velocity.y=0;grounded=true;coyote=.13;}
 else{position.y=y;grounded=false;coyote=Math.max(0,coyote-dt);}
 if(landed&&wasGrounded===false){landingKick=Math.min(.16,fallSpeed*.009);sound(95,.055,'triangle',.018);}
 wasGrounded=grounded;
 if(position.y< -8)hurt(100);
 // Keep the player inside the actual arena walls, not an arbitrary 40m sub-area.
 position.x=clamp(position.x,-25.4,25.4);position.z=clamp(position.z,-25.4,25.4);
 if(hurtIFrames>0)hurtIFrames=Math.max(0,hurtIFrames-dt);if(grappleCD>0)grappleCD-=dt;if(jumpBuffer>0)jumpBuffer-=dt;if(fireCD>0)fireCD-=dt;
 if(playerShotLife>0){playerShotLife-=dt;if(playerShotLife<=0)playerShot.visible=false;}if(muzzleLife>0){muzzleLife-=dt;muzzleFlash.material.opacity=Math.max(0,muzzleLife/.055);if(muzzleLife<=0)muzzleFlash.visible=false;}
 if(reloadTime>0){reloadTime-=dt;if(reloadTime<=0){const n=Math.min(weaponData[weapon].size-mag[weapon],reserve[weapon]);mag[weapon]+=n;reserve[weapon]-=n;$('#ammo').classList.remove('reloading','ammo-low');hud();}}
 if(overdrive>0)overdrive-=dt;if(ability<100)ability=Math.min(100,ability+dt*8);
 const speed=Math.hypot(velocity.x,velocity.z);walkPhase+=dt*speed*.5;distance+=speed*dt;bestSpeed=Math.max(bestSpeed,speed);
 if(speed>12&&grounded){comboTime=Math.max(comboTime,.3);score+=speed*dt*.3;}if(comboTime>0)comboTime-=dt;else combo=Math.max(1,combo-dt*.22);
 landingKick=Math.max(0,landingKick-dt*.65);
 const lateral=velocity.dot(right);const targetRoll=clamp(-lateral*.009,-.13,.13);
 const roll=THREE.MathUtils.damp(camera.rotation.z,targetRoll,7,dt);
 const bob=grounded?Math.sin(walkPhase*2)*Math.min(.055,speed*.002):0;
 const crouch=sliding?-.28:0;
 camera.position.set(position.x,position.y+crouch+bob+landingKick,position.z);
 camera.rotation.set(pitch,yaw,roll,'YXZ');
 const targetFov=clamp(94+speed*.58+(sprint&&grounded?3:0)+(grapple?5:0),82,116);
 camera.fov=THREE.MathUtils.damp(camera.fov,targetFov,5,dt);camera.updateProjectionMatrix();
 viewModel.position.y=THREE.MathUtils.damp(viewModel.position.y,-.3+(sliding?-.1:0)+Math.sin(walkPhase*2)*Math.min(.025,speed*.0009)+landingKick*.5,10,dt);
 viewModel.position.x=THREE.MathUtils.damp(viewModel.position.x,.34+Math.sin(walkPhase)*Math.min(.025,speed*.0008),8,dt);
 $('#speed').textContent=Math.round(speed).toString();$('#combo').textContent='FLOW x'+combo.toFixed(1);
 $('#ability').textContent=grappleCD>0?'GRAPPLE RECHARGING':grapple?'TETHER ACTIVE · BUILD MOMENTUM':'GRAPPLE READY · Q OVERDRIVE';
}
function update(dt:number){
 if(mode!=='playing'&&mode!=='training')return;
 for(let i=visualEffects.length-1;i>=0;i--){const fx=visualEffects[i];fx.life-=dt;if(fx.life<=0){scene.remove(fx.object);if(fx.object instanceof THREE.Line){fx.object.geometry.dispose();(fx.object.material as THREE.Material).dispose();}visualEffects.splice(i,1);}}
 if(playerShotLife>0){playerShotLife-=dt;if(playerShotLife<=0)playerShot.visible=false;}
 if(muzzleLife>0){muzzleLife-=dt;muzzleFlash.material.opacity=Math.max(0,muzzleLife/.055);if(muzzleLife<=0)muzzleFlash.visible=false;}
 if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('#notice').textContent='';}
 movePlayer(dt);updateEnemies(dt);updateEnemyProjectiles(dt);
 if(mode==='playing'&&enemies.every(e=>!e.alive))nextStage();
}
let last=0,acc=0,uiAccumulator=0;
function frame(now:number){
 requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000||0);last=now;
 if(mode==='playing'||mode==='training'){
   acc+=dt;let n=0;while(acc>=1/120&&n<8){update(1/120);acc-=1/120;n++;}
   uiAccumulator+=dt;if(uiAccumulator>=.1){uiAccumulator=0;const boss=enemies.find(e=>e.boss&&e.alive);if(boss){$('#bossbar').classList.remove('hidden');$('#bossfill').style.width=(100*boss.hp/boss.max)+'%';}else $('#bossbar').classList.add('hidden');updateObjective();hud();}
 }
 renderer.render(scene,camera);
}
requestAnimationFrame(frame);
function aim(dx:number,dy:number){const sens=Number(($('#sens') as HTMLInputElement).value)||1;yaw-=dx*.0022*sens;pitch=clamp(pitch-dy*.0022*sens,-1.48,1.48);}
canvas.addEventListener('click',()=>{if(mode==='playing'||mode==='training'){if(document.pointerLockElement!==canvas)canvas.requestPointerLock();}});
document.addEventListener('pointerlockchange',()=>$('#hint').classList.toggle('hidden',document.pointerLockElement===canvas||!(mode==='playing'||mode==='training')));
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas)aim(e.movementX,e.movementY);});
document.addEventListener('keydown',e=>{if(e.code==='Escape'){if(mode==='playing'||mode==='training')ui('paused');else if(mode==='paused')ui('playing');return;}keys.add(e.code);if(e.repeat)return;if(e.code==='Space'){e.preventDefault();jumpBuffer=.14;}if(e.code==='KeyE')grappleStart();if(e.code==='KeyQ'&&ability>=35){ability-=35;overdrive=3.5;velocity.multiplyScalar(1.15);note('OVERDRIVE // FLOW AMPLIFIED');sound(820,.2,'sine',.05);}if(e.code==='KeyR')reload();if(e.code==='Digit1')weapon='ARC';if(e.code==='Digit2')weapon='BREACH';if(e.code==='Digit3')weapon='RAIL';hud();});
document.addEventListener('keyup',e=>keys.delete(e.code));document.addEventListener('mousedown',e=>{if(e.button===0&&document.pointerLockElement===canvas)shoot();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode==='playing'||mode==='training'))ui('paused');});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));});
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.action;if(a==='play')start();if(a==='daily')start(false,true);if(a==='training')start(true);if(a==='resume')ui('playing');if(a==='restart')start(mode==='training');if(a==='retry')start();if(a==='menu')ui('menu');if(a==='settings'){settingsReturn=mode;ui('settings');}if(a==='settings-back'){camera.fov=Number(($('#fov') as HTMLInputElement).value);camera.updateProjectionMatrix();ui(settingsReturn);}if(a==='stats'){const rows=[['RUNS',save.runs],['BEST STAGE',save.highestStage],['BEST SCORE',save.highestScore],['TOTAL KILLS',save.kills],['DISTANCE',save.distance+' m'],['BEST COMBO','x'+save.longestCombo.toFixed(1)],['TOP SPEED',save.highestSpeed.toFixed(1)+' m/s'],['BOSSES',save.bossesDefeated]];$('#statgrid').innerHTML=rows.map(([k,v])=>'<div class="stat"><small>'+k+'</small><b>'+v+'</b></div>').join('');ui('stats');}}));
($('#quality') as HTMLSelectElement).addEventListener('change',e=>{const q=(e.target as HTMLSelectElement).value;renderer.setPixelRatio(Math.min(devicePixelRatio,q==='high'?1.5:q==='medium'?1:.7));});
arenaInit();
function arenaInit(){mode='menu';buildArena();ui('menu');}
