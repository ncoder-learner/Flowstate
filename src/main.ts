import * as THREE from 'three';
import { FEEL } from './config';
import { formatCareerDistance, getDailySeed, loadCareer, recordLegacyRun, updateCareer, type CareerProfile } from './career';
import { generateIndustrialExpedition, type IndustrialExpedition, type IndustrialShard } from './expedition';
import './style.css';

let career: CareerProfile = loadCareer();
type ShardPickup = { root: THREE.Group; shard: IndustrialShard };
let expeditionLayout: IndustrialExpedition | null = null;
let shardPickups: ShardPickup[] = [];
let expeditionUnbanked = 0;
let expeditionRoom = 0;
let lastRunWasExpedition = false;
let lastRunWasDailyExpedition = false;
let resumeMode: Mode = 'playing';
let extractionPromptCooldown = 0;
let extracting = false;
let extractionProgress = 0;

type Mode='menu'|'playing'|'expedition'|'extracted'|'paused'|'dead'|'training'|'settings'|'stats'|'upgrade'|'archive'|'research';
type Kind='RUNNER'|'SNIPER'|'TANK'|'DRONE'|'INTERCEPTOR';
type Weapon='ARC'|'BREACH'|'RAIL';
type Enemy={root:THREE.Group;core:THREE.Mesh;hitProxy:THREE.Mesh;healthBar:THREE.Group;healthFill:THREE.Mesh;kind:Kind;hp:number;max:number;speed:number;cool:number;windup:number;alive:boolean;boss:boolean};
type EnemyProjectile={mesh:THREE.Mesh;velocity:THREE.Vector3;damage:number;life:number};
type Pickup={root:THREE.Group;life:number;phase:number};
type LaunchPad={x:number;z:number;cooldown:number};
type Save={runs:number;highestStage:number;highestScore:number;kills:number;distance:number;longestCombo:number;highestSpeed:number;bossesDefeated:number};
const $=(s:string)=>document.querySelector<HTMLElement>(s)!;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const saveKey='flowstate-career-v1';
const baseSave:Save={runs:0,highestStage:0,highestScore:0,kills:0,distance:0,longestCombo:0,highestSpeed:0,bossesDefeated:0};
let save:Save;try{save={...baseSave,...JSON.parse(localStorage.getItem(saveKey)||'{}')};}catch{save={...baseSave};}
const persist=()=>localStorage.setItem(saveKey,JSON.stringify(save));
const app=$('#app');
app.innerHTML=String.raw`<canvas id="game"></canvas><div class="shell">
<section id="menu" class="screen"><div class="eyebrow">RUNNER PROGRAM // SIMULATION ACCESS</div><div class="brand">FLOW<span>STATE</span></div><div class="tagline">BREAK THE SIMULATION. LEAVE AN ECHO.</div><div class="menu-intro"><b>INDUSTRIAL SECTOR // ACCESS GRANTED</b><p>The simulation is unstable. Recover its data, master its movement systems, and find a way deeper. Your permanent career record is stored locally on this device.</p></div><nav class="menu"><button class="primary" data-action="play">ENTER THE SIMULATION <span>→</span></button><button data-action="archive">CAREER ARCHIVE</button><button data-action="research">RESEARCH NETWORK</button><button data-action="training">MOVEMENT TRAINING</button><button data-action="daily">DAILY FRACTURE <span>${getDailySeed()}</span></button><button data-action="settings">SETTINGS</button></nav><div class="control-guide"><b>CONTROLS</b><span><kbd>W A S D</kbd> Move</span><span><kbd>MOUSE</kbd> Look</span><span><kbd>CLICK</kbd> Fire</span><span><kbd>SPACE</kbd> Jump / air jump</span><span><kbd>SHIFT</kbd> Sprint / slide</span><span><kbd>E</kbd> Grapple / hold to extract</span><span><kbd>Q</kbd> Overdrive</span><span><kbd>F</kbd> Kinetic pulse</span><span><kbd>C</kbd> Air dash (airborne)</span><span><kbd>1 2 3</kbd> Weapons</span><span><kbd>R</kbd> Reload</span><span><kbd>ESC</kbd> Pause</span></div><div class="foot">DESKTOP: CLICK START, THEN CLICK THE ARENA TO CAPTURE MOUSE LOOK.</div></section>
<section id="hud" class="hud"><div class="hud-top"><div><div class="hud-label">SECTOR / STAGE</div><div id="stage" class="hud-value">01</div></div><div style="text-align:center"><div class="hud-label">FLOW SCORE</div><div id="score" class="hud-value">000000</div><div id="combo" class="combo">FLOW x1.0</div></div><div style="text-align:right"><div class="hud-label">VELOCITY</div><div id="speed" class="speed">0</div><div class="hud-label">M / SEC</div></div></div><div class="crosshair" id="crosshair"></div><div id="notice" class="notice"></div><div class="objective"><b id="objective-title">SECTOR OBJECTIVE</b><span id="objective-copy">Eliminate all hostiles</span></div><div class="inrun-controls"><b>QUICK CONTROLS</b><span>WASD move · Mouse aim</span><span>Click fire · Space jump / air jump</span><span>Shift sprint/slide · E grapple / hold to extract</span><span>Q overdrive · F kinetic pulse · C air dash · R reload</span><span>Glowing floor rings launch you</span><span>Esc pause</span></div><div id="bossbar" class="bossbar hidden"><span id="bossname">HOSTILE</span><div><i id="bossfill"></i></div></div><div class="hud-bottom"><div><div class="health" id="health">100 <small>/ 100 HP</small></div><div class="hud-label" id="ability">GRAPPLE READY · Q OVERDRIVE</div></div><div class="weapon"><span id="weapon">ARC PISTOL</span><small id="ammo">12 / 72 · 1/2/3 SWITCH</small></div></div></section>
<section id="extracted" class="screen hidden"><div class="panel"><div class="eyebrow">SIGNAL SECURED // EXPEDITION COMPLETE</div><h2>DATA RECOVERED.</h2><p id="extract-summary">Extraction successful.</p><div class="statgrid"><div class="stat"><small>RECOVERED DATA</small><b id="extract-shards">0</b></div><div class="stat"><small>ROOMS REACHED</small><b id="extract-rooms">0 / 4</b></div><div class="stat"><small>ELIMINATIONS</small><b id="extract-kills">0</b></div><div class="stat"><small>EXPEDITION SCORE</small><b id="extract-score">0</b></div></div><div class="menu"><button class="primary" data-action="next-expedition">DEPLOY AGAIN <span>→</span></button><button data-action="menu">RETURN TO HUB</button></div></div></section><section id="archive" class="screen hidden"><div class="panel"><div class="eyebrow">PERSISTENT PILOT RECORD // LOCAL ARCHIVE</div><h2>THE ARCHIVE.</h2><p id="archive-summary">Career data is stored on this device.</p><div id="archive-grid" class="statgrid"></div><div class="menu"><button class="primary" data-action="menu">RETURN TO HUB</button></div></div></section><section id="research" class="screen hidden"><div class="panel"><div class="eyebrow">INDUSTRIAL RESEARCH NETWORK</div><h2>RESEARCH.</h2><p>Recovered simulation data will power permanent upgrades and unlock new regions. The research economy becomes active when expedition extraction is implemented.</p><div class="statgrid"><div class="stat"><small>DATA SHARDS</small><b id="research-shards">0</b></div><div class="stat"><small>RESEARCH POINTS</small><b id="research-points">0</b></div><div class="stat"><small>REGIONS ACCESSIBLE</small><b id="research-regions">1</b></div><div class="stat"><small>MODULES DISCOVERED</small><b id="research-modules">0</b></div></div><div class="menu"><button class="primary" data-action="menu">RETURN TO HUB</button></div></div></section><section id="pause" class="screen hidden"><div class="panel"><div class="eyebrow">SIMULATION SUSPENDED</div><h2>PAUSED.</h2><p>WASD move · Mouse aim · Left-click fire · Space jump · Shift sprint/slide · E grapple · Q overdrive · F pulse · C air dash (airborne) · R reload · 1/2/3 weapons.</p><div class="menu"><button class="primary" data-action="resume">RESUME RUN</button><button data-action="restart">RESTART RUN</button><button data-action="settings">SETTINGS</button><button data-action="menu">MAIN MENU</button></div></div></section>
<section id="dead" class="screen hidden"><div class="panel"><div class="eyebrow">SIGNAL LOST // RUN TERMINATED</div><h2>FLOW BROKEN.</h2><p id="deathcopy"></p><div class="menu"><button class="primary" data-action="retry">RUN IT BACK</button><button data-action="menu">MAIN MENU</button></div></div></section>
<section id="settings" class="screen hidden"><div class="panel"><div class="eyebrow">SYSTEM CONFIGURATION</div><h2>YOUR RIG.</h2><div class="settings-row"><label for="sens">Mouse sensitivity</label><input id="sens" type="range" min=".3" max="2.5" step=".1" value="1"></div><div class="settings-row"><label for="fov">Field of view</label><input id="fov" type="range" min="75" max="110" step="1" value="94"></div><div class="settings-row"><label for="quality">Graphics quality</label><select id="quality"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div><div class="settings-row"><label for="motion">Reduced motion</label><input id="motion" type="checkbox"></div><div class="menu"><button class="primary" data-action="settings-back">SAVE / BACK</button></div></div></section>
<section id="upgrade" class="screen hidden"><div class="panel"><div class="eyebrow">SECTOR CLEAR // SYSTEM MODIFICATION</div><h2>CHOOSE YOUR EDGE.</h2><p id="upgrade-summary">Choose one permanent run upgrade. Mods stack between sectors and reset when you start a new run.</p><div class="menu"><button class="primary" data-action="upgrade-damage">HOT LOAD <span>+12% WEAPON DAMAGE</span></button><button data-action="upgrade-fire">QUICK FEED <span>+12% FIRE RATE</span></button><button data-action="upgrade-health">HARDENED FRAME <span>+15 MAX HP</span></button><button data-action="upgrade-ability">CAPACITOR <span>+3 ABILITY REGEN / SEC</span></button></div></div></section><section id="stats" class="screen hidden"><div class="panel"><div class="eyebrow">PILOT TELEMETRY // LOCAL RECORDS</div><h2>CAREER DATA.</h2><div id="statgrid" class="statgrid"></div><div class="menu"><button class="primary" data-action="menu">BACK</button></div></div></section><div id="hint" class="hint hidden">CLICK TO CAPTURE AIM · ESC TO PAUSE</div></div>`;

const canvas=$('#game') as HTMLCanvasElement;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x080b10);scene.fog=new THREE.FogExp2(0x080b10,.012);
const camera=new THREE.PerspectiveCamera(94,innerWidth/innerHeight,.08,260);camera.rotation.order='YXZ';scene.add(camera);
const viewModel=new THREE.Group();camera.add(viewModel);viewModel.position.set(.34,-.3,-.62);
const gunDark=new THREE.MeshStandardMaterial({color:0x18232d,roughness:.38,metalness:.72}),gunEdge=new THREE.MeshStandardMaterial({color:0x60717d,roughness:.32,metalness:.8}),gunAccent=new THREE.MeshStandardMaterial({color:0xff6b35,emissive:0x8b260b,emissiveIntensity:1.2}),gunBlue=new THREE.MeshStandardMaterial({color:0x4e9acb,emissive:0x153b5b,emissiveIntensity:1.1});
const gunBody=new THREE.Mesh(new THREE.BoxGeometry(.22,.17,.52),gunDark);viewModel.add(gunBody);
const gunBarrel=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.42,10),gunEdge);gunBarrel.rotation.x=Math.PI/2;gunBarrel.position.set(0,.035,-.42);viewModel.add(gunBarrel);
const gunTop=new THREE.Mesh(new THREE.BoxGeometry(.12,.045,.3),gunAccent);gunTop.position.set(0,.12,-.1);viewModel.add(gunTop);
const gunGrip=new THREE.Mesh(new THREE.BoxGeometry(.12,.24,.14),gunDark);gunGrip.position.set(0,-.16,.12);gunGrip.rotation.x=-.18;viewModel.add(gunGrip);
const gunSide=new THREE.Mesh(new THREE.BoxGeometry(.025,.09,.24),gunBlue);gunSide.position.set(.125,.01,-.08);viewModel.add(gunSide);
const breachBarrels=[-1,1].map(side=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.032,.04,.55,10),gunEdge);m.rotation.x=Math.PI/2;m.position.set(side*.065,.015,-.48);viewModel.add(m);return m;});
const railCoil=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.34,12),gunBlue);railCoil.rotation.x=Math.PI/2;railCoil.position.set(.075,.105,-.28);viewModel.add(railCoil);
const railSight=new THREE.Mesh(new THREE.BoxGeometry(.07,.1,.26),gunAccent);railSight.position.set(-.06,.12,-.26);viewModel.add(railSight);

scene.add(new THREE.HemisphereLight(0xb9d8f5,0x202b3a,1.65));const sun=new THREE.DirectionalLight(0xe4f1ff,2.1);sun.position.set(8,22,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-32;sun.shadow.camera.right=32;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;sun.shadow.bias=-.00025;scene.add(sun);
const glow=new THREE.PointLight(0xff642e,22,32);glow.position.set(0,5,0);scene.add(glow);
const world=new THREE.Group(),foes=new THREE.Group();scene.add(world,foes);
const material=(c:number,r=.75,m=.15)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const floorMat=material(0x202a34,.88,.22),wallMat=material(0x303d49,.72,.38),darkMat=material(0x101923,.58,.5);
const orangeMat=new THREE.MeshStandardMaterial({color:0xff6b35,emissive:0x8b260b,emissiveIntensity:1.2});
const blueMat=new THREE.MeshStandardMaterial({color:0x4e9acb,emissive:0x153b5b,emissiveIntensity:1.1});
const box=new THREE.BoxGeometry(1,1,1),colliders:THREE.Box3[]=[];
function block(x:number,y:number,z:number,sx:number,sy:number,sz:number,mat:THREE.Material,solid=true){const m=new THREE.Mesh(box,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=solid;m.receiveShadow=true;world.add(m);if(solid)colliders.push(new THREE.Box3().setFromObject(m));return m;}
function clear(g:THREE.Group){const disposed=new Set<THREE.Material>();for(const o of [...g.children]){g.remove(o);o.traverse(child=>{if(child instanceof THREE.Mesh){if(child.geometry!==box)child.geometry.dispose();const mats=Array.isArray(child.material)?child.material:[child.material];for(const mat of mats){if(!([floorMat,wallMat,darkMat,orangeMat,blueMat,gunDark,gunEdge,gunAccent,gunBlue,hitProxyMaterial] as THREE.Material[]).includes(mat)&&!disposed.has(mat)){mat.dispose();disposed.add(mat);}}}});}}
let mode:Mode='menu',stage=1,score=0,kills=0,hp=100,maxHp=100,damageBoost=1,fireRateBoost=1,abilityRegen=8,combo=1,bestCombo=1,comboTime=0,distance=0,bestSpeed=0,hurtIFrames=0,dailyRun=false,dailyModifier=0,trainingRun=false,dailySession=false;
const dailyContracts=['OVERCLOCK // DOUBLE ABILITY REGEN','HARD RESET // 35% MORE INCOMING DAMAGE · +40% SCORE','SCAVENGER // KILLS RESTORE AMMO'];
function currentFlowTier(){return combo>=FEEL.flowTier4?4:combo>=FEEL.flowTier3?3:combo>=FEEL.flowTier2?2:1;}
function flowTierName(){return ['BASE','SURGE','RUSH','APEX'][currentFlowTier()-1];}
function flowDamageMultiplier(){return 1+(currentFlowTier()-1)*FEEL.flowDamagePerTier;}
let weapon:Weapon='ARC',reloadWeapon:Weapon|null=null,mag:Record<Weapon,number>={ARC:12,BREACH:6,RAIL:4},reserve:Record<Weapon,number>={ARC:72,BREACH:30,RAIL:20};
const weaponData:Record<Weapon,{name:string;damage:number;rate:number;reload:number;spread:number;size:number}>={ARC:{name:'ARC PISTOL',damage:28,rate:.19,reload:1.1,spread:.006,size:12},BREACH:{name:'BREACH SHOTGUN',damage:17,rate:.72,reload:1.5,spread:.075,size:6},RAIL:{name:'RAIL PRECISION',damage:105,rate:1.05,reload:1.8,spread:0,size:4}};
let enemies:Enemy[]=[];
const enemyProjectiles:EnemyProjectile[]=[];
const pickups:Pickup[]=[];
const launchPads:LaunchPad[]=[];
let hazardTimer=0,hazardHitCooldown=0,hazardCycle=-1;
const hazardBeam=new THREE.Mesh(new THREE.BoxGeometry(52,.22,.34),new THREE.MeshBasicMaterial({color:0xff9a42,transparent:true,opacity:.9,depthWrite:false}));hazardBeam.position.y=.58;hazardBeam.visible=false;hazardBeam.renderOrder=25;scene.add(hazardBeam);
const keys=new Set<string>(),velocity=new THREE.Vector3(),position=new THREE.Vector3(0,1.7,8),forward=new THREE.Vector3(),right=new THREE.Vector3(),move=new THREE.Vector3();
let yaw=0,pitch=0,grounded=false,airJumps=1,sliding=false,slideTime=0,slideCooldown=0,pulseCooldown=0,airDashCooldown=0,airDashCarry=0,airDashStyleTime=0,slideNeedsRelease=false,landingKick=0,wasGrounded=true,wallrun=0,wallSide=0,settingsReturn:Mode='menu',coyote=0,jumpBuffer=0,grapple:THREE.Vector3|null=null,grappleCD=0,fireCD=0,reloadTime=0,overdrive=0,ability=100,noticeTime=0,walkPhase=0;
const ray=new THREE.Raycaster(),clock=new THREE.Clock();
const visualEffects:{object:THREE.Object3D;life:number}[]=[];
const hitProxyMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,colorWrite:false,depthWrite:false});
function disposeEnemy(e:Enemy){const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();e.root.traverse(o=>{if(o instanceof THREE.Mesh){if(o.geometry!==box)geometries.add(o.geometry);const list=Array.isArray(o.material)?o.material:[o.material];for(const m of list)if(m!==hitProxyMaterial)materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
const shotGeometry=new THREE.BufferGeometry();shotGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
const shotMaterial=new THREE.LineBasicMaterial({color:0xffd18a,transparent:true,opacity:1,depthTest:false});
const playerShot=new THREE.Line(shotGeometry,shotMaterial);playerShot.renderOrder=30;playerShot.visible=false;scene.add(playerShot);
const muzzleFlash=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshBasicMaterial({color:0xffc078,transparent:true,opacity:0,depthWrite:false}));muzzleFlash.visible=false;viewModel.add(muzzleFlash);muzzleFlash.position.set(.12,.02,-.78);
const speedLineCount=FEEL.speedLineCount,speedLinePositions=new Float32Array(speedLineCount*6),speedLineGeometry=new THREE.BufferGeometry();
speedLineGeometry.setAttribute('position',new THREE.BufferAttribute(speedLinePositions,3));
const speedLineMaterial=new THREE.LineBasicMaterial({color:0xd8f5ff,transparent:true,opacity:0,depthWrite:false});
const speedLines=new THREE.LineSegments(speedLineGeometry,speedLineMaterial);speedLines.frustumCulled=false;speedLines.renderOrder=40;camera.add(speedLines);
let playerShotLife=0,muzzleLife=0,baseFov=94,hitstopRemaining=0,slowMotionRemaining=0,sectorClearDelay=0,sectorClearStarted=false,slideJumpCarry=0;
function addTracer(from:THREE.Vector3,to:THREE.Vector3,color:number=0xffb15e,life=.2){const glowGeo=new THREE.BufferGeometry().setFromPoints([from,to]);const glow=new THREE.Line(glowGeo,new THREE.LineBasicMaterial({color:0xff7138,transparent:true,opacity:.32,depthTest:false}));glow.renderOrder=19;scene.add(glow);visualEffects.push({object:glow,life});const geo=new THREE.BufferGeometry().setFromPoints([from,to]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:1,depthTest:false}));line.renderOrder=20;scene.add(line);visualEffects.push({object:line,life});}
function addDeathBurst(at:THREE.Vector3,color:number){
 const group=new THREE.Group();group.position.copy(at);group.userData.effect='death-burst';
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.42,.055,6,20),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95}));
 ring.rotation.x=Math.PI/2;ring.position.y=.8;group.add(ring);
 for(let i=0;i<12;i++){
   const a=i/12*Math.PI*2,len=.8+Math.random()*.9;
   const from=new THREE.Vector3(Math.cos(a)*.18,.8+Math.random()*.35,Math.sin(a)*.18);
   const to=new THREE.Vector3(Math.cos(a)*len,.8+(Math.random()-.5)*.8,Math.sin(a)*len);
   const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([from,to]),new THREE.LineBasicMaterial({color,transparent:true,opacity:.95}));
   group.add(line);
 }
 scene.add(group);visualEffects.push({object:group,life:.42});
}
function launchEnemyProjectile(from:THREE.Vector3,target:THREE.Vector3,speed:number,damage:number){
 const direction=target.clone().sub(from).normalize();
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(.28,12,10),new THREE.MeshBasicMaterial({color:0xff3d82}));
 mesh.position.copy(from);scene.add(mesh);
 enemyProjectiles.push({mesh,velocity:direction.multiplyScalar(speed),damage,life:3.2});
}
function spawnPickup(at:THREE.Vector3){
 const root=new THREE.Group();root.position.copy(at);root.position.y=Math.max(1,root.position.y+1);
 const core=new THREE.Mesh(new THREE.OctahedronGeometry(.34,1),new THREE.MeshBasicMaterial({color:0x7bffd1}));
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.045,6,18),new THREE.MeshBasicMaterial({color:0x42cfff}));
 ring.rotation.x=Math.PI/2;root.add(core,ring);scene.add(root);pickups.push({root,life:12,phase:Math.random()*Math.PI*2});
}
function clearPickups(){for(const p of pickups){scene.remove(p.root);p.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});}pickups.length=0;}
function updatePickups(dt:number){
 for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.life-=dt;p.phase+=dt*3.5;p.root.rotation.y+=dt*1.8;p.root.position.y+=Math.sin(p.phase)*dt*.22;
   const dist=p.root.position.distanceTo(position);
   if(dist<1.65){const oldHp=hp;hp=Math.min(maxHp,hp+12);const oldAbility=ability;ability=Math.min(100,ability+22);score+=150;note('FLOW CELL // +'+(hp-oldHp)+' HP · +'+Math.round(ability-oldAbility)+'% OVERDRIVE');sound(760,.12,'sine',.045);hud();p.life=0;}
   if(p.life<=0){scene.remove(p.root);p.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});pickups.splice(i,1);}
 }
}
function clearEnemyProjectiles(){for(const p of enemyProjectiles){scene.remove(p.mesh);p.mesh.geometry.dispose();const materials=p.mesh.material; if(Array.isArray(materials))materials.forEach(m=>m.dispose());else materials.dispose();}enemyProjectiles.length=0;}
function kineticPulse(){if(mode!=='playing'&&mode!=='training'&&mode!=='expedition')return;if(ability<50||pulseCooldown>0){note(pulseCooldown>0?'PULSE RECHARGING':'NOT ENOUGH OVERDRIVE // NEED 50%');return;}ability-=50;pulseCooldown=4.5;const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.055,8,48),new THREE.MeshBasicMaterial({color:0x77e8ff,transparent:true,opacity:.95,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.set(position.x,.12,position.z);ring.userData.effect='pulse';scene.add(ring);visualEffects.push({object:ring,life:.48});let hitCount=0;for(const e of enemies){if(!e.alive)continue;const away=e.root.position.clone().sub(position),dist=away.length();if(dist<10){damage(e,e.boss?38:65,false,'PULSE BREAK');away.y=0;if(away.lengthSq()>.001)e.root.position.addScaledVector(away.normalize(),e.boss?1.1:3.1);hitCount++;}}for(let i=enemyProjectiles.length-1;i>=0;i--){const p=enemyProjectiles[i];if(p.mesh.position.distanceTo(position)<10){scene.remove(p.mesh);p.mesh.geometry.dispose();(p.mesh.material as THREE.Material).dispose();enemyProjectiles.splice(i,1);}}note('KINETIC PULSE // '+hitCount+' HOSTILES DISRUPTED');sound(125,.24,'sawtooth',.07);hud();}
function airDash(){if(mode!=='playing'&&mode!=='training'&&mode!=='expedition')return;if(grounded){note('AIR DASH // LEAVE THE GROUND FIRST');return;}if(airDashCooldown>0||ability<FEEL.airDashAbilityCost){note(airDashCooldown>0?'AIR DASH RECHARGING':'AIR DASH // NEED 20% ENERGY');return;}const direction=new THREE.Vector3();camera.getWorldDirection(direction);direction.y=0;if(direction.lengthSq()<.001)direction.set(0,0,-1);direction.normalize();ability-=FEEL.airDashAbilityCost;airDashCooldown=FEEL.airDashCooldown;airDashCarry=FEEL.airDashCarryTime;airDashStyleTime=FEEL.airDashStyleWindow;velocity.x+=direction.x*FEEL.airDashImpulse;velocity.z+=direction.z*FEEL.airDashImpulse;velocity.y=Math.max(velocity.y,FEEL.airDashVertical);const from=position.clone().add(new THREE.Vector3(0,-.65,0));addTracer(from,from.clone().addScaledVector(direction,-1.8),0x78eaff,.16);sound(760,.09,'sawtooth',.045);note('AIR DASH // MOMENTUM EXTENDED');hud();}
function updateLaunchPads(dt:number){for(const pad of launchPads){pad.cooldown=Math.max(0,pad.cooldown-dt);if(pad.cooldown<=0&&grounded&&Math.hypot(position.x-pad.x,position.z-pad.z)<1.35){velocity.y=14.2;velocity.x+=forward.x*3.2;velocity.z+=forward.z*3.2;grounded=false;coyote=0;airJumps=1;pad.cooldown=1.45;sound(440,.16,'sine',.055);note('KINETIC LAUNCH // CHAIN YOUR AIR JUMP');}}}
function updateHazard(dt:number){
 if(mode!=='playing'||stage%4!==0){hazardBeam.visible=false;return;}
 hazardTimer+=dt;if(hazardHitCooldown>0)hazardHitCooldown=Math.max(0,hazardHitCooldown-dt);
 const cycle=Math.floor(hazardTimer/7),phase=hazardTimer%7;
 if(cycle!==hazardCycle){hazardCycle=cycle;note('OVERLOAD SWEEP // WATCH THE FLOOR');}
 if(phase<1.5){hazardBeam.visible=true;hazardBeam.position.z=-20; (hazardBeam.material as THREE.MeshBasicMaterial).color.setHex(0xffa044);(hazardBeam.material as THREE.MeshBasicMaterial).opacity=.45+.25*Math.sin(phase*8);}
 else if(phase<3.5){const progress=(phase-1.5)/2;hazardBeam.visible=true;hazardBeam.position.z=-20+40*progress;(hazardBeam.material as THREE.MeshBasicMaterial).color.setHex(0xff244f);(hazardBeam.material as THREE.MeshBasicMaterial).opacity=1;
   if(Math.abs(position.z-hazardBeam.position.z)<.85&&Math.abs(position.x)<25&&position.y<2.65&&hazardHitCooldown<=0){hurt(14);hazardHitCooldown=.85;note('OVERLOAD HIT // JUMP THE SWEEP');}
 }else hazardBeam.visible=false;
}
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
let audioContext:AudioContext|null=null,windOscillator:OscillatorNode|null=null,windGain:GainNode|null=null;function sound(freq:number,dur=.08,type:OscillatorType='sawtooth',vol=.035){try{const c=audioContext??(audioContext=new AudioContext());if(!windOscillator){windOscillator=c.createOscillator();windGain=c.createGain();windOscillator.type='sawtooth';windOscillator.frequency.value=FEEL.windBasePitch;windGain.gain.value=.0001;windOscillator.connect(windGain);windGain.connect(c.destination);windOscillator.start();}const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+dur);}catch{}}
function ui(next:Mode){mode=next;for(const id of ['menu','pause','dead','settings','stats','upgrade','archive','research','extracted'])$('#'+id).classList.toggle('hidden',id!==next);$('#hud').classList.toggle('active',next==='playing'||next==='training'||next==='expedition');if(next!=='playing'&&next!=='training'&&next!=='expedition'&&document.pointerLockElement)document.exitPointerLock();$('#hint').classList.toggle('hidden',next!=='playing'&&next!=='training'&&next!=='expedition');}
function setWeaponModel(){const v=weapon==='ARC'?{body:[1,1,1],barrel:1,top:[1,1,1]}:weapon==='BREACH'?{body:[1.28,1.12,1.2],barrel:1.45,top:[1.15,1.2,1.25]}:{body:[.92,.95,1.28],barrel:2.05,top:[.9,.9,1.65]};gunBody.scale.set(...v.body as [number,number,number]);gunBarrel.scale.z=v.barrel;gunBarrel.visible=weapon!=='BREACH';breachBarrels.forEach(m=>m.visible=weapon==='BREACH');railCoil.visible=weapon==='RAIL';railSight.visible=weapon==='RAIL';gunSide.visible=weapon!=='RAIL';gunTop.scale.set(...v.top as [number,number,number]);gunBarrel.position.z=weapon==='ARC' ? -0.42 : weapon==='BREACH' ? -0.5 : -0.66;viewModel.position.x=weapon==='BREACH' ? 0.38 : 0.34;viewModel.position.z=weapon==='RAIL'?-.72:-.62;}
function hud(){setWeaponModel();$('#stage').textContent=String(stage).padStart(2,'0');$('#score').textContent=Math.floor(score).toString().padStart(6,'0');$('#health').innerHTML=Math.max(0,Math.ceil(hp))+' <small>/ '+maxHp+' HP</small>';$('#weapon').textContent=weaponData[weapon].name;$('#ammo').textContent=reloadTime>0&&reloadWeapon===weapon?'RELOADING '+reloadTime.toFixed(1)+'s · R':mag[weapon]+' / '+reserve[weapon]+' · R RELOAD';$('#ammo').classList.toggle('ammo-low',mag[weapon]<=Math.max(1,Math.ceil(weaponData[weapon].size*.25)));$('#ammo').classList.toggle('reloading',reloadTime>0&&reloadWeapon===weapon);$('#combo').textContent='FLOW x'+combo.toFixed(1)+' · '+flowTierName();}
function spawn(kind:Kind,p:THREE.Vector3,boss=false){
 const g=new THREE.Group(),colors:Record<Kind,number>={RUNNER:0xff543f,SNIPER:0x27c9ff,TANK:0xffcf3f,DRONE:0xc06bff,INTERCEPTOR:0x9dff45};
 const scale=boss?1.55:kind==='TANK'?1.3:1;
 const armor=material(colors[kind],.34,.62),dark=material(0x111d2a,.42,.72),glowMat=new THREE.MeshStandardMaterial({color:colors[kind],emissive:colors[kind],emissiveIntensity:2.2,roughness:.28,metalness:.35});armor.emissive.setHex(colors[kind]);armor.emissiveIntensity=.16;g.userData.hitMaterial=armor;
 const add=(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
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
 const core=add(new THREE.SphereGeometry(.24,14,10),new THREE.MeshBasicMaterial({color:0xffe08a}),0,kind==='DRONE'?0:1.58*scale,kind==='DRONE'?-1.58:-1.18*scale);core.scale.setScalar(kind==='DRONE'?1.12:1);const weakpointRing=add(new THREE.TorusGeometry(.34,.045,6,18),new THREE.MeshBasicMaterial({color:0xff7138}),0,kind==='DRONE'?0:1.58*scale,kind==='DRONE'?-1.58:-1.18*scale);weakpointRing.scale.setScalar(kind==='DRONE'?1.12:1);
 const hitProxy=new THREE.Mesh(new THREE.SphereGeometry(kind==='TANK'?1.28:kind==='DRONE'?1.3:kind==='INTERCEPTOR'?1.08:.98,12,10),hitProxyMaterial);hitProxy.position.set(0,kind==='DRONE'?0:.94*scale,0);hitProxy.userData.hitTarget=true;g.add(hitProxy);
 const healthBar=new THREE.Group();healthBar.position.set(0,2.35*scale,0);healthBar.visible=boss;const healthBack=new THREE.Mesh(new THREE.PlaneGeometry(1.18,.09),new THREE.MeshBasicMaterial({color:0x101820,transparent:true,opacity:.9,depthWrite:false}));const healthFill=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.055),new THREE.MeshBasicMaterial({color:colors[kind],depthWrite:false}));healthFill.position.z=.01;healthBar.add(healthBack,healthFill);g.add(healthBar);
 g.position.copy(p);foes.add(g);
 const difficulty=1+Math.min(.95,Math.max(0,stage-1)*.065),h=(boss?850:kind==='TANK'?210:kind==='DRONE'?42:kind==='SNIPER'?65:kind==='INTERCEPTOR'?140:48)*difficulty;
 enemies.push({root:g,core,hitProxy,healthBar,healthFill,kind,hp:h,max:h,speed:(kind==='RUNNER'?3.8:kind==='INTERCEPTOR'?5.5:kind==='TANK'?1.5:kind==='DRONE'?2.2:0)*(1+Math.min(.55,Math.max(0,stage-1)*.035)),cool:Math.random()+1.3,windup:0,alive:true,boss});
 if(boss){$('#bossbar').classList.remove('hidden');$('#bossname').textContent=stage%25===0?'THE COLOSSUS':stage%10===0?'THE WRAITH':'THE HUNTER';}
}
const arenaLights:THREE.PointLight[]=[];
function buildArena(){clearPickups();hazardTimer=0;hazardHitCooldown=0;hazardCycle=-1;hazardBeam.visible=false;clearEnemyProjectiles();launchPads.length=0;for(const light of arenaLights)scene.remove(light);arenaLights.length=0;colliders.length=0;clear(world);clear(foes);enemies=[];
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
 // Launch pads reward routing through the outer lanes and feed directly into the air-movement loop.
 for(const x of [-19,19])for(const z of [-10,10]){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.09,8,24),x<0?blueMat:orangeMat);ring.rotation.x=Math.PI/2;ring.position.set(x,.09,z);world.add(ring);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.55,.7,.12,12),darkMat);hub.position.set(x,.04,z);world.add(hub);launchPads.push({x,z,cooldown:.4});}
 // Stage layouts rotate between distinct combat geometries while preserving the same arena bounds.
 const layout=stage%3;
 if(layout===1){for(const x of [-8,8])for(const z of [-7,7]){block(x,1.35,z,2.2,2.7,2.2,darkMat);block(x,2.74,z,2.05,.08,2.05,orangeMat,false);}block(0,3.25,-16,7,.45,2.2,darkMat);block(0,3.5,-16,6.7,.08,1.9,blueMat,false);}
 else if(layout===2){for(const x of [-12,-4,4,12]){block(x,1.8,-9,2.8,3.6,2.8,darkMat);block(x,3.66,-9,2.65,.08,2.65,x<0?blueMat:orangeMat,false);}block(0,1.15,2,8,2.3,2,darkMat);block(0,2.34,2,7.7,.08,1.8,orangeMat,false);}
 else{for(const z of [-15,-5,5,15]){block(-8,1.1,z,3.2,2.2,1.2,darkMat);block(8,1.1,z,3.2,2.2,1.2,darkMat);}block(0,4.1,-10,10,.5,1.1,darkMat);block(0,4.37,-10,9.7,.08,.9,blueMat,false);}
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
 // Architectural art pass: a suspended turbine crown, illuminated floor guides, and reinforced wall ribs.
 const crown=new THREE.Group();crown.position.set(0,10.4,-7);world.add(crown);
 const crownOuter=new THREE.Mesh(new THREE.TorusGeometry(8.8,.22,10,64),darkMat);crownOuter.rotation.x=Math.PI/2;crown.add(crownOuter);
 const crownInner=new THREE.Mesh(new THREE.TorusGeometry(7.7,.075,8,64),blueMat);crownInner.rotation.x=Math.PI/2;crownInner.position.y=-.12;crown.add(crownInner);
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,spoke=new THREE.Mesh(new THREE.BoxGeometry(.16,.18,1.15),i%2?blueMat:orangeMat);spoke.position.set(Math.cos(a)*8.25,0,Math.sin(a)*8.25);spoke.rotation.y=-a;crown.add(spoke);}
 for(const side of [-1,1])for(let z=-22;z<=22;z+=5.5){
   block(side*26.85,3.4,z,.22,6.4,.32,darkMat,false);
   block(side*26.7,6.2,z,.12,.12,1.9,side<0?blueMat:orangeMat,false);
 }
 for(let z=-18;z<=14;z+=8){
   const stripe=new THREE.Mesh(new THREE.BoxGeometry(1.35,.035,.12),new THREE.MeshBasicMaterial({color:z%16===0?0x48d8ff:0xff9a58}));
   stripe.position.set(0,.035,z);world.add(stripe);
   for(const side of [-1,1]){
     const guide=new THREE.Mesh(new THREE.BoxGeometry(.1,.025,2.2),new THREE.MeshBasicMaterial({color:side<0?0x48d8ff:0xff9a58}));
     guide.position.set(side*4.1,.035,z);world.add(guide);
   }
 }
 // Central reactor landmark with stacked emissive rings.
 const reactor=new THREE.Group();reactor.position.set(0,0,-23);world.add(reactor);
 const coreMesh=new THREE.Mesh(new THREE.CylinderGeometry(.65,.9,4.8,10),darkMat);coreMesh.position.y=2.4;reactor.add(coreMesh);
 for(const y of [1.1,2.4,3.7]){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.09,8,24),orangeMat);ring.rotation.x=Math.PI/2;ring.position.y=y;reactor.add(ring);}
 const reactorLight=new THREE.PointLight(0xff642e,16,24);reactorLight.position.set(0,3,-23);scene.add(reactorLight);arenaLights.push(reactorLight);
 position.set(0,1.7,17);velocity.set(0,0,0);airJumps=1;pulseCooldown=0;yaw=0;pitch=0;camera.position.copy(position);camera.rotation.set(pitch,yaw,0,'YXZ');hp=Math.min(maxHp,hp);grounded=true;sliding=false;grapple=null;grappleCD=0;wallrun=0;coyote=.12;
 if(mode!=='training'){
   const count=stage===1?3:stage%5===0?5:stage>=13?7:stage>=9?6:stage%3===0?5:4;
   const types:Kind[]=['RUNNER','RUNNER','SNIPER','DRONE','TANK','INTERCEPTOR'];
   for(let i=0;i<count;i++){
     const xs=[-9,0,9,-14,14,-5,5,0,-18,18,-11,11],zs=[-10,-13,-10,-18,-18,-22,-22,-25,-6,-6,-15,-15];
     const kind=stage===1?(['RUNNER','RUNNER','SNIPER'][i%3] as Kind):stage%5===0?(i===0?'TANK':i===1?'DRONE':i===2?'SNIPER':'INTERCEPTOR'):stage%3===0?(i<2?'INTERCEPTOR':i===2?'DRONE':i===3?'RUNNER':'SNIPER'):types[(i+stage)%types.length];
     spawn(kind,new THREE.Vector3(xs[i],kind==='DRONE'?3:0,zs[i]));
   }
   if(stage%5===0)spawn(stage%10===0?'DRONE':'TANK',new THREE.Vector3(0,stage%10===0?3:0,-21),true);
 }
 $('#bossbar').classList.toggle('hidden',!enemies.some(e=>e.boss));hud();updateObjective();}
function clearShardPickups(){
 for(const pickup of shardPickups){scene.remove(pickup.root);pickup.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});}
 shardPickups.length=0;
}
function buildExpedition(seed:string){
 clearPickups();clearShardPickups();clearEnemyProjectiles();launchPads.length=0;hazardTimer=0;hazardHitCooldown=0;hazardCycle=-1;hazardBeam.visible=false;
 for(const light of arenaLights)scene.remove(light);arenaLights.length=0;
 colliders.length=0;clear(world);clear(foes);enemies=[];
 expeditionLayout=generateIndustrialExpedition(seed);
 const layout=expeditionLayout;
 block(0,-.5,-35.5,30,1,112,floorMat);
 block(-15.2,5,-35.5,.8,11,112,wallMat);block(15.2,5,-35.5,.8,11,112,wallMat);
 block(0,5,20,30,11,.8,wallMat);block(0,5,-91,30,11,.8,wallMat);
 for(const z of [-9,-35,-61]){
   block(-10,5,z,10,10,.9,wallMat);block(10,5,z,10,10,.9,wallMat);
   block(0,10.2,z,10,.35,1.2,darkMat);
   block(0,10.42,z,8,.07,.12,orangeMat,false);
 }
 for(const room of layout.rooms){
   block(0,10.7,room.centerZ,29,.35,room.depth,darkMat);
   block(0,10.92,room.centerZ,26,.07,.12,room.variant===1?blueMat:orangeMat,false);
   for(const cover of room.cover){
     block(cover.x,cover.height/2,cover.z,cover.width,cover.height,cover.depth,darkMat);
     block(cover.x,cover.height+.04,cover.z,cover.width*.94,.08,cover.depth*.94,room.variant===1?blueMat:orangeMat,false);
   }
   const lamp=new THREE.PointLight(room.variant===1?0x48d8ff:0xff7138,13,25);
   lamp.position.set(room.variant===1?-8:8,7,room.centerZ);world.add(lamp);arenaLights.push(lamp);
   for(const shard of room.shards){
     const root=new THREE.Group();root.position.set(shard.x,1.35,shard.z);
     const core=new THREE.Mesh(new THREE.OctahedronGeometry(.38,1),new THREE.MeshStandardMaterial({color:0x83f4ff,emissive:0x1686a8,emissiveIntensity:1.8,metalness:.35,roughness:.24}));
     const ring=new THREE.Mesh(new THREE.TorusGeometry(.58,.045,7,24),new THREE.MeshBasicMaterial({color:0xffa36b}));
     ring.rotation.x=Math.PI/2;root.add(core,ring);scene.add(root);shardPickups.push({root,shard});
   }
   for(const hostile of room.hostiles)spawn(hostile.kind,new THREE.Vector3(hostile.x,hostile.kind==='DRONE'?3:0,hostile.z));
 }
 for(const x of [-10,10])for(const z of [-20,-46]){
   const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.09,8,24),x<0?blueMat:orangeMat);ring.rotation.x=Math.PI/2;ring.position.set(x,.09,z);world.add(ring);
   const hub=new THREE.Mesh(new THREE.CylinderGeometry(.55,.7,.12,12),darkMat);hub.position.set(x,.04,z);world.add(hub);launchPads.push({x,z,cooldown:.35});
 }
 const beacon=new THREE.Group();beacon.position.set(layout.extraction.x,.08,layout.extraction.z);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(1.8,2.2,.24,16),darkMat);base.position.y=.12;beacon.add(base);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.45,.11,8,32),orangeMat);ring.rotation.x=Math.PI/2;ring.position.y=.42;beacon.add(ring);
 const column=new THREE.Mesh(new THREE.CylinderGeometry(.12,.32,5.8,10),new THREE.MeshBasicMaterial({color:0x48d8ff,transparent:true,opacity:.42}));column.position.y=3;beacon.add(column);
 world.add(beacon);
 const extractionLight=new THREE.PointLight(0x48d8ff,24,20);extractionLight.position.set(0,3,layout.extraction.z);scene.add(extractionLight);arenaLights.push(extractionLight);
 position.set(0,1.7,14);velocity.set(0,0,0);airJumps=1;pulseCooldown=0;yaw=0;pitch=0;camera.position.copy(position);camera.rotation.set(pitch,yaw,0,'YXZ');
 hp=maxHp;grounded=true;sliding=false;grapple=null;grappleCD=0;wallrun=0;coyote=.12;extracting=false;extractionProgress=0;
 $('#bossbar').classList.add('hidden');hud();updateObjective();
}
function updateExpedition(dt:number){
 if(!expeditionLayout)return;
 if(extractionPromptCooldown>0)extractionPromptCooldown=Math.max(0,extractionPromptCooldown-dt);
 if(position.z>-9)expeditionRoom=0;else if(position.z>-35)expeditionRoom=1;else if(position.z>-61)expeditionRoom=2;else expeditionRoom=3;
 for(let i=shardPickups.length-1;i>=0;i--){
   const pickup=shardPickups[i];pickup.root.rotation.y+=dt*1.2;pickup.root.position.y=1.35+Math.sin(performance.now()*.002+i)*.12;
   if(pickup.root.position.distanceTo(position)<1.8){
     expeditionUnbanked+=pickup.shard.value;scene.remove(pickup.root);
     pickup.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});
     shardPickups.splice(i,1);note('DATA RECOVERED // +'+pickup.shard.value+' · '+expeditionUnbanked+' CARRIED');sound(720,.12,'sine',.045);
   }
 }
 if(extracting){
   if(!keys.has('KeyE')){extracting=false;extractionProgress=0;note('EXTRACTION CANCELLED');}
   else{extractionProgress+=dt;if(extractionProgress>=1.35)completeExtraction();}
 }
}
function attemptExtraction(){
 if(!expeditionLayout||mode!=='expedition')return;
 const distanceToBeacon=Math.hypot(position.x-expeditionLayout.extraction.x,position.z-expeditionLayout.extraction.z);
 if(distanceToBeacon>3.6){if(extractionPromptCooldown<=0){note('EXTRACTION BEACON // '+Math.ceil(distanceToBeacon)+' M AWAY');extractionPromptCooldown=.8;}return;}
 if(extracting)return;
 extracting=true;extractionProgress=0;note('HOLD E // SECURING EXTRACTION');
}
function completeExtraction(){
 if(!expeditionLayout||mode!=='expedition')return;
 extracting=false;
 const recovered=expeditionUnbanked;
 career=updateCareer(career,draft=>{
   draft.successfulExtractions+=1;draft.dataShards+=recovered;draft.researchPoints+=recovered;
   draft.totalSectors=Math.max(draft.totalSectors,expeditionRoom+1);draft.totalKills+=kills;draft.totalDistance+=Math.floor(distance);
   draft.bestScore=Math.max(draft.bestScore,Math.floor(score));draft.bestFlow=Math.max(draft.bestFlow,bestCombo);draft.bestSpeed=Math.max(draft.bestSpeed,bestSpeed);
 });
 $('#extract-summary').textContent='You secured '+recovered+' data shards and '+recovered+' research points. Unbanked expedition data is now permanent.';
 $('#extract-shards').textContent=recovered.toString();$('#extract-rooms').textContent=(expeditionRoom+1)+' / 4';$('#extract-kills').textContent=kills.toString();$('#extract-score').textContent=Math.floor(score).toLocaleString();
 ui('extracted');sound(920,.3,'sine',.07);
}
function updateObjective(){
 const alive=enemies.filter(e=>e.alive).length,total=enemies.length,cleared=total-alive;
 if(mode==='expedition'&&expeditionLayout){const room=expeditionLayout.rooms[expeditionRoom];$('#objective-title').textContent=(dailyRun?'DAILY FRACTURE // ':'')+room.title+' // INDUSTRIAL';const extractionDistance=Math.hypot(position.x-expeditionLayout.extraction.x,position.z-expeditionLayout.extraction.z);const extractionLabel=extracting?'HOLD E TO EXTRACT '+Math.min(100,Math.round(extractionProgress/1.35*100))+'%':extractionDistance<=3.6?'HOLD E TO BANK DATA':'EXTRACTION '+Math.round(extractionDistance)+' M';$('#objective-copy').textContent=expeditionUnbanked+' DATA CARRIED · '+alive+' HOSTILES ACTIVE · '+extractionLabel;return;}
 $('#objective-title').textContent=mode==='training'?'MOVEMENT TRAINING':dailyRun?'DAILY CONTRACT // '+dailyContracts[dailyModifier].split(' // ')[0]:stage%4===0?'HAZARD SECTOR // OVERLOAD SWEEP':'SECTOR '+String(stage).padStart(2,'0')+' OBJECTIVE';
 $('#objective-copy').textContent=mode==='training'?'Practice movement. No enemies here.':(alive===0?'SECTOR CLEAR — NEXT SECTOR INCOMING':cleared+'/'+total+' CLEARED · '+alive+' HOSTILES REMAINING'+(stage%4===0?' · JUMP THE SWEEP':''))+(dailyRun?' · '+dailyContracts[dailyModifier].split(' // ')[1]:'');
}
function startExpedition(daily=false){lastRunWasExpedition=true;lastRunWasDailyExpedition=daily;trainingRun=false;dailySession=daily;dailyRun=daily;dailyModifier=Math.floor(Date.now()/86400000)%dailyContracts.length;sectorClearStarted=false;sectorClearDelay=0;hitstopRemaining=0;slowMotionRemaining=0;slideJumpCarry=0;airDashCooldown=0;airDashCarry=0;airDashStyleTime=0;hurtIFrames=0;grappleCD=0;pulseCooldown=0;overdrive=0;stage=1;score=0;kills=0;maxHp=100;hp=maxHp;damageBoost=1;fireRateBoost=1;abilityRegen=8;combo=1;bestCombo=1;comboTime=0;distance=0;bestSpeed=0;ability=100;reloadTime=0;reloadWeapon=null;mag={ARC:12,BREACH:6,RAIL:4};reserve={ARC:72,BREACH:30,RAIL:20};expeditionUnbanked=0;expeditionRoom=0;extractionPromptCooldown=0;career=updateCareer(career,draft=>{draft.expeditions+=1;draft.lastDailySeed=getDailySeed();});mode='expedition';buildExpedition(daily?getDailySeed():getDailySeed()+'-'+career.expeditions);ui('expedition');note('EXPEDITION // INDUSTRIAL SECTOR // RECOVER DATA AND EXTRACT');updateObjective();}
function start(training=false,daily=false){lastRunWasExpedition=false;trainingRun=training;dailySession=daily&&!training;dailyRun=dailySession;sectorClearStarted=false;sectorClearDelay=0;hitstopRemaining=0;slowMotionRemaining=0;slideJumpCarry=0;airDashCooldown=0;airDashCarry=0;airDashStyleTime=0;dailyModifier=Math.floor(Date.now()/86400000)%dailyContracts.length;stage=1;score=0;kills=0;maxHp=100;hp=maxHp;damageBoost=1;fireRateBoost=1;abilityRegen=8;combo=1;bestCombo=1;comboTime=0;distance=0;ability=100;reloadTime=0;reloadWeapon=null;mag={ARC:12,BREACH:6,RAIL:4};reserve={ARC:72,BREACH:30,RAIL:20};mode=training?'training':'playing';if(!training){save.runs++;persist();}buildArena();ui(mode);note(dailyRun?'DAILY CONTRACT // '+dailyContracts[dailyModifier]:training?'TRAINING // PRACTICE MOVEMENT':'OBJECTIVE // ELIMINATE ALL HOSTILES');updateObjective();}
function endRun(){if(mode==='expedition'){career=updateCareer(career,draft=>{draft.failedExpeditions+=1;draft.totalKills+=kills;draft.totalDistance+=Math.floor(distance);draft.bestScore=Math.max(draft.bestScore,Math.floor(score));draft.bestFlow=Math.max(draft.bestFlow,bestCombo);draft.bestSpeed=Math.max(draft.bestSpeed,bestSpeed);});$('#deathcopy').textContent='EXPEDITION FAILED // '+expeditionUnbanked+' UNBANKED DATA LOST // '+kills+' HOSTILES NEUTRALIZED.';ui('dead');return;}save.highestStage=Math.max(save.highestStage,stage);save.highestScore=Math.max(save.highestScore,Math.floor(score));save.kills+=kills;save.distance+=Math.floor(distance);save.longestCombo=Math.max(save.longestCombo,bestCombo);save.highestSpeed=Math.max(save.highestSpeed,bestSpeed);persist();career=recordLegacyRun(career,{sectors:stage,score,kills,distance,bestFlow:bestCombo,bestSpeed});$('#deathcopy').textContent='STAGE '+stage+' // SCORE '+Math.floor(score).toLocaleString()+' // '+kills+' ELIMINATIONS // BEST FLOW x'+bestCombo.toFixed(1)+'. PERSONAL BEST: '+save.highestScore.toLocaleString()+'.';ui('dead');}
function nextStage(choice:string){sectorClearStarted=false;sectorClearDelay=0;slowMotionRemaining=0;hitstopRemaining=0;airDashCooldown=0;airDashCarry=0;airDashStyleTime=0;if(choice==='damage')damageBoost=Math.min(1.8,damageBoost*1.12);if(choice==='fire')fireRateBoost=Math.min(1.7,fireRateBoost*1.12);if(choice==='health'){maxHp=Math.min(160,maxHp+15);hp=Math.min(maxHp,hp+30);}if(choice==='ability')abilityRegen=Math.min(20,abilityRegen+3);stage++;score+=stage*100;hp=Math.min(maxHp,hp+18);ability=Math.min(100,ability+25);mag.ARC=Math.min(12,mag.ARC+5);mag.BREACH=Math.min(6,mag.BREACH+2);mag.RAIL=Math.min(4,mag.RAIL+1);reserve.ARC=Math.min(120,reserve.ARC+14);reserve.BREACH=Math.min(48,reserve.BREACH+7);reserve.RAIL=Math.min(32,reserve.RAIL+5);mode='playing';buildArena();ui('playing');note('SECTOR '+String(stage).padStart(2,'0')+' // INCOMING');updateObjective();}
function hurt(n:number){if((mode!=='playing'&&mode!=='expedition')||hurtIFrames>0)return;if(dailyRun&&dailyModifier===1)n*=1.35;hurtIFrames=.72;hp-=n;$('#hud').classList.add('taking-damage');setTimeout(()=>$('#hud').classList.remove('taking-damage'),180);sound(65,.13,'sawtooth',.06);if(hp<=0)endRun();hud();}
function damage(e:Enemy,n:number,critical=false,styleOverride=''){
 n*=flowDamageMultiplier();
 if(critical){sound(FEEL.critPitch,.1,'triangle',.065);$('#crosshair').classList.add('critical-hit');}
 const speed=Math.hypot(velocity.x,velocity.z);
 const style=styleOverride||(airDashStyleTime>0?'DASH KILL':grapple?'TETHER KILL':sliding?'SLIDE KILL':!grounded?'AIR KILL':speed>=FEEL.styleSpeedThreshold?'HYPERSONIC':critical?'CORE BREAK':'');
 const stylePoints=style?Math.round(FEEL.styleKillScore*(1+(currentFlowTier()-1)*.2)):0;
 e.hp-=n;e.healthBar.visible=true;const ratio=clamp(e.hp/e.max,0,1);e.healthFill.scale.x=ratio;e.healthFill.position.x=-(1-ratio)*.55;e.root.scale.setScalar(1.1);
 const bonus=Math.floor(speed*1.8)+(grounded?0:35)+(sliding?25:0)+(grapple?50:0);
 score+=Math.round(n*.35+bonus)*combo*(dailyRun&&dailyModifier===1?1.4:1);
 if(e.hp<=0){
   e.alive=false;hitstopRemaining=Math.max(hitstopRemaining,FEEL.killHitstop);
   if(e.boss)slowMotionRemaining=Math.max(slowMotionRemaining,FEEL.bossKillSlowMotion);
   if(dailyRun&&dailyModifier===2){mag[weapon]=Math.min(weaponData[weapon].size,mag[weapon]+1);reserve[weapon]=Math.min(weapon==='ARC'?120:weapon==='BREACH'?48:32,reserve[weapon]+1);}
   if((kills+1)%3===0)spawnPickup(e.root.position);
   addDeathBurst(e.root.position,({RUNNER:0xff7048,SNIPER:0x72c9ff,TANK:0xffb36b,DRONE:0xc29aff,INTERCEPTOR:0xffa04a} as Record<Kind,number>)[e.kind]);
   foes.remove(e.root);disposeEnemy(e);kills++;
   airJumps=1;grappleCD=0;
   const oldAbility=ability;ability=Math.min(100,ability+FEEL.killAbilityRefund);
   const oldHp=hp;if(style&&style!=='CORE BREAK')hp=Math.min(maxHp,hp+FEEL.aggressionHealthRefund);
   const energyRefund=Math.round(ability-oldAbility),healthRefund=Math.round(hp-oldHp);
   const previousTier=currentFlowTier();combo=Math.min(8,combo+.35);comboTime=4.5;bestCombo=Math.max(bestCombo,combo);const newTier=currentFlowTier();const tierCallout=newTier>previousTier?' · FLOW TIER '+newTier+' // +'+Math.round((newTier-1)*FEEL.flowDamagePerTier*100)+'% DAMAGE':'';
   score+=Math.round((100+bonus)*combo)*(dailyRun&&dailyModifier===1?1.4:1)+stylePoints;
   const movementLabel=velocity.length()>13?'KINETIC ELIMINATION':!grounded?'AIRBORNE ELIMINATION':'HOSTILE NEUTRALIZED';
   note((style?style+' // +'+stylePoints+' STYLE · ':'')+movementLabel+' · +'+energyRefund+'% ENERGY'+(healthRefund>0?' · +'+healthRefund+' HP':'')+tierCallout);
   sound(FEEL.killPitchBase+combo*FEEL.killPitchPerFlow,.13,'triangle',.05);
   if(e.boss){save.bossesDefeated++;persist();$('#bossbar').classList.add('hidden');}
 }else{
   e.root.userData.hitFlash=FEEL.hitFlashDuration;e.root.userData.stagger=FEEL.hitStaggerDuration;
   if(critical)note('CRITICAL // CORE HIT · 2.5X DAMAGE');else sound(160,.035,'square',.02);
 }
 hud();
}
function shoot(){
 if(fireCD>0||reloadTime>0)return;
 if(mag[weapon]<=0){note('MAG EMPTY // PRESS R TO RELOAD');$('#ammo').classList.add('ammo-low');reload();return;}
 const w=weaponData[weapon];mag[weapon]--;fireCD=w.rate/fireRateBoost;
 sound(weapon==='RAIL'?110:weapon==='BREACH'?75:220,weapon==='BREACH'?.2:.09,weapon==='RAIL'?'triangle':'sawtooth',weapon==='BREACH'?.09:.045);
 const dir=new THREE.Vector3();camera.getWorldDirection(dir);const targets=enemies.filter(e=>e.alive).flatMap(e=>[e.hitProxy,e.core]);
 for(let i=0;i<(weapon==='BREACH'?7:1);i++){
   const shotDir=dir.clone().add(new THREE.Vector3((Math.random()-.5)*w.spread,(Math.random()-.5)*w.spread,0).applyQuaternion(camera.quaternion)).normalize();
   ray.set(camera.position,shotDir);ray.far=weapon==='RAIL'?150:65;
   const hits=ray.intersectObjects(targets,false);
   const hit=hits[0],end=hit?hit.point:camera.position.clone().addScaledVector(shotDir,ray.far);
   const muzzle=camera.position.clone().addScaledVector(shotDir,.8).add(new THREE.Vector3(.16,-.12,0).applyQuaternion(camera.quaternion));
   if(i===0){const shotPos=shotGeometry.attributes.position as THREE.BufferAttribute;shotPos.setXYZ(0,muzzle.x,muzzle.y,muzzle.z);shotPos.setXYZ(1,end.x,end.y,end.z);shotPos.needsUpdate=true;shotGeometry.computeBoundingSphere();shotMaterial.color.setHex(weapon==='RAIL'?0x8feaff:weapon==='BREACH'?0xff5a24:0xffd18a);playerShot.visible=true;playerShotLife=weapon==='RAIL'?.2:.16;muzzleFlash.material.color.setHex(weapon==='RAIL'?0x9ceaff:0xffb15e);muzzleFlash.material.opacity=1;muzzleFlash.scale.setScalar(weapon==='BREACH'?1.8:1);muzzleFlash.visible=true;muzzleLife=.075;}
   if(hit){
     const target=enemies.find(e=>e.alive&&(e.hitProxy===hit.object||e.core===hit.object)),critical=!!target&&target.core===hit.object;
     $('#crosshair').classList.add('hit');$('#crosshair').classList.add('hit-confirm');if(critical)$('#crosshair').classList.add('critical-hit');setTimeout(()=>$('#crosshair').classList.remove('hit','hit-confirm','critical-hit'),140);
     if(target)damage(target,w.damage*damageBoost*(critical?2.5:1),critical);
   }
 }
 if(weapon==='RAIL')velocity.addScaledVector(dir,-.45);
 hud();
}
function reload(){if(reloadTime>0||mag[weapon]===weaponData[weapon].size||reserve[weapon]<=0)return;reloadWeapon=weapon;reloadTime=weaponData[weapon].reload;$('#ammo').classList.remove('ammo-low');$('#ammo').classList.add('reloading');note('RELOADING '+weaponData[weapon].name+' // '+weaponData[weapon].reload.toFixed(1)+' SEC');}
function grappleStart(){if(grappleCD>0)return;const d=new THREE.Vector3();camera.getWorldDirection(d);ray.set(camera.position,d);ray.far=FEEL.grappleRange;let hit=ray.intersectObjects(world.children);if(!hit.length){const offsets=[new THREE.Vector3(FEEL.grappleAssistAngle,0,0),new THREE.Vector3(-FEEL.grappleAssistAngle,0,0),new THREE.Vector3(0,FEEL.grappleAssistAngle,0),new THREE.Vector3(0,-FEEL.grappleAssistAngle,0)];for(const offset of offsets){const assisted=d.clone().add(offset).normalize();ray.set(camera.position,assisted);hit=ray.intersectObjects(world.children);if(hit.length)break;}}if(hit.length){grapple=hit[0].point.clone();grappleCD=2;note('TETHER ACQUIRED');sound(680,.13,'sine',.045);}else note('NO GRAPPLE ANCHOR');}
function updateEnemies(dt:number){
 for(const e of enemies){
   if(!e.alive)continue;
   e.root.scale.setScalar(THREE.MathUtils.damp(e.root.scale.x,1,14,dt));
   if(e.root.userData.hitFlash>0){e.root.userData.hitFlash=Math.max(0,e.root.userData.hitFlash-dt);const hm=e.root.userData.hitMaterial as THREE.MeshStandardMaterial|undefined;if(hm)hm.emissiveIntensity=e.root.userData.hitFlash>0?FEEL.hitFlashEmissive:FEEL.hitFlashRestEmissive;}
   if(e.root.userData.stagger>0){e.root.userData.stagger=Math.max(0,e.root.userData.stagger-dt);e.root.lookAt(position.x,e.root.position.y+.5,position.z);continue;}
   const p=e.root.position,d=position.clone().sub(p),dist=d.length();e.cool-=dt;
   if(e.kind==='DRONE'){
     p.y=3+Math.sin(performance.now()*.001+e.root.id)*.8;
     const toward=d.clone().normalize(),strafe=new THREE.Vector3(-toward.z,0,toward.x);
     if(dist>8){p.addScaledVector(toward,e.speed*dt*.3);p.addScaledVector(strafe,Math.sin(performance.now()*.0014+e.root.id)*e.speed*dt*.85);}
     if(e.cool<0&&e.windup<=0&&dist<28){e.windup=.62;e.cool=3.8;const from=p.clone();from.y=p.y;addTracer(from,position.clone(),0xff315b,.62);note('DRONE CHARGING // BREAK LINE OF SIGHT');}
     if(e.windup>0){e.windup-=dt;if(e.windup<=0){const from=p.clone();from.y=p.y;launchEnemyProjectile(from,position.clone(),15,4);note('DRONE // ORB RELEASED');}}
   }else if(['RUNNER','INTERCEPTOR','TANK'].includes(e.kind)){
     if(dist>2.8&&e.windup<=0)p.addScaledVector(d.normalize(),e.speed*dt*(e.boss?1.35:1));
     if(dist<=2.8&&e.cool<0&&e.windup<=0){e.windup=e.kind==='TANK'?1.0:e.kind==='INTERCEPTOR'?.34:.52;e.cool=e.kind==='TANK'?3.1:2.45;addTracer(p.clone().add(new THREE.Vector3(0,1,0)),position.clone(),e.kind==='TANK'?0xff8b3d:0xff315b,e.windup);note(e.kind+' // ATTACK WINDUP — MOVE');}
     if(e.windup>0){e.windup-=dt;if(e.windup<=0){const toward=position.clone().sub(p),gap=toward.length();if(gap<3.6){addTracer(p.clone().add(new THREE.Vector3(0,1,0)),position.clone(),0xff243f,.22);hurt(e.kind==='TANK'?12:e.kind==='INTERCEPTOR'?8:6);note(e.kind+' // STRIKE');}else{p.addScaledVector(toward.normalize(),e.kind==='TANK'?2.2:4.2);note(e.kind+' // LUNGE MISSED');}}}
   }else if(e.kind==='SNIPER'){
     if(e.cool<0&&dist<35&&e.windup<=0){const from=p.clone().add(new THREE.Vector3(0,1.5,0));e.windup=.72;e.cool=4.25;addTracer(from,position.clone(),0xff315b,.72);note('SNIPER LOCK // BREAK LINE OF SIGHT');}
     if(e.windup>0){e.windup-=dt;if(e.windup<=0){const from=p.clone().add(new THREE.Vector3(0,1.5,0));launchEnemyProjectile(from,position.clone(),29,6);note('SNIPER // ROUND FIRED');}}
   }
   if(e.boss&&e.cool<0){const from=p.clone().add(new THREE.Vector3(0,1,0)),aim=position.clone();launchEnemyProjectile(from,aim,11,7);const side=new THREE.Vector3(-(aim.z-p.z),0,aim.x-p.x).normalize();launchEnemyProjectile(from,aim.clone().addScaledVector(side,3.2),10,5);launchEnemyProjectile(from,aim.clone().addScaledVector(side,-3.2),10,5);addTracer(from,aim,0xff315b,.55);note('BOSS // TRI-BURST — BREAK THE PATTERN');e.cool=4.6;}
   e.root.lookAt(position.x,p.y+.5,position.z);if(e.healthBar.visible)e.healthBar.lookAt(camera.position);
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
 const accel=grounded?(sliding?5.5:sprint?38:29):FEEL.airStrafeAcceleration;
 if(move.lengthSq()){
   const steer=sliding?.32:1;
   velocity.x+=move.x*accel*dt*steer;velocity.z+=move.z*accel*dt*steer;
 }else if(grounded){
   const drag=Math.exp(-(sliding?1.05: sprint?2.8:7.2)*dt);
   velocity.x*=drag;velocity.z*=drag;
 }
 const max=overdrive>0?28:airDashCarry>0?FEEL.airDashSpeedCap:slideJumpCarry>0?FEEL.slideJumpSpeedCap:sliding?23:sprint?21:12.5;
 const speedNow=Math.hypot(velocity.x,velocity.z);
 if(speedNow>max){const scale=max/speedNow;velocity.x*=scale;velocity.z*=scale;}
 if(grapple){
   const d=grapple.clone().sub(position),len=d.length();
   if(len<2.1){grapple=null;grappleCD=1.15;velocity.y=Math.max(velocity.y,3.2);note('TETHER RELEASE // LAUNCH');}
   else velocity.addScaledVector(d.normalize(),34*dt);
 }
 if(!grounded)velocity.y-=22*dt;
 if(jumpBuffer>0&&(grounded||coyote>0||wallrun>0||airJumps>0)){
   const airJump=!(grounded||coyote>0||wallrun>0);velocity.y=sliding?11.8:airJump?10.4:11.2;if(airJump)airJumps--;else airJumps=1;
   if(sliding){velocity.x*=FEEL.slideJumpMomentum;velocity.z*=FEEL.slideJumpMomentum;slideJumpCarry=FEEL.slideJumpCarryTime;sliding=false;slideCooldown=.3;}
   if(wallrun>0)velocity.x+=wallSide*-6;
   grounded=false;coyote=0;wallrun=0;jumpBuffer=0;
   sound(airJump?520:360,.075,'triangle',.035);if(airJump)note('AIR JUMP // SECOND IMPULSE');
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
 if(support){position.y=support.max.y+1.7;landed=!grounded;velocity.y=0;grounded=true;coyote=FEEL.coyoteTime;airJumps=1;}
 else if(y<=1.7){position.y=1.7;landed=!grounded;velocity.y=0;grounded=true;coyote=FEEL.coyoteTime;airJumps=1;}
 else{position.y=y;grounded=false;coyote=Math.max(0,coyote-dt);}
 if(landed&&wasGrounded===false){landingKick=Math.min(.16,fallSpeed*.009);sound(95,.055,'triangle',.018);}
 wasGrounded=grounded;
 if(position.y< -8)hurt(100);
 // Keep the player inside the actual arena walls, not an arbitrary 40m sub-area.
 if(mode==='expedition'&&expeditionLayout){position.x=clamp(position.x,-expeditionLayout.bounds.halfWidth+.5,expeditionLayout.bounds.halfWidth-.5);position.z=clamp(position.z,expeditionLayout.bounds.minZ+.5,expeditionLayout.bounds.maxZ-.5);}else{position.x=clamp(position.x,-25.4,25.4);position.z=clamp(position.z,-25.4,25.4);}
 if(hurtIFrames>0)hurtIFrames=Math.max(0,hurtIFrames-dt);if(grappleCD>0)grappleCD-=dt;if(airDashCooldown>0)airDashCooldown=Math.max(0,airDashCooldown-dt);if(airDashCarry>0)airDashCarry=Math.max(0,airDashCarry-dt);if(airDashStyleTime>0)airDashStyleTime=Math.max(0,airDashStyleTime-dt);if(jumpBuffer>0)jumpBuffer-=dt;if(slideJumpCarry>0)slideJumpCarry=Math.max(0,slideJumpCarry-dt);if(fireCD>0)fireCD-=dt;
 if(playerShotLife>0){playerShotLife-=dt;if(playerShotLife<=0)playerShot.visible=false;}if(muzzleLife>0){muzzleLife-=dt;muzzleFlash.material.opacity=Math.max(0,muzzleLife/.055);if(muzzleLife<=0)muzzleFlash.visible=false;}
 if(reloadTime>0){reloadTime-=dt;if(reloadTime<=0&&reloadWeapon){const w=reloadWeapon,n=Math.min(weaponData[w].size-mag[w],reserve[w]);mag[w]+=n;reserve[w]-=n;reloadWeapon=null;$('#ammo').classList.remove('reloading','ammo-low');hud();}}
 if(overdrive>0)overdrive-=dt;if(pulseCooldown>0)pulseCooldown=Math.max(0,pulseCooldown-dt);if(ability<100)ability=Math.min(100,ability+dt*((dailyRun&&dailyModifier===0?16:abilityRegen)+(currentFlowTier()-1)*FEEL.flowAbilityRegenPerTier));
 const speed=Math.hypot(velocity.x,velocity.z);walkPhase+=dt*speed*.5;distance+=speed*dt;bestSpeed=Math.max(bestSpeed,speed);
 if(speed>12&&grounded){comboTime=Math.max(comboTime,.3);score+=speed*dt*.3;}if(comboTime>0)comboTime-=dt;else combo=Math.max(1,combo-dt*.22);
 landingKick=Math.max(0,landingKick-dt*.65);
 const lateral=velocity.dot(right);const targetRoll=clamp(-lateral*.009+(sliding?FEEL.slideCameraTilt:0),-.18,.18);
 const reduced=($('#motion') as HTMLInputElement).checked;const roll=THREE.MathUtils.damp(camera.rotation.z,reduced?0:targetRoll,7,dt);
 const bob=!reduced&&grounded?Math.sin(walkPhase*2)*Math.min(.055,speed*.002):0;
 const crouch=sliding?-.28:0;
 camera.position.set(position.x,position.y+crouch+bob+landingKick,position.z);
 camera.rotation.set(pitch,yaw,roll,'YXZ');
 const targetFov=clamp(baseFov+(reduced?0:speed*FEEL.speedFovScale+(sprint&&grounded?2:0)+(grapple?3:0)),75,115);
 camera.fov=THREE.MathUtils.damp(camera.fov,targetFov,5,dt);camera.updateProjectionMatrix();
 viewModel.position.y=THREE.MathUtils.damp(viewModel.position.y,-.3+(sliding?-.1:0)+Math.sin(walkPhase*2)*Math.min(.025,speed*.0009)+landingKick*.5,10,dt);
 viewModel.position.x=THREE.MathUtils.damp(viewModel.position.x,.34+Math.sin(walkPhase)*Math.min(.025,speed*.0008),8,dt);
 if(windOscillator&&windGain&&audioContext){const intensity=clamp((speed-FEEL.windStartSpeed)/(FEEL.windFullSpeed-FEEL.windStartSpeed),0,1);windOscillator.frequency.setTargetAtTime(FEEL.windBasePitch+intensity*FEEL.windPitchRange,audioContext.currentTime,.08);windGain.gain.setTargetAtTime(intensity*FEEL.windMaxVolume,audioContext.currentTime,.1);}
 const lineStrength=clamp((speed-FEEL.speedLineStart)/(FEEL.speedLineFull-FEEL.speedLineStart),0,1),showLines=!reduced&&lineStrength>0;
 speedLines.visible=showLines;speedLineMaterial.opacity=showLines?lineStrength*FEEL.speedLineOpacity:0;
 if(showLines){const attr=speedLineGeometry.attributes.position as THREE.BufferAttribute;for(let i=0;i<speedLineCount;i++){const a=i/speedLineCount*Math.PI*2,drift=(walkPhase*FEEL.speedLineDrift+i*.137)%1,r=FEEL.speedLineInnerRadius+drift*FEEL.speedLineRadiusStep,len=FEEL.speedLineBaseLength+lineStrength*FEEL.speedLineMaxLength,dx=Math.cos(a),dy=Math.sin(a);attr.setXYZ(i*2,dx*r,dy*r,FEEL.speedLineDepth);attr.setXYZ(i*2+1,dx*(r+len),dy*(r+len),FEEL.speedLineDepth);}attr.needsUpdate=true;}
 $('#speed').textContent=Math.round(speed).toString();$('#combo').textContent='FLOW x'+combo.toFixed(1)+' · '+flowTierName();
 $('#ability').textContent=(grappleCD>0?'GRAPPLE RECHARGING':grapple?'TETHER ACTIVE':'GRAPPLE READY')+' · Q OVERDRIVE · '+(pulseCooldown>0?'F PULSE '+pulseCooldown.toFixed(1)+'s':'F PULSE READY')+' · '+(airDashCooldown>0?'C DASH '+airDashCooldown.toFixed(1)+'s':ability<FEEL.airDashAbilityCost?'C DASH NEED 20%':'C DASH READY');
}
function update(dt:number){
 if(mode!=='playing'&&mode!=='training'&&mode!=='expedition')return;
 for(let i=visualEffects.length-1;i>=0;i--){const fx=visualEffects[i];fx.life-=dt;if(fx.object.userData.effect==='pulse'){const t=1-fx.life/.48;fx.object.scale.setScalar(.5+t*10);((fx.object as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity=Math.max(0,fx.life/.48);}if(fx.object.userData.effect==='death-burst'){const t=1-fx.life/.42;fx.object.scale.setScalar(1+t*1.7);fx.object.rotation.y+=dt*2.4;fx.object.traverse(o=>{if(o instanceof THREE.Line){(o.material as THREE.LineBasicMaterial).opacity=Math.max(0,fx.life/.42);}else if(o instanceof THREE.Mesh){(o.material as THREE.MeshBasicMaterial).opacity=Math.max(0,fx.life/.42);}});}if(fx.life<=0){scene.remove(fx.object);fx.object.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});visualEffects.splice(i,1);}}
 if(playerShotLife>0){playerShotLife-=dt;if(playerShotLife<=0)playerShot.visible=false;}
 if(muzzleLife>0){muzzleLife-=dt;muzzleFlash.material.opacity=Math.max(0,muzzleLife/.055);if(muzzleLife<=0)muzzleFlash.visible=false;}
 if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('#notice').textContent='';}
 movePlayer(dt);updateLaunchPads(dt);updateEnemies(dt);updateEnemyProjectiles(dt);updatePickups(dt);updateHazard(dt);if(mode==='expedition')updateExpedition(dt);
 if(mode==='playing'&&enemies.every(e=>!e.alive)){if(!sectorClearStarted){sectorClearStarted=true;sectorClearDelay=FEEL.sectorClearSlowMotion;slowMotionRemaining=Math.max(slowMotionRemaining,FEEL.sectorClearSlowMotion);}else if(sectorClearDelay<=0){ui('upgrade');$('#upgrade-summary').textContent='SECTOR '+String(stage).padStart(2,'0')+' CLEARED // CURRENT MODS: DAMAGE '+Math.round((damageBoost-1)*100)+'% · FIRE RATE '+Math.round((fireRateBoost-1)*100)+'% · MAX HP '+maxHp+'.';}}
}
let last=0,acc=0,uiAccumulator=0;
function frame(now:number){
 requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000||0);last=now;
 if(mode==='playing'||mode==='training'||mode==='expedition'){
   if(hitstopRemaining>0)hitstopRemaining=Math.max(0,hitstopRemaining-dt);else{if(slowMotionRemaining>0)slowMotionRemaining=Math.max(0,slowMotionRemaining-dt);if(sectorClearDelay>0)sectorClearDelay=Math.max(0,sectorClearDelay-dt);const timeScale=slowMotionRemaining>0?FEEL.slowMotionScale:1;acc+=dt*timeScale;let n=0;while(acc>=1/120&&n<8){update(1/120);acc-=1/120;n++;}}
   uiAccumulator+=dt;if(uiAccumulator>=.1){uiAccumulator=0;const boss=enemies.find(e=>e.boss&&e.alive);if(boss){$('#bossbar').classList.remove('hidden');$('#bossfill').style.width=(100*boss.hp/boss.max)+'%';}else $('#bossbar').classList.add('hidden');updateObjective();hud();}
 }
 renderer.render(scene,camera);
}
requestAnimationFrame(frame);
function aim(dx:number,dy:number){const sens=Number(($('#sens') as HTMLInputElement).value)||1;yaw-=dx*.0022*sens;pitch=clamp(pitch-dy*.0022*sens,-1.48,1.48);}
canvas.addEventListener('click',()=>{if(mode==='playing'||mode==='training'||mode==='expedition'){if(document.pointerLockElement!==canvas)canvas.requestPointerLock();}});
document.addEventListener('pointerlockchange',()=>$('#hint').classList.toggle('hidden',document.pointerLockElement===canvas||!(mode==='playing'||mode==='training'||mode==='expedition')));
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas)aim(e.movementX,e.movementY);});
document.addEventListener('keydown',e=>{if(e.code==='Escape'){if(mode==='playing'||mode==='training'||mode==='expedition'){resumeMode=mode;ui('paused');}else if(mode==='paused')ui(resumeMode);return;}keys.add(e.code);if(e.repeat)return;if(e.code==='Space'){e.preventDefault();jumpBuffer=FEEL.jumpBufferTime;}if(e.code==='KeyE'){if(mode==='expedition')attemptExtraction();else grappleStart();}if(e.code==='KeyC')airDash();if(e.code==='KeyQ'&&ability>=35){ability-=35;overdrive=3.5;velocity.multiplyScalar(1.15);note('OVERDRIVE // FLOW AMPLIFIED');sound(820,.2,'sine',.05);}if(e.code==='KeyF')kineticPulse();if(e.code==='KeyR')reload();if(e.code==='Digit1')weapon='ARC';if(e.code==='Digit2')weapon='BREACH';if(e.code==='Digit3')weapon='RAIL';hud();});
document.addEventListener('keyup',e=>keys.delete(e.code));document.addEventListener('mousedown',e=>{if(e.button===0&&document.pointerLockElement===canvas)shoot();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode==='playing'||mode==='training'||mode==='expedition')){resumeMode=mode;ui('paused');}});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));});
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.action;if(a==='play')startExpedition();if(a==='next-expedition')startExpedition(false);if(a==='daily')startExpedition(true);if(a==='training')start(true);if(a==='resume')ui(resumeMode);if(a==='restart'){if(lastRunWasExpedition)startExpedition(lastRunWasDailyExpedition);else start(trainingRun,dailySession);}if(a==='retry'){if(lastRunWasExpedition)startExpedition(lastRunWasDailyExpedition);else start(trainingRun,dailySession);}if(a==='upgrade-damage')nextStage('damage');if(a==='upgrade-fire')nextStage('fire');if(a==='upgrade-health')nextStage('health');if(a==='upgrade-ability')nextStage('ability');if(a==='menu')ui('menu');if(a==='settings'){settingsReturn=mode;ui('settings');}if(a==='settings-back'){baseFov=Number(($('#fov') as HTMLInputElement).value);camera.fov=baseFov;camera.updateProjectionMatrix();localStorage.setItem('flowstate-settings-v1',JSON.stringify({sens:($('#sens') as HTMLInputElement).value,fov:baseFov,quality:($('#quality') as HTMLSelectElement).value,motion:($('#motion') as HTMLInputElement).checked}));ui(settingsReturn);}if(a==='archive'){const rows=[['EXPEDITIONS',career.expeditions],['SUCCESSFUL EXTRACTIONS',career.successfulExtractions],['FAILED EXPEDITIONS',career.failedExpeditions],['BANKED DATA',career.dataShards],['RESEARCH POINTS',career.researchPoints],['LEGACY RUNS',career.legacyRuns],['BEST SECTOR',career.totalSectors],['BEST SCORE',career.bestScore.toLocaleString()],['TOTAL ELIMINATIONS',career.totalKills.toLocaleString()],['TRAVELLED',formatCareerDistance(career.totalDistance)],['BEST FLOW','x'+career.bestFlow.toFixed(1)],['TOP SPEED',career.bestSpeed.toFixed(1)+' m/s'],['BOSSES',career.bossesDefeated]];$('#archive-grid').innerHTML=rows.map(([k,v])=>'<div class="stat"><small>'+k+'</small><b>'+v+'</b></div>').join('');$('#archive-summary').textContent='Legacy arena records were migrated safely. Expedition-specific records will appear as the new mode comes online.';ui('archive');}if(a==='research'){ $('#research-shards').textContent=career.dataShards.toString();$('#research-points').textContent=career.researchPoints.toString();$('#research-regions').textContent=career.unlockedRegions.length.toString();$('#research-modules').textContent=career.unlockedModules.length.toString();ui('research');}if(a==='stats'){const rows=[['RUNS',save.runs],['BEST STAGE',save.highestStage],['BEST SCORE',save.highestScore],['TOTAL KILLS',save.kills],['DISTANCE',save.distance+' m'],['BEST COMBO','x'+save.longestCombo.toFixed(1)],['TOP SPEED',save.highestSpeed.toFixed(1)+' m/s'],['BOSSES',save.bossesDefeated]];$('#statgrid').innerHTML=rows.map(([k,v])=>'<div class="stat"><small>'+k+'</small><b>'+v+'</b></div>').join('');ui('stats');}}));
($('#quality') as HTMLSelectElement).addEventListener('change',e=>{const q=(e.target as HTMLSelectElement).value;renderer.setPixelRatio(Math.min(devicePixelRatio,q==='high'?1.5:q==='medium'?1:.7));renderer.shadowMap.enabled=q!=='low';sun.shadow.mapSize.set(q==='high'?2048:1024,q==='high'?2048:1024);sun.shadow.needsUpdate=true;});
try{const pref=JSON.parse(localStorage.getItem('flowstate-settings-v1')||'{}');if(pref.sens)($('#sens') as HTMLInputElement).value=String(pref.sens);if(pref.fov){baseFov=Number(pref.fov);camera.fov=baseFov;camera.updateProjectionMatrix();($('#fov') as HTMLInputElement).value=String(baseFov);}if(pref.quality){($('#quality') as HTMLSelectElement).value=pref.quality;renderer.setPixelRatio(Math.min(devicePixelRatio,pref.quality==='high'?1.5:pref.quality==='medium'?1:.7));renderer.shadowMap.enabled=pref.quality!=='low';sun.shadow.mapSize.set(pref.quality==='high'?2048:1024,pref.quality==='high'?2048:1024);}if(pref.motion!==undefined)($('#motion') as HTMLInputElement).checked=!!pref.motion;}catch{}
arenaInit();
function arenaInit(){mode='menu';buildArena();ui('menu');}
