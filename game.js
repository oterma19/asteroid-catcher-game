(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const scoreValueEl = document.getElementById("scoreValue");
  const livesValueEl = document.getElementById("livesValue");
  const timeValueEl = document.getElementById("timeValue");
  const startScreen = document.getElementById("startScreen");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const reasonText = document.getElementById("reasonText");
  const finalScoreEl = document.getElementById("finalScore");
  const bestScoreStartEl = document.getElementById("bestScoreStart");
  const bestScoreEndEl = document.getElementById("bestScoreEnd");
  const leftBtn = document.getElementById("leftBtn");
  const rightBtn = document.getElementById("rightBtn");

  const BEST_SCORE_KEY = "asteroidCatcher.bestScore";
  const GAME_DURATION = 60; // seconds
  const START_LIVES = 3;

  let cssWidth = 0;
  let cssHeight = 0;

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cssWidth = rect.width;
    cssHeight = rect.height;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", resizeCanvas);

  // ---------- Starfield ----------
  let stars = [];
  function buildStars() {
    stars = [];
    const count = 90;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.6 + 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.6 + 0.2,
      });
    }
  }

  function drawStars(time) {
    ctx.fillStyle = "#05070f";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    for (const s of stars) {
      const twinkle = 0.55 + 0.45 * Math.sin(time * s.speed + s.phase);
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = "#cfe8ff";
      ctx.beginPath();
      ctx.arc(s.x * cssWidth, s.y * cssHeight, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Ship ----------
  const ship = {
    x: 0,
    y: 0,
    width: 46,
    height: 42,
    speed: 320, // px/sec
  };

  function resetShip() {
    ship.width = Math.max(38, cssWidth * 0.13);
    ship.height = ship.width * 0.9;
    ship.x = cssWidth / 2 - ship.width / 2;
    ship.y = cssHeight - ship.height - 14;
  }

  function drawShip() {
    const cx = ship.x + ship.width / 2;
    const top = ship.y;
    const bottom = ship.y + ship.height;

    ctx.save();
    ctx.translate(cx, 0);

    // engine flame
    if (moveState.left || moveState.right || moveState.thrust) {
      const flameH = ship.height * 0.5 + Math.random() * 6;
      const grad = ctx.createLinearGradient(0, bottom, 0, bottom + flameH);
      grad.addColorStop(0, "rgba(110,231,255,0.9)");
      grad.addColorStop(1, "rgba(110,231,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-ship.width * 0.18, bottom - 4);
      ctx.lineTo(ship.width * 0.18, bottom - 4);
      ctx.lineTo(0, bottom + flameH);
      ctx.closePath();
      ctx.fill();
    }

    // hull
    const grad2 = ctx.createLinearGradient(0, top, 0, bottom);
    grad2.addColorStop(0, "#e9f4ff");
    grad2.addColorStop(1, "#8fb4ff");
    ctx.fillStyle = grad2;
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(ship.width / 2, bottom);
    ctx.lineTo(ship.width * 0.2, bottom - ship.height * 0.18);
    ctx.lineTo(-ship.width * 0.2, bottom - ship.height * 0.18);
    ctx.lineTo(-ship.width / 2, bottom);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(167,139,250,0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // cockpit
    ctx.fillStyle = "#6ee7ff";
    ctx.beginPath();
    ctx.ellipse(0, top + ship.height * 0.42, ship.width * 0.11, ship.height * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ---------- Asteroids ----------
  let asteroids = [];

  function makeAsteroidShape(radius) {
    const points = 9 + Math.floor(Math.random() * 3);
    const shape = [];
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = radius * (0.75 + Math.random() * 0.35);
      shape.push({ angle, r });
    }
    return shape;
  }

  function spawnAsteroid() {
    const radius = cssWidth * (0.045 + Math.random() * 0.035);
    asteroids.push({
      x: radius + Math.random() * (cssWidth - radius * 2),
      y: -radius,
      radius,
      speed: currentAsteroidSpeed() * (0.85 + Math.random() * 0.3),
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 1.4,
      shape: makeAsteroidShape(radius),
      craters: Array.from({ length: 3 }, () => ({
        a: Math.random() * Math.PI * 2,
        d: Math.random() * radius * 0.5,
        r: radius * (0.12 + Math.random() * 0.1),
      })),
    });
  }

  function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);
    ctx.beginPath();
    a.shape.forEach((p, i) => {
      const px = Math.cos(p.angle) * p.r;
      const py = Math.sin(p.angle) * p.r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    const grad = ctx.createRadialGradient(-a.radius * 0.3, -a.radius * 0.3, a.radius * 0.1, 0, 0, a.radius);
    grad.addColorStop(0, "#9c9aa8");
    grad.addColorStop(1, "#5b5866");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (const c of a.craters) {
      ctx.beginPath();
      ctx.arc(Math.cos(c.a) * c.d, Math.sin(c.a) * c.d, c.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- Particles ----------
  let particles = [];

  function spawnParticles(x, y) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.35,
        age: 0,
        r: 1.5 + Math.random() * 2.5,
        hue: Math.random() > 0.5 ? "#6ee7ff" : "#ffe08a",
      });
    }
  }

  function updateParticles(dt) {
    particles.forEach((p) => {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
    });
    particles = particles.filter((p) => p.age < p.life);
  }

  function drawParticles() {
    for (const p of particles) {
      const t = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(t, 0);
      ctx.fillStyle = p.hue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Game state ----------
  let state = "idle"; // idle | playing | gameover
  let score = 0;
  let lives = START_LIVES;
  let timeLeft = GAME_DURATION;
  let elapsed = 0;
  let spawnTimer = 0;
  let lastTime = 0;
  let flashAlpha = 0;
  let flashColor = "110,231,255";

  const moveState = { left: false, right: false, thrust: false };

  function currentAsteroidSpeed() {
    const base = cssHeight * 0.16;
    const ramp = Math.min(elapsed / GAME_DURATION, 1) * cssHeight * 0.22;
    return base + ramp;
  }

  function currentSpawnInterval() {
    const base = 1.1;
    const min = 0.38;
    const t = Math.min(elapsed / GAME_DURATION, 1);
    return base - (base - min) * t;
  }

  function getBestScore() {
    const v = parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10);
    return Number.isFinite(v) ? v : 0;
  }

  function setBestScore(v) {
    localStorage.setItem(BEST_SCORE_KEY, String(v));
  }

  function updateHud() {
    scoreValueEl.textContent = String(score);
    livesValueEl.textContent = "❤".repeat(Math.max(lives, 0)) + "🖤".repeat(Math.max(START_LIVES - lives, 0));
    timeValueEl.textContent = String(Math.ceil(timeLeft));
  }

  function startGame() {
    resizeCanvas();
    resetShip();
    asteroids = [];
    particles = [];
    score = 0;
    lives = START_LIVES;
    timeLeft = GAME_DURATION;
    elapsed = 0;
    spawnTimer = 0;
    flashAlpha = 0;
    state = "playing";
    updateHud();
    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function endGame(reason) {
    state = "gameover";
    const best = getBestScore();
    if (score > best) setBestScore(score);
    reasonText.textContent = reason;
    finalScoreEl.textContent = String(score);
    bestScoreEndEl.textContent = String(getBestScore());
    gameOverScreen.classList.remove("hidden");
  }

  function triggerFlash(color) {
    flashAlpha = 0.5;
    flashColor = color;
  }

  function rectCircleCollide(a) {
    const shipLeft = ship.x;
    const shipRight = ship.x + ship.width;
    const shipTop = ship.y;
    const shipBottom = ship.y + ship.height;

    const closestX = Math.max(shipLeft, Math.min(a.x, shipRight));
    const closestY = Math.max(shipTop, Math.min(a.y, shipBottom));
    const dx = a.x - closestX;
    const dy = a.y - closestY;
    return dx * dx + dy * dy < (a.radius * 0.75) * (a.radius * 0.75);
  }

  function update(dt) {
    elapsed += dt;
    timeLeft = Math.max(0, GAME_DURATION - elapsed);

    // ship movement
    let dir = 0;
    if (moveState.left) dir -= 1;
    if (moveState.right) dir += 1;
    ship.x += dir * ship.speed * dt;
    ship.x = Math.max(0, Math.min(cssWidth - ship.width, ship.x));

    // spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnAsteroid();
      spawnTimer = currentSpawnInterval();
    }

    // asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      a.y += a.speed * dt;
      a.rotation += a.rotSpeed * dt;

      if (rectCircleCollide(a)) {
        score++;
        spawnParticles(a.x, a.y);
        triggerFlash("110,231,255");
        asteroids.splice(i, 1);
        continue;
      }

      if (a.y - a.radius > cssHeight) {
        asteroids.splice(i, 1);
        lives--;
        triggerFlash("255,93,122");
        if (lives <= 0) {
          updateHud();
          endGame("Жизни закончились");
          return;
        }
      }
    }

    updateParticles(dt);
    flashAlpha = Math.max(0, flashAlpha - dt * 1.2);

    updateHud();

    if (timeLeft <= 0) {
      endGame("Время вышло");
    }
  }

  function render(time) {
    drawStars(time);
    for (const a of asteroids) drawAsteroid(a);
    drawShip();
    drawParticles();

    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(${flashColor}, ${flashAlpha * 0.35})`;
      ctx.fillRect(0, 0, cssWidth, cssHeight);
    }
  }

  function loop(now) {
    if (state !== "playing") return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt);
    if (state !== "playing") {
      render(now / 1000);
      return;
    }
    render(now / 1000);
    requestAnimationFrame(loop);
  }

  // ---------- Idle background animation ----------
  function idleRender(now) {
    if (state === "idle") {
      resizeCanvas();
      drawStars(now / 1000);
      requestAnimationFrame(idleRender);
    }
  }

  // ---------- Input ----------
  window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") moveState.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") moveState.right = true;
    if (e.code === "Space") {
      e.preventDefault();
      if (state !== "playing") startGame();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") moveState.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") moveState.right = false;
  });

  function bindHold(el, onDown, onUp) {
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      onDown();
    });
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onUp);
    el.addEventListener("pointercancel", onUp);
  }

  bindHold(leftBtn, () => (moveState.left = true), () => (moveState.left = false));
  bindHold(rightBtn, () => (moveState.right = true), () => (moveState.right = false));

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);

  // ---------- Init ----------
  function init() {
    resizeCanvas();
    buildStars();
    resetShip();
    bestScoreStartEl.textContent = String(getBestScore());
    bestScoreEndEl.textContent = String(getBestScore());
    updateHud();
    requestAnimationFrame(idleRender);
  }

  init();
})();
