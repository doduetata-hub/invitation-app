// LA BUÉE : une vitre dessinée sur un canvas par-dessus la serre. Elle est composée du décor flouté, d'un voile laiteux et de la texture
// de gouttes (assets/droplets.webp : gris neutre qui disparaît au mélange). Le doigt (ou la souris) l'efface ; une grille grossière
// mesure la surface essuyée. Le flou est obtenu par réductions successives : il fonctionne sur tous les téléphones, sans filtre CSS.

const COLS = 18;
const ROWS = 30;

function surface(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Dessine une image comme `object-fit: cover; object-position: 50% 50%` dans le rectangle (0, 0, w, h). */
function drawCover(ctx, img, w, h) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

export function createFog(canvas, { background, droplets, layers = [], onProgress }) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  let w = 0;
  let h = 0;
  let radius = 40;
  let brush = null;
  let cells = new Uint8Array(COLS * ROWS);
  let cleared = 0;
  const frames = new Set();
  let dead = false;

  const frame = (fn) => {
    const id = requestAnimationFrame((t) => { frames.delete(id); if (!dead) fn(t); });
    frames.add(id);
  };

  function paint() {
    w = canvas.offsetWidth;
    h = canvas.offsetHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Décor et fleurs réunis en petit, puis agrandis : flou de la vitre embuée.
    const small = surface(w / 6, h / 6);
    const s = small.getContext('2d');
    s.imageSmoothingQuality = 'high';
    s.scale(small.width / w, small.height / h);
    drawCover(s, background, w, h);
    layers.forEach((el) => { if (el && el.naturalWidth) s.drawImage(el, el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight); });
    const tiny = surface(w / 18, h / 18);
    const t = tiny.getContext('2d');
    t.imageSmoothingQuality = 'high';
    t.drawImage(small, 0, 0, tiny.width, tiny.height);
    const mid = surface(w / 6, h / 6);
    const m = mid.getContext('2d');
    m.imageSmoothingQuality = 'high';
    m.drawImage(tiny, 0, 0, mid.width, mid.height);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(mid, 0, 0, w, h);
    ctx.fillStyle = 'rgba(226, 233, 224, 0.5)';
    ctx.fillRect(0, 0, w, h);
    if (droplets && droplets.naturalWidth) {
      const tile = Math.max(300, Math.min(520, w * 0.9));
      ctx.globalCompositeOperation = 'hard-light';
      ctx.globalAlpha = 0.72;
      for (let y = 0; y < h; y += tile) for (let x = 0; x < w; x += tile) ctx.drawImage(droplets, x, y, tile, tile);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    radius = Math.max(34, Math.min(78, Math.min(w, h) * 0.12));
    brush = surface(128, 128);
    const b = brush.getContext('2d');
    const g = b.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.62, 'rgba(0,0,0,0.92)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    b.fillStyle = g;
    b.fillRect(0, 0, 128, 128);
    cells = new Uint8Array(COLS * ROWS);
    cleared = 0;
  }

  function stamp(x, y, r) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(brush, x - r, y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
  }

  function mark(x, y) {
    const cw = w / COLS;
    const ch = h / ROWS;
    const reach = radius * 0.85;
    for (let r = Math.max(0, Math.floor((y - reach) / ch)); r <= Math.min(ROWS - 1, Math.floor((y + reach) / ch)); r += 1) {
      for (let c = Math.max(0, Math.floor((x - reach) / cw)); c <= Math.min(COLS - 1, Math.floor((x + reach) / cw)); c += 1) {
        const k = r * COLS + c;
        if (!cells[k] && Math.hypot((c + 0.5) * cw - x, (r + 0.5) * ch - y) <= reach) {
          cells[k] = 1;
          cleared += 1;
        }
      }
    }
  }

  /** Essuie le trait (x0, y0) → (x1, y1), en pixels de la vitre. */
  function wipe(x0, y0, x1, y1) {
    if (!brush) return;
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (radius * 0.28)));
    for (let i = 0; i <= steps; i += 1) {
      const x = x0 + ((x1 - x0) * i) / steps;
      const y = y0 + ((y1 - y0) * i) / steps;
      stamp(x, y, radius);
      mark(x, y);
    }
    if (onProgress) onProgress(cleared / (COLS * ROWS));
  }

  /** Une goutte coule et laisse une fine traînée claire (décor : elle ne compte pas dans la progression). */
  function drip() {
    if (!brush) return;
    const x = w * (0.08 + Math.random() * 0.84);
    const y = h * (0.02 + Math.random() * 0.5);
    const length = h * (0.12 + Math.random() * 0.24);
    const r = 3.5 + Math.random() * 3.5;
    const phase = Math.random() * 6;
    let start = null;
    const step = (t) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / 1700);
      const e = p * p * (3 - 2 * p);
      stamp(x + Math.sin(e * 9 + phase) * 2.4, y + length * e, r);
      if (p < 1) frame(step);
    };
    frame(step);
  }

  /** Essuyage automatique en zigzag (clavier, souris sans glisser, personnes qui ne peuvent pas balayer l'écran). */
  function autoWipe() {
    const points = [[0.1, 0.16], [0.9, 0.24], [0.12, 0.38], [0.88, 0.5], [0.12, 0.62], [0.9, 0.74], [0.2, 0.86], [0.8, 0.92]];
    let i = 0;
    let last = [points[0][0] * w, points[0][1] * h];
    let start = null;
    const SEG = 170;
    const step = (t) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / SEG);
      const a = points[i];
      const b = points[i + 1];
      const x = (a[0] + (b[0] - a[0]) * p) * w;
      const y = (a[1] + (b[1] - a[1]) * p) * h;
      wipe(last[0], last[1], x, y);
      last = [x, y];
      if (p >= 1) { i += 1; start = t; }
      if (i < points.length - 1) frame(step);
    };
    frame(step);
  }

  function destroy() {
    dead = true;
    frames.forEach((id) => cancelAnimationFrame(id));
    frames.clear();
  }

  paint();
  return { paint, wipe, drip, autoWipe, destroy, get width() { return w; } };
}
