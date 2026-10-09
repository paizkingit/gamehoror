import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const $=id=>document.getElementById(id);
const canvas=$("game");
let renderer,scene,camera,clock;
let player, flashlight, monster;
let running=false, paused=false, crouching=false;
let health=100, stamina=100, battery=100, fear=0;
let yaw=0,pitch=0, vel=new THREE.Vector3(), moveInput=new THREE.Vector2();
let interactTarget=null, interactCooldown=0;
let keys={};
let items={battery:0, oldNote:0, rustyKey:0, basementKey:0, doll:0};
let puzzle={lights:[false,false,false], codeSolved:false};
let settings={sens:1,volume:.65,quality:"medium",vibration:true};
const interactables=[];
const colliders=[];
const raycaster=new THREE.Raycaster();
const tmp=new THREE.Vector3();

init();
animate();

function init(){
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x030305);
  scene.fog=new THREE.FogExp2(0x08090b,.035);
  camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.05,80);
  camera.rotation.order="YXZ";
  clock=new THREE.Clock();

  const ambient=new THREE.HemisphereLight(0x29303a,0x050507,.28); scene.add(ambient);
  buildHouse();
  buildPlayer();
  buildMonster();
  bindUI();
  loadSettings();
  setLoad(100,"Ready");
  setTimeout(()=>{$("loading").style.display="none";$("menu").classList.remove("hidden")},500);
  addEventListener("resize",onResize);
}

function setLoad(v,t){$("load-progress").style.width=v+"%";$("load-text").textContent=t}

function mat(c,r=.7,m=0){return new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m})}
function box(name,x,y,z,sx,sy,sz,color=0x202024){
  const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat(color));
  m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);colliders.push(m);return m;
}
function buildHouse(){
  // Floor and ceiling
  box("floor",0,-.1,0,18,.2,18,0x17171a);
  box("ceiling",0,5.2,0,18,.2,18,0x0b0b0d);
  // outer walls
  box("wall",-9,2.5,0,.3,5,18,0x1b1b20);box("wall",9,2.5,0,.3,5,18,0x1b1b20);
  box("wall",0,2.5,-9,18,5,.3,0x1b1b20);box("wall",0,2.5,9,18,5,.3,0x1b1b20);
  // partitions
  box("wall",-3,2.5,-5.5,6,.3,7,0x19191d); // living/dining
  box("wall",3,2.5,2.5,6,.3,7,0x19191d);
  box("wall",-5.5,2.5,3,7,.3,6,0x19191d);
  // furniture
  box("table",0,.8,-1,2,1.6,1,0x30271e);
  for(let i=0;i<4;i++) box("chair",i%2?1.5:-1.5,.45,-1+(i>1?1.5:-1.5),.55,.9,.55,0x29221c);
  box("cabinet",6,1.5,-5.5,1.3,3,.7,0x2b211b);
  box("bed",-6,0.6,6,3,1.2,5,0x26232a);
  box("tv",5,1.6,-7.8,2.8,1.7,.35,0x070708);
  // stairs
  for(let i=0;i<7;i++) box("step",6.5+i*.38,.18+i*.28,4.8,3,.35,1.2,0x29262a);
  // doors
  makeDoor("frontDoor",0,2.1,-8.8,0x302018);
  makeDoor("basementDoor",-7.8,2.1,3,0x252225);
  makeDoor("secretDoor",7.8,2.1,-1,0x201b21);
  // lights
  makeLight(-5,3,-2,0x777777,2.2);
  makeLight(4,3,-6,0x777777,2.0);
  makeLight(-6,3,6,0x777777,1.7);
  makeLight(6,3,5,0x555555,1.5);
  // puzzle lamps
  [[-4,3,-7],[0,3,-7],[4,3,-7]].forEach((p,i)=>makePuzzleLight(i,p));
  // items
  makeItem("Battery",2,.7,-4,"battery",0x9a9a44);
  makeItem("Old Note",-6,.9,-3,"oldNote",0x9b927d);
  makeItem("Rusty Key",5,.9,6,"rustyKey",0x777777);
  makeItem("Strange Doll",-5,.8,7,"doll",0x555555);
  makeItem("Basement Key",0,.8,7,"basementKey",0x777777);
  // secret room trigger
  const sign=makeItem("Mysterious Photo",7.5,2,-3,"photo",0x555566);
  sign.userData.action=()=>toast("The eyes in the photo are moving...");
  setLoad(65,"Building house");
}
function makeDoor(name,x,y,z,color){
  const d=box(name,x,y,z,1.2,4,.25,color);
  d.userData={type:"door",open:false,baseX:x,baseZ:z,locked:name==="frontDoor"||name==="basementDoor"};
  interactables.push(d); return d;
}
function makeLight(x,y,z,c,intensity){
  const p=new THREE.PointLight(c,intensity,7,2);p.position.set(x,y,z);p.castShadow=true;p.shadow.mapSize.set(512,512);scene.add(p);
  p.userData.base=intensity;p.userData.flicker=Math.random()*10;
  setInterval(()=>{if(Math.random()<.15)p.intensity=Math.random()*.5; else p.intensity=p.userData.base},600+Math.random()*900);
}
function makePuzzleLight(i,p){
  const l=new THREE.PointLight(0x555555,.8,5);l.position.set(...p);scene.add(l);
  const s=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),mat(0x555555,.5));s.position.set(...p);scene.add(s);
  s.userData={type:"puzzleLight",index:i,on:false,light:l};interactables.push(s);
}
function makeItem(name,x,y,z,type,color){
  const g=new THREE.Mesh(new THREE.BoxGeometry(.42,.42,.42),mat(color,.55));
  g.position.set(x,y,z);g.castShadow=true;g.userData={type:"item",item:type,label:name,baseY:y};
  scene.add(g);interactables.push(g);
  return g;
}
function buildPlayer(){
  player=new THREE.Object3D();player.position.set(0,1.65,5.8);scene.add(player);player.add(camera);
  flashlight=new THREE.SpotLight(0xffffff,2.8,22,Math.PI/7,.6,1.4);
  flashlight.position.set(0,.05,0);flashlight.target.position.set(0,.05,-1);camera.add(flashlight);camera.add(flashlight.target);
}
function buildMonster(){
  monster=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.45,1.7,6,12),mat(0x09090b,.95));body.position.y=1.1;body.scale.set(.8,1.25,.65);body.castShadow=true;monster.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.42,16,12),mat(0x111114));head.position.y=2.25;monster.add(head);
  const eyeMat=mat(0xbcbcbc,.3);
  [-.14,.14].forEach(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.045,8,8),eyeMat);e.position.set(x,2.27,-.38);monster.add(e)});
  monster.position.set(-7,0,-6);monster.visible=false;scene.add(monster);
  monster.userData={state:"PATROL",target:new THREE.Vector3(),timer:0};
}
function bindUI(){
  $("playBtn").onclick=()=>startGame(false);
  $("continueBtn").onclick=()=>startGame(true);
  $("settingsBtn").onclick=()=>showPanel("settings");
  $("howBtn").onclick=()=>showPanel("how");
  $("creditsBtn").onclick=()=>toast("Created as a Three.js Android-ready horror prototype.");
  document.querySelectorAll(".closePanel").forEach(b=>b.onclick=()=>b.parentElement.classList.add("hidden"));
  $("pauseBtn").onclick=()=>togglePause(true);
  $("resumeBtn").onclick=()=>togglePause(false);
  $("saveBtn").onclick=saveGame;
  $("menuBtn").onclick=()=>{togglePause(false);$("hud").classList.add("hidden");$("menu").classList.remove("hidden");running=false};
  $("endingMenu").onclick=()=>{$("ending").classList.add("hidden");$("menu").classList.remove("hidden");running=false};
  $("flashBtn").onclick=()=>toggleFlash();
  $("inventoryBtn").onclick=()=>{renderInventory();showPanel("inventory")};
  $("sprintBtn").ontouchstart=e=>{e.preventDefault();keys.sprint=true};$("sprintBtn").ontouchend=e=>{e.preventDefault();keys.sprint=false};
  $("sprintBtn").onmousedown=()=>keys.sprint=true;$("sprintBtn").onmouseup=()=>keys.sprint=false;
  $("crouchBtn").onclick=()=>crouching=!crouching;
  $("sens").oninput=e=>settings.sens=+e.target.value;
  $("volume").oninput=e=>settings.volume=+e.target.value;
  $("quality").onchange=e=>{settings.quality=e.target.value;applyQuality()};
  $("vibration").onchange=e=>settings.vibration=e.target.checked;
  addKeyboard();
  addTouch();
}
function addKeyboard(){
  addEventListener("keydown",e=>{keys[e.code]=true;if(e.code==="KeyF")toggleFlash();if(e.code==="KeyE")interact();if(e.code==="KeyI"){renderInventory();showPanel("inventory")}if(e.code==="Escape")togglePause(!paused)});
  addEventListener("keyup",e=>keys[e.code]=false);
}
function addTouch(){
  let joyId=null,joyCenter={x:0,y:0};
  const joy=$("joystick"),stick=$("stick");
  joy.addEventListener("touchstart",e=>{const t=e.changedTouches[0];joyId=t.identifier;const r=joy.getBoundingClientRect();joyCenter={x:r.left+r.width/2,y:r.top+r.height/2};moveJoy(t,stick,joyCenter)}, {passive:false});
  joy.addEventListener("touchmove",e=>{for(const t of e.changedTouches)if(t.identifier===joyId)moveJoy(t,stick,joyCenter)}, {passive:false});
  ["touchend","touchcancel"].forEach(ev=>joy.addEventListener(ev,e=>{for(const t of e.changedTouches)if(t.identifier===joyId){joyId=null;moveInput.set(0,0);stick.style.transform="translate(0,0)"}}));
  let lookId=null,last={x:0,y:0};
  $("lookZone").addEventListener("touchstart",e=>{const t=e.changedTouches[0];lookId=t.identifier;last={x:t.clientX,y:t.clientY}},{passive:false});
  $("lookZone").addEventListener("touchmove",e=>{for(const t of e.changedTouches)if(t.identifier===lookId){const dx=t.clientX-last.x,dy=t.clientY-last.y;look(dx,dy);last={x:t.clientX,y:t.clientY}}},{passive:false});
  ["touchend","touchcancel"].forEach(ev=>$("lookZone").addEventListener(ev,e=>{for(const t of e.changedTouches)if(t.identifier===lookId)lookId=null}));
}
function moveJoy(t,stick,c){
  const dx=t.clientX-c.x,dy=t.clientY-c.y,max=50,len=Math.hypot(dx,dy)||1,k=Math.min(1,max/len);
  const x=dx*k,y=dy*k;stick.style.transform=`translate(${x}px,${y}px)`;moveInput.set(x/max,-y/max);
}
function look(dx,dy){if(!running||paused)return;const s=.003*settings.sens;yaw-=dx*s;pitch-=dy*s;pitch=Math.max(-1.35,Math.min(1.35,pitch))}
function startGame(load){
  $("menu").classList.add("hidden");$("hud").classList.remove("hidden");running=true;paused=false;
  if(load)loadGame(); else resetGame();
}
function resetGame(){health=100;stamina=100;battery=100;fear=0;items={battery:0,oldNote:0,rustyKey:0,basementKey:0,doll:0};puzzle={lights:[false,false,false],codeSolved:false};player.position.set(0,1.65,5.8);monster.visible=false;monster.userData.state="PATROL";$("objective").textContent="OBJECTIVE: Find the first key."}
function updatePlayer(dt){
  let x=moveInput.x+(keys.KeyD?1:0)-(keys.KeyA?1:0),z=moveInput.y+(keys.KeyW?1:0)-(keys.KeyS?1:0);
  const len=Math.hypot(x,z);if(len>1){x/=len;z/=len}
  const sprint=keys.sprint && stamina>2 && (Math.abs(x)+Math.abs(z))>.1;
  if(sprint)stamina=Math.max(0,stamina-dt*22);else stamina=Math.min(100,stamina+dt*15);
  const speed=(sprint?4.3:2.2)*(crouching?.55:1);
  const target=new THREE.Vector3(x*speed,0,z*speed);
  target.applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
  vel.lerp(target,1-Math.exp(-dt*10));
  const old=player.position.clone();
  player.position.addScaledVector(vel,dt);
  player.position.x=THREE.MathUtils.clamp(player.position.x,-8.2,8.2);player.position.z=THREE.MathUtils.clamp(player.position.z,-8.2,8.2);
  // Simple obstacle collision against interior walls/large props
  for(const c of colliders){
    if(c.userData.type==="door")continue;
    const b=new THREE.Box3().setFromObject(c).expandByScalar(.25);
    const p=player.position;
    if(b.containsPoint(new THREE.Vector3(p.x,p.y-1.2,p.z))){player.position.copy(old);break}
  }
  const targetY=crouching?1.15:1.65;
  player.position.y=THREE.MathUtils.lerp(player.position.y,targetY,1-Math.exp(-dt*12));
  camera.rotation.y=THREE.MathUtils.lerp(camera.rotation.y,yaw,1-Math.exp(-dt*14));
  camera.rotation.x=THREE.MathUtils.lerp(camera.rotation.x,pitch,1-Math.exp(-dt*14));
  const moving=vel.lengthSq()>.5;
  const bob=moving?Math.sin(performance.now()*.012*(sprint?1.5:1))*.025:0;
  camera.position.y=THREE.MathUtils.lerp(camera.position.y,bob,dt*8);
  const fovTarget=sprint?80:72;camera.fov=THREE.MathUtils.lerp(camera.fov,fovTarget,dt*7);camera.updateProjectionMatrix();
  if(moving&&sprint)monster.userData.heard=player.position.clone();
}
function updateFlash(dt){
  if(battery<=0)flashlight.intensity=0;
  if(flashlight.intensity>0){battery=Math.max(0,battery-dt*.8);if(battery<20)flashlight.intensity=2.3+Math.random()*.8}
  flashlight.target.position.lerp(new THREE.Vector3(0,0,-3),.25);
}
function updateMonster(dt){
  if(!monster.visible){
    if(fear>48 && Math.random()<dt*.035){monster.visible=true;monster.position.set(player.position.x+THREE.MathUtils.randFloat(-7,7),0,player.position.z+THREE.MathUtils.randFloat(-7,7));monster.position.x=THREE.MathUtils.clamp(monster.position.x,-7.5,7.5);monster.position.z=THREE.MathUtils.clamp(monster.position.z,-7.5,7.5);monster.userData.state="INVESTIGATE";toast("Something is watching you...")}
    return;
  }
  const dist=monster.position.distanceTo(player.position);
  const state=monster.userData.state;
  if(dist<3.5)monster.userData.state="CHASE";
  else if(dist>14)monster.userData.state="RETREAT";
  if(monster.userData.state==="RETREAT"){monster.visible=false;fear=Math.max(0,fear-20);return}
  const target=monster.userData.state==="CHASE"?player.position:monster.userData.heard||player.position;
  const dir=new THREE.Vector3().subVectors(target,monster.position);dir.y=0;
  if(dir.length()>1)dir.normalize();
  const speed=monster.userData.state==="CHASE"?2.7:1.2;
  monster.position.addScaledVector(dir,dt*speed);
  monster.lookAt(monster.position.x+dir.x,monster.position.y+1,monster.position.z+dir.z);
  monster.position.y=0;
  if(dist<1.35){health-=dt*24;fear=100;shake=.22;if(health<=0)endGame(false)}
  else if(dist<6)fear=Math.min(100,fear+dt*13);
}
let shake=0;
function updateFear(dt){
  const dark=flashlight.intensity<.5;
  const near=monster.visible?Math.max(0,8-monster.position.distanceTo(player.position)):0;
  fear=THREE.MathUtils.clamp(fear+(dark?dt*2.2:-dt*.7)+near*dt*1.5,0,100);
  $("fearVignette").style.boxShadow=`inset 0 0 ${60+fear*1.1}px rgba(0,0,0,${.25+fear/180})`;
  if(fear>75 && Math.random()<dt*.12)triggerEvent();
}
function triggerEvent(){
  const options=["A door moved somewhere...","You heard footsteps upstairs.","The lights are flickering.","Something touched the wall."];
  toast(options[Math.floor(Math.random()*options.length)]);
  if(settings.vibration&&navigator.vibrate)navigator.vibrate(40);
}
function findInteract(){
  interactTarget=null;let best=2.2;
  for(const o of interactables){
    if(!o.visible)continue;
    const d=o.getWorldPosition(tmp).distanceTo(player.position);
    if(d<best){best=d;interactTarget=o}
  }
  $("interactHint").style.display=interactTarget?"block":"none";
}
function interact(){
  if(!interactTarget)return;
  const o=interactTarget,u=o.userData;
  if(u.type==="item"){
    if(u.item==="photo"){u.action?.();return}
    items[u.item]=(items[u.item]||0)+1;o.visible=false;toast("Picked up: "+u.label);
    if(u.item==="battery"){battery=Math.min(100,battery+45);toast("Battery +45")}
    if(u.item==="oldNote")$("objective").textContent="OBJECTIVE: Find the three lamps and activate them.";
    if(u.item==="rustyKey")$("objective").textContent="OBJECTIVE: Find the basement.";
    if(u.item==="basementKey")$("objective").textContent="OBJECTIVE: Escape through the front door.";
    if(settings.vibration&&navigator.vibrate)navigator.vibrate(30);
  } else if(u.type==="puzzleLight"){
    const i=u.index;
    // Correct order: 2, 0, 1
    const expected=[2,0,1][puzzle.lights.filter(Boolean).length];
    if(i!==expected){puzzle.lights=[false,false,false];interactables.filter(x=>x.userData.type==="puzzleLight").forEach(x=>{x.userData.on=false;x.material.color.set(0x555555);x.userData.light.color.set(0x555555)});toast("Wrong sequence.");return}
    puzzle.lights[i]=true;u.on=true;o.material.color.set(0xaaaaaa);u.light.color.set(0xffffff);u.light.intensity=2;
    if(puzzle.lights.every(Boolean)){puzzle.codeSolved=true;$("objective").textContent="OBJECTIVE: Find the hidden key.";toast("A hidden mechanism clicked.");items.basementKey=1}
  } else if(u.type==="door"){
    if(u.name==="frontDoor"){
      if(items.rustyKey||puzzle.codeSolved)endGame(true);else toast("Locked. You need a key.");
    } else if(u.name==="basementDoor"){
      if(items.basementKey||puzzle.codeSolved){u.locked=false;u.open=true;u.baseX+=2;toast("Basement unlocked.");$("objective").textContent="OBJECTIVE: Search the basement."}else toast("The basement is locked.");
    } else {u.open=!u.open}
  }
}
function updateDoors(dt){
  for(const o of interactables)if(o.userData.type==="door"&&o.userData.open){o.rotation.y=THREE.MathUtils.lerp(o.rotation.y,-Math.PI/2,dt*3)}
}
function toggleFlash(){flashlight.intensity=flashlight.intensity>0?0:2.8}
function showPanel(id){$(id).classList.remove("hidden");paused=true}
function togglePause(v){paused=v;$("pause").classList.toggle("hidden",!v)}
function renderInventory(){$("items").innerHTML=Object.entries(items).map(([k,v])=>`<div style="padding:8px;border-bottom:1px solid #222">${k}: ${v}</div>`).join("")}
function toast(t){const el=$("toast");el.textContent=t;el.style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>el.style.opacity=0,2200)}
function endGame(win){
  running=false;$("hud").classList.add("hidden");$("ending").classList.remove("hidden");
  $("endingTitle").textContent=win?"GOOD ENDING":"BAD ENDING";
  $("endingText").textContent=win?"Kamu berhasil keluar dari Shadow House. Tapi sebelum pintu tertutup, kamu mendengar langkah kaki dari dalam...":"THE SHADOW menemukanmu. Rumah kembali sunyi.";
}
function saveGame(){localStorage.setItem("shadowHouseSave",JSON.stringify({health,stamina,battery,fear,items,puzzle,pos:player.position.toArray(),settings}));toast("Game saved.")}
function loadGame(){try{const s=JSON.parse(localStorage.getItem("shadowHouseSave"));if(!s)return resetGame();({health,stamina,battery,fear,items,puzzle,settings}=s);player.position.fromArray(s.pos||[0,1.65,5.8]);applyQuality()}catch{resetGame()}}
function loadSettings(){try{settings={...settings,...JSON.parse(localStorage.getItem("shadowSettings")||"{}")}}catch{}applyQuality();$("sens").value=settings.sens;$("volume").value=settings.volume;$("quality").value=settings.quality;$("vibration").checked=settings.vibration}
function applyQuality(){const q=settings.quality;renderer.setPixelRatio(q==="low"?.85:q==="medium"?1:Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=q!=="low";renderer.setSize(innerWidth,innerHeight)}
function onResize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
function animate(){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);
  if(running&&!paused){
    updatePlayer(dt);updateFlash(dt);updateMonster(dt);updateFear(dt);updateDoors(dt);findInteract();
    interactCooldown-=dt;if(interactCooldown<=0&&interactTarget&&keys.KeyE){interact();interactCooldown=.4}
    if(shake>0){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake;shake=Math.max(0,shake-dt)}
    $("healthBar").style.width=Math.max(0,health)+"%";$("staminaBar").style.width=stamina+"%";$("batteryBar").style.width=battery+"%";
  }
  renderer.render(scene,camera);
}
