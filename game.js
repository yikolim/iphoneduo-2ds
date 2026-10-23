// Demo game for the iPhone Duo 2DS shell: "Moonpetal Farm".
// A title menu, then a tiny garden you walk around with the D-pad and plant flowers in with A
// (or by tapping the bottom screen). Replace this file with your own game; see README.md.
/* =====================================================================
   Demo cartridge: "Moonpetal Farm". Title menu, then a tiny garden you
   walk around with the d-pad and plant flowers in with A (or by tapping).
   Swap it out with DS.setGame(yourGame).
   ===================================================================== */
(() => {
  const PX = '"Press Start 2P", monospace';
  const COLS = 16, ROWS = 12, T = 16;
  const FLOWER_COLORS = ["#ff8fb1", "#ffd36e", "#a98bff", "#7fd8ff", "#ff9d6e"];
  let scene = "title", cursor = 0, t = 0, flash = 0;
  let save = null;
  try { save = JSON.parse(localStorage.getItem("moonpetal") || "null"); } catch (e) {}
  const player = { x: 7, y: 6, fx: 7, fy: 6, dir: "DOWN", step: 0 };
  let flowers = {}, touchTarget = null, moveCD = 0, lastTouch = null;

  function persist() { try { localStorage.setItem("moonpetal", JSON.stringify({ flowers, x: player.x, y: player.y })); } catch (e) {} save = { flowers }; }
  function startGame(fresh) {
    flowers = fresh || !save ? {} : { ...save.flowers };
    if (!fresh && save) { player.x = player.fx = save.x ?? 7; player.y = player.fy = save.y ?? 6; }
    else { player.x = player.fx = 7; player.y = player.fy = 6; }
    scene = "farm"; flash = 0.25;
  }
  function choose(i) { cursor = i; if (i === 1 && !save) { flash = 0.15; return; } startGame(i === 0); }
  const DIRS = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
  function plant() {
    const [dx, dy] = DIRS[player.dir];
    const tx = player.x + dx, ty = player.y + dy;
    if (tx < 0 || ty < 1 || tx >= COLS || ty >= ROWS) return;
    const k = tx + "," + ty;
    if (flowers[k] != null) delete flowers[k]; else flowers[k] = Math.floor(Math.random() * FLOWER_COLORS.length);
    persist();
  }

  const game = {
    init() {
      DS.on("down", b => {
        if (scene === "title") {
          if (b === "UP" || b === "DOWN" || b === "SELECT") cursor = 1 - cursor;
          if (b === "A" || b === "START") choose(cursor);
        } else {
          if (b === "A") plant();
          if (b === "B" || b === "START") { scene = "title"; cursor = save ? 1 : 0; }
          if (b in DIRS) moveCD = 0;
        }
      });
      DS.on("touch", p => {
        lastTouch = p.phase === "end" ? null : p;
        if (scene === "title" && p.phase === "start") {
          if (p.x > 58 && p.x < 198) { if (p.y > 70 && p.y < 98) choose(0); if (p.y > 108 && p.y < 136) choose(1); }
        } else if (scene === "farm") {
          const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
          if (p.phase === "start" && Math.abs(tx - player.x) + Math.abs(ty - player.y) === 1) {
            player.dir = tx > player.x ? "RIGHT" : tx < player.x ? "LEFT" : ty > player.y ? "DOWN" : "UP";
            plant();
          } else if (p.phase !== "end") touchTarget = { x: tx, y: Math.max(1, ty) };
        }
      });
    },
    update(dt) {
      t += dt; flash = Math.max(0, flash - dt);
      if (scene !== "farm") return;
      moveCD -= dt;
      let want = ["UP", "DOWN", "LEFT", "RIGHT"].find(d => DS.isDown(d));
      if (!want && touchTarget) {
        const dx = touchTarget.x - player.x, dy = touchTarget.y - player.y;
        if (!dx && !dy) touchTarget = null;
        else want = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "RIGHT" : "LEFT") : (dy > 0 ? "DOWN" : "UP");
      }
      if (want && moveCD <= 0) {
        player.dir = want;
        const [dx, dy] = DIRS[want];
        const nx = player.x + dx, ny = player.y + dy;
        if (nx >= 0 && nx < COLS && ny >= 1 && ny < ROWS && flowers[nx + "," + ny] == null) { player.x = nx; player.y = ny; player.step++; }
        else touchTarget = null;
        moveCD = DS.isDown("R") ? 0.07 : 0.14;
      }
      const k = Math.min(1, dt * 18);
      player.fx += (player.x - player.fx) * k; player.fy += (player.y - player.fy) * k;
    },
    draw(top, bot) {
      drawTop(top);
      scene === "title" ? drawTitleBottom(bot) : drawFarm(bot);
      if (flash) { bot.fillStyle = `rgba(255,255,255,${flash * 2})`; bot.fillRect(0, 0, 256, 192); }
    }
  };

  function sky(c, warm) {
    const W = c.canvas.width, H = c.canvas.height;
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#7fd0f2"); g.addColorStop(0.55, "#c9e6fb"); g.addColorStop(1, warm ? "#ffd7e2" : "#f6c3d6");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // shimmering light ripples
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      const y0 = 14 + i * 20;
      for (let x = 0; x <= W; x += 8) c.lineTo(x, y0 + Math.sin(x / 23 + t * 1.3 + i) * 4);
      c.stroke();
    }
    // sparkles
    for (let i = 0; i < 14; i++) {
      const x = (i * 71 + t * 9) % W, y = (i * 37) % 150 + 6, a = (Math.sin(t * 3 + i) + 1) / 2;
      c.fillStyle = `rgba(255,255,255,${a})`; c.fillRect(x | 0, y, 2, 2);
    }
  }
  function text(c, s, x, y, size, color, align = "center", shadow) {
    c.font = `${size}px ${PX}`; c.textAlign = align; c.textBaseline = "top";
    if (shadow) { c.fillStyle = shadow; c.fillText(s, x + 1, y + 1); }
    c.fillStyle = color; c.fillText(s, x, y);
  }

  // The top screen is 400x240 (5:3) and the bottom one 256x192 (4:3). The top layout below is drawn
  // on a 256x192 grid, scaled up and centred over a full-width sky.
  function drawTop(c) {
    sky(c, scene === "farm");
    const s = c.canvas.height / 192;
    c.save(); c.translate((c.canvas.width - 256 * s) / 2, 0); c.scale(s, s);
    drawTopLayout(c);
    c.restore();
  }
  function drawTopLayout(c) {
    if (scene === "title") {
      const bob = Math.round(Math.sin(t * 2) * 2);
      text(c, "Moonpetal", 128, 52 + bob, 20, "#e9806e", "center", "#fff3d6");
      text(c, "FARM", 128, 80 + bob, 16, "#c86a8f", "center", "#fff3d6");
      text(c, "~ a pocket garden ~", 128, 104, 7, "#8e6fa8");
      if (Math.floor(t * 2) % 2) text(c, "PRESS START", 128, 138, 8, "#ffffff", "center", "#9a7fb0");
      text(c, "iPhone Duo 2DS demo cart", 128, 176, 6, "#6f6a8a");
    } else {
      text(c, "SPRING · DAY 1", 8, 8, 8, "#5d4a7a", "left");
      const n = Object.keys(flowers).length;
      text(c, `FLOWERS ${String(n).padStart(3, "0")}`, 248, 8, 8, "#c55a7f", "right");
      // input readout
      c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(8, 30, 240, 104);
      text(c, "INPUT", 16, 38, 7, "#6f6a8a", "left");
      const btns = DS.buttons;
      btns.forEach((b, i) => {
        const col = i % 4, row = Math.floor(i / 4), x = 16 + col * 58, y = 54 + row * 22;
        const on = DS.isDown(b);
        c.fillStyle = on ? "#ff8fb1" : "rgba(255,255,255,.8)"; c.fillRect(x, y, 52, 16);
        text(c, b, x + 26, y + 5, 6, on ? "#ffffff" : "#8a7d96");
      });
      text(c, lastTouch ? `TOUCH ${lastTouch.x},${lastTouch.y}` : "TOUCH --", 16, 142, 7, "#5d4a7a", "left");
      text(c, "A plant  B title  R run", 128, 170, 7, "#6f6a8a");
    }
  }

  function drawTitleBottom(c) {
    const g = c.createLinearGradient(0, 0, 256, 192);
    g.addColorStop(0, "#fde3ef"); g.addColorStop(1, "#d9ecff");
    c.fillStyle = g; c.fillRect(0, 0, 256, 192);
    for (let i = 0; i < 6; i++) { // drifting petals
      const x = (i * 53 + t * 14) % 270 - 7, y = (i * 41 + t * 20) % 200 - 4;
      c.fillStyle = FLOWER_COLORS[i % 5]; c.fillRect(x | 0, y | 0, 3, 3);
    }
    [["NEW GAME", 70, true], ["CONTINUE", 108, !!save]].forEach(([label, y, ok], i) => {
      const sel = cursor === i;
      c.fillStyle = sel ? "#ffffff" : "rgba(255,255,255,.6)"; c.fillRect(58, y, 140, 28);
      c.fillStyle = sel ? "#7cc7e8" : "#bfe2f2"; c.fillRect(58, y + 24, 140, 4);
      text(c, label, 128, y + 9, 10, ok ? (sel ? "#3d86b0" : "#6aa6c4") : "#b9b4c4");
      if (sel) { const bx = 44 + Math.round(Math.sin(t * 6) * 2); c.fillStyle = "#e9806e"; c.beginPath(); c.moveTo(bx, y + 8); c.lineTo(bx + 8, y + 14); c.lineTo(bx, y + 20); c.fill(); }
    });
    text(c, save ? "Tap a button or press A" : "Tap NEW GAME or press A", 128, 160, 6, "#8a7d96");
  }

  function drawFarm(c) {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      c.fillStyle = y === 0 ? "#a7d8f0" : (x + y) % 2 ? "#9fd88b" : "#93cf80";
      c.fillRect(x * T, y * T, T, T);
      if (y > 0 && (x * 7 + y * 13) % 5 === 0) { c.fillStyle = "#7fbf6c"; c.fillRect(x * T + 5, y * T + 9, 1, 3); c.fillRect(x * T + 8, y * T + 8, 1, 4); }
    }
    // fence along the top
    c.fillStyle = "#e8c9a0"; c.fillRect(0, 12, 256, 3);
    for (let x = 4; x < 256; x += 16) c.fillRect(x, 6, 3, 10);
    // flowers
    for (const k in flowers) {
      const [x, y] = k.split(",").map(Number), px = x * T, py = y * T;
      const sway = Math.round(Math.sin(t * 3 + x + y));
      c.fillStyle = "#4f9a4a"; c.fillRect(px + 7, py + 7, 2, 7);
      c.fillStyle = FLOWER_COLORS[flowers[k]];
      c.fillRect(px + 4 + sway, py + 3, 8, 6); c.fillRect(px + 6 + sway, py + 1, 4, 10);
      c.fillStyle = "#fff4b8"; c.fillRect(px + 7 + sway, py + 5, 2, 2);
    }
    // facing marker
    const [dx, dy] = DIRS[player.dir];
    const fx = player.x + dx, fy = player.y + dy;
    if (fy >= 1 && fy < ROWS && fx >= 0 && fx < COLS) { c.strokeStyle = "rgba(255,255,255,.7)"; c.strokeRect(fx * T + 0.5, fy * T + 0.5, T - 1, T - 1); }
    // farmer
    const px = Math.round(player.fx * T), py = Math.round(player.fy * T), hop = player.step % 2 && Math.abs(player.fx - player.x) > 0.05 ? -1 : 0;
    c.fillStyle = "rgba(0,0,0,.15)"; c.fillRect(px + 3, py + 13, 10, 2);
    c.fillStyle = "#ef8fa6"; c.fillRect(px + 4, py + 7 + hop, 8, 6);       // dress
    c.fillStyle = "#ffe0c7"; c.fillRect(px + 4, py + 2 + hop, 8, 6);       // face
    c.fillStyle = "#f0c46a"; c.fillRect(px + 3, py + 1 + hop, 10, 3);      // straw hat
    c.fillRect(px + 2, py + 3 + hop, 12, 1);
    c.fillStyle = "#4a3640";
    if (player.dir !== "UP") { const o = player.dir === "LEFT" ? -1 : player.dir === "RIGHT" ? 1 : 0; c.fillRect(px + 6 + o, py + 5 + hop, 1, 1); c.fillRect(px + 9 + o, py + 5 + hop, 1, 1); }
    c.fillStyle = "#7a5a4a"; c.fillRect(px + 5, py + 13 + hop, 2, 2); c.fillRect(px + 9, py + 13 + hop, 2, 2);
  }

  DS.setGame(game);
})();
