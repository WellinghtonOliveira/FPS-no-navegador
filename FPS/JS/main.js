const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Ajusta o tamanho da tela
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Ângulos da câmera
let cameraYaw = 0;   // Esquerda / Direita
let cameraPitch = 0; // Cima / Baixo

// Travar o cursor ao clicar
canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
});

// Quando o mouse se mover
document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === canvas) {
        const sensibilidade = 0.002; // ajuste fino de velocidade
        cameraYaw -= event.movementX * sensibilidade;
        cameraPitch -= event.movementY * sensibilidade;

        // limita o olhar para cima/baixo (90°)
        cameraPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraPitch));
    }
});

// Desenhar “visão” simples
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mostra ângulos da câmera
    ctx.fillStyle = "white";
    ctx.font = "20px monospace";
    ctx.fillText("Yaw: " + cameraYaw.toFixed(2), 20, 40);
    ctx.fillText("Pitch: " + cameraPitch.toFixed(2), 20, 70);

    requestAnimationFrame(draw);
}

draw();
