const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Variáveis da câmera
let cameraYaw = 0;
let cameraPitch = 0;
let cameraPos = { x: 0, y: 0, z: 0 };

// Configuração do jogador
const playerRadius = 0.5;

// Travar cursor
canvas.addEventListener("click", () => {
  canvas.requestPointerLock();
});

// Controle do mouse
document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === canvas) {
    const sensibilidade = 0.002;
    cameraYaw += event.movementX * sensibilidade;
    cameraPitch += event.movementY * sensibilidade;
    cameraPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraPitch));
  }
});

// Captura das teclas
const keys = {};
document.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

// Pontos do cubo 3D
const cubeVertices = [
  { x: -1, y: -1, z: -1 },
  { x:  1, y: -1, z: -1 },
  { x:  1, y:  1, z: -1 },
  { x: -1, y:  1, z: -1 },
  { x: -1, y: -1, z:  1 },
  { x:  1, y: -1, z:  1 },
  { x:  1, y:  1, z:  1 },
  { x: -1, y:  1, z:  1 },
];

// Ligações entre vértices (arestas)
const edges = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

// Lista de cubos no mundo
const cubes = [];
for (let i = -5; i <= 5; i += 3) {
  for (let j = 5; j <= 20; j += 5) {
    cubes.push({ x: i, y: 0, z: j });
  }
}

// Função de rotação 3D
function rotate3D(point, yaw, pitch) {
  // Rotação Y (esquerda/direita)
  let x = point.x * Math.cos(yaw) - point.z * Math.sin(yaw);
  let z = point.x * Math.sin(yaw) + point.z * Math.cos(yaw);

  // Rotação X (cima/baixo)
  let y = point.y * Math.cos(pitch) - z * Math.sin(pitch);
  z = point.y * Math.sin(pitch) + z * Math.cos(pitch);

  return { x, y, z };
}

// Projeção de 3D para 2D
function project(point) {
  const fov = 400;
  return {
    x: (point.x / point.z) * fov + canvas.width / 2,
    y: (point.y / point.z) * fov + canvas.height / 2
  };
}

// Detecção de colisão simples (cubo vs jogador)
function collides(nx, nz) {
  for (const cube of cubes) {
    const dx = nx - cube.x;
    const dz = nz - cube.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 1.5 + playerRadius) {
      return true; // colisão
    }
  }
  return false;
}

// Movimento do jogador
function updateMovement() {
  const velocidade = 0.05;
  let nx = cameraPos.x;
  let nz = cameraPos.z;

  if (keys["w"]) {
    nx += Math.sin(cameraYaw) * velocidade;
    nz += Math.cos(cameraYaw) * velocidade;
  }
  if (keys["s"]) {
    nx -= Math.sin(cameraYaw) * velocidade;
    nz -= Math.cos(cameraYaw) * velocidade;
  }
  if (keys["a"]) {
    nx -= Math.cos(cameraYaw) * velocidade;
    nz += Math.sin(cameraYaw) * velocidade;
  }
  if (keys["d"]) {
    nx += Math.cos(cameraYaw) * velocidade;
    nz -= Math.sin(cameraYaw) * velocidade;
  }

  // Só move se não colidir
  if (!collides(nx, nz)) {
    cameraPos.x = nx;
    cameraPos.z = nz;
  }
}

// Desenhar um cubo
function drawCube(x, y, z) {
  const rotated = cubeVertices.map(v => {
    let p = { 
      x: v.x + x - cameraPos.x, 
      y: v.y + y - cameraPos.y, 
      z: v.z + z - cameraPos.z 
    };
    return rotate3D(p, cameraYaw, cameraPitch);
  });

  const projected = rotated.map(v => project({
    x: v.x,
    y: v.y,
    z: v.z + 5
  }));

  ctx.strokeStyle = "white";
  ctx.beginPath();
  for (let [a, b] of edges) {
    const p1 = projected[a];
    const p2 = projected[b];
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
  }
  ctx.stroke();
}

// Loop principal
function draw() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updateMovement();

  for (const cube of cubes) {
    drawCube(cube.x, cube.y, cube.z);
  }

  requestAnimationFrame(draw);
}

draw();
