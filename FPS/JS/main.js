const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// === CAMERA / PLAYER ===
let cameraYaw = 0;
let cameraPitch = 0;
let cameraPos = { x: 0, y: 0, z: 0 }; // posição do jogador (pés)
let velocityY = 0;

const gravity = 0.009;
const jumpForce = 1;
const eyeLevel = 3;
const playerRadius = 0.5;
let onGround = true;

// === INPUT ===
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
    canvas.focus();
});

document.addEventListener("mousemove", e => {
    if (document.pointerLockElement === canvas) {
        const sens = 0.002;
        cameraYaw += e.movementX * sens;
        cameraPitch -= e.movementY * sens;
        cameraPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraPitch));
    }
});

// === MUNDO (cubos) ===
const cubeVertices = [
    { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 },
    { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 },
    { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 }
];
const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
];

let cubes = [];
for (let i = -5; i <= 5; i += 3) {
    for (let j = 5; j <= 20; j += 5) {
        cubes.push({ x: i, y: 0, z: j });
    }
}

// === FUNÇÕES 3D ===
function rotate3D(p, yaw, pitch) {
    const cosy = Math.cos(yaw), siny = Math.sin(yaw);
    const cosp = Math.cos(pitch), sinp = Math.sin(pitch);

    let x = p.x * cosy - p.z * siny;
    let z = p.x * siny + p.z * cosy;

    let y = p.y * cosp - z * sinp;
    z = p.y * sinp + z * cosp;

    return { x, y, z };
}

function project(p) {
    const fov = 400;
    return {
        x: (p.x / p.z) * fov + canvas.width / 2,
        y: canvas.height / 2 - (p.y / p.z) * fov
    };
}

// === MOVIMENTO / FÍSICA ===
function collides(nx, nz) {
    for (const c of cubes) {
        const dx = nx - c.x;
        const dz = nz - c.z;
        if (Math.sqrt(dx * dx + dz * dz) < playerRadius + 1) return true;
    }
    return false;
}

function updateMovement() {
    const speed = 0.1;
    let nx = cameraPos.x, nz = cameraPos.z;

    if (keys["w"]) { nx += Math.sin(cameraYaw) * speed; nz += Math.cos(cameraYaw) * speed; }
    if (keys["s"]) { nx -= Math.sin(cameraYaw) * speed; nz -= Math.cos(cameraYaw) * speed; }
    if (keys["a"]) { nx -= Math.cos(cameraYaw) * speed; nz += Math.sin(cameraYaw) * speed; }
    if (keys["d"]) { nx += Math.cos(cameraYaw) * speed; nz -= Math.sin(cameraYaw) * speed; }

    if (!collides(nx, nz)) {
        cameraPos.x = nx;
        cameraPos.z = nz;
    }

    // gravidade e pulo
    velocityY -= gravity;
    if (keys[" "] && onGround) {
        velocityY = jumpForce;
        onGround = false;
    }

    cameraPos.y += velocityY;

    // chão
    if (cameraPos.y <= 0) {
        cameraPos.y = 0;
        velocityY = 0;
        onGround = true;
    }
}

function drawGround() {
    const horizon = canvas.height / 2 + cameraPitch * 400;
    const groundHeight = canvas.height - horizon;

    const gradient = ctx.createLinearGradient(0, horizon, 0, canvas.height);
    gradient.addColorStop(0, "#2e8b57");
    gradient.addColorStop(1, "#145214");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, horizon, canvas.width, groundHeight);
}

// === RECOIL ===
let recoil = 0;
let gunScale = 1;         // escala atual da arma
let gunRecoilScale = 1.7; // o quanto ela cresce no tiro
let gunReturnSpeed = 0.05; // velocidade de retorno


function applyRecoil() {
    gunScale = gunRecoilScale; // aumenta a arma levemente
}

function updateGunScale() {
    if (gunScale > 1) gunScale -= gunReturnSpeed;
    if (gunScale < 1) gunScale = 1;
}

function playerCollidesWithCube(cube) {
    const player = {
        x: cameraPos.x - playerRadius,
        y: cameraPos.y,
        z: cameraPos.z - playerRadius
    };
    const size = 3; // tamanho do cubo
    const playerSize = playerRadius * 2;

    return (
        player.x < cube.x + size &&
        player.x + playerSize > cube.x &&
        player.y < cube.y + size &&
        player.y + eyeLevel > cube.y &&
        player.z < cube.z + size &&
        player.z + playerSize > cube.z
    );
}

function checkCollision(a, b, size = 2) {
    return (
        a.x < b.x + size &&
        a.x + size > b.x &&
        a.y < b.y + size &&
        a.y + size > b.y &&
        a.z < b.z + size &&
        a.z + size > b.z
    );
}

// === INIMIGOS (cubos que seguem) ===
function updateEnemies() {
    for (const c of cubes) {
        if (playerCollidesWithCube(c)) {
            console.log("O jogador foi atingido!");
            // aqui você pode subtrair vida ou fazer qualquer evento
        }
    }

    for (let i = 0; i < cubes.length; i++) {
        let cube = cubes[i];

        // mover na direção do jogador
        let dx = cameraPos.x - cube.x;
        let dz = cameraPos.z - cube.z;
        let dist = Math.hypot(dx, dz);
        if (dist > 0.1) {
            cube.x += (dx / dist) * 0.02;
            cube.z += (dz / dist) * 0.02;
        }

        // checar colisão com outros cubos
        for (let j = 0; j < cubes.length; j++) {
            if (i === j) continue; // ignora ele mesmo
            let other = cubes[j];

            if (checkCollision(cube, other, 2)) {
                // simples empurrão para não se sobrepor
                if (cube.x < other.x) cube.x -= 0.01;
                else cube.x += 0.01;

                if (cube.z < other.z) cube.z -= 0.01;
                else cube.z += 0.01;
            }
        }
    }
}

// === DESENHAR CUBOS ===
function drawCube(cx, cy, cz) {
    const cameraHeight = cameraPos.y + eyeLevel;
    const rotated = cubeVertices.map(v =>
        rotate3D({
            x: v.x + cx - cameraPos.x,
            y: v.y + cy - cameraHeight,
            z: v.z + cz - cameraPos.z
        }, cameraYaw, cameraPitch - recoil)
    );

    if (!rotated.every(r => r.z > 0.1)) return;
    const projected = rotated.map(r => project(r));

    ctx.strokeStyle = "white";
    ctx.beginPath();
    for (const [a, b] of edges) {
        ctx.moveTo(projected[a].x, projected[a].y);
        ctx.lineTo(projected[b].x, projected[b].y);
    }
    ctx.stroke();
}

// === TIRO ===
let lastShotTime = 0;
let shotCooldown = 200; // ms entre tiros
let comeco = false
document.addEventListener("mousedown", () => {
    if (!comeco) {
        draw()
        comeco = true
    }else {
        shoot()
    }
});

function shoot() {
    const now = performance.now();
    if (now - lastShotTime < shotCooldown) return; // delay
    lastShotTime = now;

    applyRecoil();

    const range = 30, step = 0.2;
    const dirX = Math.sin(cameraYaw) * Math.cos(cameraPitch);
    const dirY = Math.sin(cameraPitch);
    const dirZ = Math.cos(cameraYaw) * Math.cos(cameraPitch);

    const eyeY = cameraPos.y + eyeLevel;
    for (let t = 0; t < range; t += step) {
        const rx = cameraPos.x + dirX * t;
        const ry = eyeY + dirY * t;
        const rz = cameraPos.z + dirZ * t;

        for (let i = 0; i < cubes.length; i++) {
            const c = cubes[i];
            const dx = rx - c.x, dy = ry - c.y, dz = rz - c.z;
            if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1.2) {
                cubes.splice(i, 1);
                return;
            }
        }
    }
}

// === HUD ===
function drawGun() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const size = 36 * gunScale; // aplica o crescimento aqui

    // mira
    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
    ctx.stroke();

    // arma
    ctx.fillStyle = "#555";
    ctx.fillRect(cx - size, canvas.height - 80 * gunScale, size * 2, 60 * gunScale);
}


function drawShotEffect() {
    const dt = performance.now() - lastShotTime;
    if (dt > 120) return;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const gunX = cx, gunY = canvas.height - 60;
    const a = 1 - dt / 120;
    ctx.strokeStyle = `rgba(255,220,100,${a})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gunX, gunY); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.fillStyle = `rgba(255,240,150,${a})`;
    ctx.beginPath();
    ctx.arc(gunX, gunY - 10, 12 * a, 0, Math.PI * 2);
    ctx.fill();
}

// === LOOP PRINCIPAL ===
function draw() {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    updateMovement();
    updateEnemies();
    updateGunScale();

    drawGround();
    for (const c of cubes) drawCube(c.x, c.y, c.z);

    drawGun();
    drawShotEffect();

    requestAnimationFrame(draw);
}