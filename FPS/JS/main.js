const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// CAMERA / PLAYER
let cameraYaw = 0;
let cameraPitch = 0;
let cameraPos = { x: 0, y: 0, z: 0 }; // cameraPos.y = pés do jogador (0 = chão)
let velocityY = 0;

const gravity = 0.02;    // aceleração para baixo (por frame)
const jumpForce = 0.45;  // impulso inicial do pulo (positivo -> sobe)
const eyeLevel = 1.7;    // altura dos olhos em relação aos pés
const playerRadius = 0.5;

// INPUT
const keys = {};
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// pointer lock + mouse
canvas.addEventListener("click", () => canvas.requestPointerLock());
document.addEventListener("mousemove", e => {
  if (document.pointerLockElement === canvas) {
    const sens = 0.002;
    cameraYaw += e.movementX * sens;
    cameraPitch -= e.movementY * sens; // invertido para comportamento normal
    cameraPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraPitch));
  }
});

// WORLD: cubos
const cubeVertices = [
  { x:-1,y:-1,z:-1 },{ x:1,y:-1,z:-1 },{ x:1,y:1,z:-1 },{ x:-1,y:1,z:-1 },
  { x:-1,y:-1,z:1 },{ x:1,y:-1,z:1 },{ x:1,y:1,z:1 },{ x:-1,y:1,z:1 }
];
const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];

let cubes = [];
for (let i=-5;i<=5;i+=3) for (let j=5;j<=20;j+=5) cubes.push({ x:i, y:0, z:j });

// 3D helpers
function rotate3D(p, yaw, pitch){
  const cosy = Math.cos(yaw), siny = Math.sin(yaw);
  const cosp = Math.cos(pitch), sinp = Math.sin(pitch);
  let x = p.x * cosy - p.z * siny;
  let z = p.x * siny + p.z * cosy;
  let y = p.y * cosp - z * sinp;
  z = p.y * sinp + z * cosp;
  return { x, y, z };
}

function project(p){
  const fov = 400;
  // CORREÇÃO IMPORTANTE: subtraímos a componente Y para que "mundo Y positivo" suba na tela
  return {
    x: (p.x / p.z) * fov + canvas.width / 2,
    y: canvas.height / 2 - (p.y / p.z) * fov
  };
}

// MOVIMENTO / FÍSICA
function collides(nx, nz){
  for (const c of cubes){
    const dx = nx - c.x;
    const dz = nz - c.z;
    if (Math.sqrt(dx*dx + dz*dz) < playerRadius + 1) return true;
  }
  return false;
}

let onGround = true;
function updateMovement(){
  const speed = 0.05;
  let nx = cameraPos.x, nz = cameraPos.z;
  if (keys["w"]) { nx += Math.sin(cameraYaw)*speed; nz += Math.cos(cameraYaw)*speed; }
  if (keys["s"]) { nx -= Math.sin(cameraYaw)*speed; nz -= Math.cos(cameraYaw)*speed; }
  if (keys["a"]) { nx -= Math.cos(cameraYaw)*speed; nz += Math.sin(cameraYaw)*speed; }
  if (keys["d"]) { nx += Math.cos(cameraYaw)*speed; nz -= Math.sin(cameraYaw)*speed; }

  if (!collides(nx,nz)) { cameraPos.x = nx; cameraPos.z = nz; }

  // GRAVITY & JUMP (corrigido: jump += y, gravity reduce y)
  velocityY -= gravity; // gravity pulls velocity downward
  if (keys[" "] && onGround) {
    velocityY = jumpForce; // positive -> moves cameraPos.y up
    onGround = false;
  }

  cameraPos.y += velocityY;

  // floor collision
  if (cameraPos.y <= 0) {
    cameraPos.y = 0;
    velocityY = 0;
    onGround = true;
  }
}

// DRAW GROUND and CUBES using cameraHeight (feet + eyeLevel)
function drawGround(){
  const size = 50, step = 2;
  ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
  const cameraHeight = cameraPos.y + eyeLevel;

  for (let x=-size; x<=size; x+=step){
    const p1 = rotate3D({ x: x - cameraPos.x, y: 0 - cameraHeight, z: -size - cameraPos.z }, cameraYaw, cameraPitch);
    const p2 = rotate3D({ x: x - cameraPos.x, y: 0 - cameraHeight, z: size - cameraPos.z }, cameraYaw, cameraPitch);
    if (p1.z>0.1 && p2.z>0.1){
      const pr1 = project(p1), pr2 = project(p2);
      ctx.beginPath(); ctx.moveTo(pr1.x, pr1.y); ctx.lineTo(pr2.x, pr2.y); ctx.stroke();
    }
  }

  for (let z=-size; z<=size; z+=step){
    const p1 = rotate3D({ x: -size - cameraPos.x, y: 0 - cameraHeight, z: z - cameraPos.z }, cameraYaw, cameraPitch);
    const p2 = rotate3D({ x: size - cameraPos.x,  y: 0 - cameraHeight, z: z - cameraPos.z }, cameraYaw, cameraPitch);
    if (p1.z>0.1 && p2.z>0.1){
      const pr1 = project(p1), pr2 = project(p2);
      ctx.beginPath(); ctx.moveTo(pr1.x, pr1.y); ctx.lineTo(pr2.x, pr2.y); ctx.stroke();
    }
  }
}

function drawCube(cx, cy, cz){
  const cameraHeight = cameraPos.y + eyeLevel;
  const rotated = cubeVertices.map(v=>{
    // world point relative to camera eye
    return rotate3D({
      x: v.x + cx - cameraPos.x,
      y: v.y + cy - cameraHeight,
      z: v.z + cz - cameraPos.z
    }, cameraYaw, cameraPitch);
  });

  // require all vertices in front
  if (!rotated.every(r => r.z > 0.1)) return;

  const projected = rotated.map(r => project(r));
  ctx.strokeStyle = "white";
  ctx.beginPath();
  for (const [a,b] of edges){
    ctx.moveTo(projected[a].x, projected[a].y);
    ctx.lineTo(projected[b].x, projected[b].y);
  }
  ctx.stroke();
}

// SHOOT (raycast origin at eye)
document.addEventListener("mousedown", shoot);
function shoot(){
  const range = 30, step = 0.2;
  const dirX = Math.sin(cameraYaw) * Math.cos(cameraPitch);
  const dirY = Math.sin(cameraPitch);
  const dirZ = Math.cos(cameraYaw) * Math.cos(cameraPitch);

  lastShotTime = performance.now();
  shotDir = { x: dirX, y: dirY, z: dirZ };

  const eyeY = cameraPos.y + eyeLevel;
  for (let t=0; t<range; t+=step){
    const rx = cameraPos.x + dirX * t;
    const ry = eyeY         + dirY * t;
    const rz = cameraPos.z + dirZ * t;

    for (let i=0;i<cubes.length;i++){
      const c = cubes[i];
      const dx = rx - c.x;
      const dy = ry - c.y;
      const dz = rz - c.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist < 1.2) { cubes.splice(i,1); return; }
    }
  }
}

// EFFECT & HUD (unchanged)
function drawShotEffect(){
  const dt = performance.now() - lastShotTime;
  if (dt>120) return;
  const cx = canvas.width/2, cy = canvas.height/2;
  const gunX = cx, gunY = canvas.height - 60;
  const a = 1 - dt/120;
  ctx.strokeStyle = `rgba(255,220,100,${a})`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(gunX,gunY); ctx.lineTo(cx,cy); ctx.stroke();
  ctx.fillStyle = `rgba(255,240,150,${a})`; ctx.beginPath(); ctx.arc(gunX,gunY-10,12*a,0,Math.PI*2); ctx.fill();
}

function drawGun(){
  const cx = canvas.width/2;
  ctx.strokeStyle = "red"; ctx.beginPath();
  ctx.moveTo(cx-10,canvas.height/2); ctx.lineTo(cx+10,canvas.height/2);
  ctx.moveTo(cx,canvas.height/2-10); ctx.lineTo(cx,canvas.height/2+10);
  ctx.stroke();
  ctx.fillStyle="#555"; ctx.fillRect(cx-36,canvas.height-80,72,60);
}

// MAIN LOOP
function draw(){
  ctx.fillStyle = "#111"; ctx.fillRect(0,0,canvas.width,canvas.height);
  updateMovement();
  drawGround();
  for (const c of cubes) drawCube(c.x,c.y,c.z);
  drawGun();
  drawShotEffect();
  requestAnimationFrame(draw);
}
draw();
