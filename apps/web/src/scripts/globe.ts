/**
 * Hero-Globus «Layer 8»: Punkte auf einer Kugel, die sich langsam dreht und ziehen lässt.
 * Ein Teil der Punkte sind Knoten eines Netzes. Mit dem Scrollen durch den Hero werden sie
 * «gepatcht» und leuchten in Acid. Rein dekorativ (aria-hidden): keine Information steht nur hier.
 *
 * Canvas 2D, ohne Bibliothek. Ausserhalb des Viewports, bei pausierter oder reduzierter
 * Bewegung läuft keine Schleife; dann wird nur bei Bedarf ein einzelnes Bild gezeichnet.
 */
import { motionAllowed, motionPaused, onMotionPausedChange, whileInView } from '@psyber/ui/motion';

interface Vec {
  x: number;
  y: number;
  z: number;
}

interface NetNode extends Vec {
  /** Reihenfolge, in der die Knoten gepatcht werden */
  order: number;
  /** Zeitpunkt des Patches (für das kurze Aufleuchten) */
  since: number;
  patched: boolean;
}

export interface Globe {
  /** 0 = Anfang des Heros, 1 = durchgescrollt */
  setProgress(progress: number): void;
  destroy(): void;
}

/** Radius der Kugel relativ zur kürzeren Kante der Zeichenfläche (muss zum CSS passen) */
const RADIUS = 0.44;
const BASE_PITCH = -0.34;
const AUTO_SPEED = 0.085; // rad pro Sekunde
/** Anteil der Knoten, die schon am Anfang gepatcht sind */
const PATCHED_START = 0.12;

/** Deterministischer Zufall (Mulberry32): dieselbe Kugel bei jedem Laden und in Screenshots */
function prng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize(x: number, y: number, z: number): Vec {
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

/** Gleichmässig verteilte Punkte (Fibonacci-Gitter) */
function surface(count: number): Vec[] {
  const points: Vec[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < count; index++) {
    const y = 1 - (2 * (index + 0.5)) / count;
    const ring = Math.sqrt(1 - y * y);
    const angle = index * golden;
    points.push({ x: Math.cos(angle) * ring, y, z: Math.sin(angle) * ring });
  }
  return points;
}

/** Knoten: ein dichter Haufen (das «Zuhause») und einige verstreute */
function network(count: number, random: () => number): NetNode[] {
  const home = normalize(0.25, 0.3, 1);
  const nodes: NetNode[] = [];
  for (let index = 0; index < count; index++) {
    const clustered = index < count * 0.62;
    const spread = clustered ? 0.5 : 2.4;
    const point = normalize(
      home.x + (random() - 0.5) * spread,
      home.y + (random() - 0.5) * spread,
      home.z + (random() - 0.5) * spread,
    );
    nodes.push({ ...point, order: 0, since: -1e6, patched: false });
  }
  // Patch-Reihenfolge mischen
  const order = nodes.map((_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap]!, order[index]!];
  }
  order.forEach((nodeIndex, position) => {
    nodes[nodeIndex]!.order = position;
  });
  return nodes;
}

/** Jeder Knoten ist mit seinen zwei nächsten Nachbarn verbunden */
function links(nodes: NetNode[]): [number, number][] {
  const pairs = new Map<string, [number, number]>();
  nodes.forEach((node, index) => {
    const nearest = nodes
      .map((other, otherIndex) => ({
        otherIndex,
        distance: Math.hypot(node.x - other.x, node.y - other.y, node.z - other.z),
      }))
      .filter((entry) => entry.otherIndex !== index)
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 2);
    for (const { otherIndex, distance } of nearest) {
      if (distance > 0.75) continue;
      const key = index < otherIndex ? `${index}-${otherIndex}` : `${otherIndex}-${index}`;
      pairs.set(key, [index, otherIndex]);
    }
  });
  return [...pairs.values()];
}

export function initGlobe(canvas: HTMLCanvasElement): Globe {
  const context = canvas.getContext('2d');
  if (!context) return { setProgress: () => undefined, destroy: () => undefined };

  // Farben aus dem Designsystem (z. B. --acid-rgb: «201 251 82») als Liste für rgba()
  const tokens = getComputedStyle(document.documentElement);
  const channels = (name: string, fallback: string) =>
    tokens.getPropertyValue(name).trim().split(/\s+/).join(', ') || fallback;
  const ACID = channels('--acid-rgb', '201, 251, 82');
  const BONE = channels('--bone-rgb', '244, 244, 239');

  const random = prng(8);
  const small = window.matchMedia('(max-width: 47.99rem)').matches;
  const points = surface(small ? 420 : 760);
  const nodes = network(small ? 34 : 52, random);
  const pairs = links(nodes);
  const animate = motionAllowed();

  let width = 0;
  let height = 0;
  let ratio = 1;
  let yaw = -0.2;
  let pitch = BASE_PITCH;
  let velocity = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let inView = false;
  let paused = motionPaused();
  let frame = 0;
  let last = 0;
  let drawn = 0;
  /** Die Dauerdrehung beginnt erst, wenn die Seite geladen ist und der Browser Luft hat. */
  let ready = false;
  let target = Math.round(nodes.length * PATCHED_START);
  /** Kleine Bildschirme: 30 Bilder pro Sekunde reichen für die langsame Drehung. */
  const interval = small ? 1000 / 30 : 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    // Weiche Lichtpunkte brauchen keine volle Auflösung: Das spart auf Handys viel Rechenzeit.
    ratio = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.5);
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    schedule();
  };

  const project = (point: Vec, sinY: number, cosY: number, sinP: number, cosP: number) => {
    // Erst um die senkrechte Achse drehen, dann nach vorn neigen
    const x = point.x * cosY + point.z * sinY;
    const z0 = -point.x * sinY + point.z * cosY;
    const y = point.y * cosP - z0 * sinP;
    const z = point.y * sinP + z0 * cosP;
    return { x, y, z };
  };

  const draw = (now: number) => {
    const radius = Math.min(width, height) * RADIUS;
    const centerX = width / 2;
    const centerY = height / 2;
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    const sinP = Math.sin(pitch);
    const cosP = Math.cos(pitch);

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    // Punkte der Oberfläche: nur die Vorderseite, zum Rand hin leiser
    for (const point of points) {
      const p = project(point, sinY, cosY, sinP, cosP);
      if (p.z <= 0.02) continue;
      const alpha = 0.16 + p.z * 0.62;
      const size = 1 + p.z * 1.1;
      context.fillStyle = `rgba(${BONE}, ${alpha.toFixed(3)})`;
      context.fillRect(
        centerX + p.x * radius - size / 2,
        centerY - p.y * radius - size / 2,
        size,
        size,
      );
    }

    const projected = nodes.map((node) => project(node, sinY, cosY, sinP, cosP));

    // Verbindungen
    context.lineWidth = 1;
    for (const [from, to] of pairs) {
      const a = projected[from]!;
      const b = projected[to]!;
      if (a.z <= 0.05 || b.z <= 0.05) continue;
      const both = nodes[from]!.patched && nodes[to]!.patched;
      const depth = Math.min(a.z, b.z);
      context.strokeStyle = both
        ? `rgba(${ACID}, ${(0.12 + depth * 0.38).toFixed(3)})`
        : `rgba(${BONE}, ${(0.04 + depth * 0.14).toFixed(3)})`;
      context.beginPath();
      context.moveTo(centerX + a.x * radius, centerY - a.y * radius);
      context.lineTo(centerX + b.x * radius, centerY - b.y * radius);
      context.stroke();
    }

    // Knoten: offen = Ring, gepatcht = Lichtpunkt
    let busy = false;
    nodes.forEach((node, index) => {
      const p = projected[index]!;
      if (p.z <= 0.03) return;
      const x = centerX + p.x * radius;
      const y = centerY - p.y * radius;
      if (node.patched) {
        const age = Math.min(1, (now - node.since) / 600);
        if (age < 1) busy = true;
        const pulse = 1 + (1 - age) * (1 - age) * 1.6;
        const core = 2 + p.z * 1.8;
        // Lichthof aus zwei weichen Scheiben, darauf der Kern
        context.fillStyle = `rgba(${ACID}, ${(0.07 + p.z * 0.09).toFixed(3)})`;
        context.beginPath();
        context.arc(x, y, core * 3.6 * pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = `rgba(${ACID}, ${(0.12 + p.z * 0.16).toFixed(3)})`;
        context.beginPath();
        context.arc(x, y, core * 2.1 * pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = `rgba(${ACID}, ${(0.45 + p.z * 0.55).toFixed(3)})`;
        context.beginPath();
        context.arc(x, y, core, 0, Math.PI * 2);
        context.fill();
      } else {
        context.strokeStyle = `rgba(${BONE}, ${(0.3 + p.z * 0.55).toFixed(3)})`;
        context.beginPath();
        context.arc(x, y, 2 + p.z * 1.6, 0, Math.PI * 2);
        context.stroke();
      }
    });
    return busy;
  };

  /** Patch-Stand an das Ziel angleichen */
  const sync = (now: number) => {
    for (const node of nodes) {
      const should = node.order < target;
      if (should !== node.patched) {
        node.patched = should;
        // Das kurze Aufleuchten beim Patchen ist Bewegung: bei reduzierter Bewegung entfällt es.
        node.since = should && animate ? now : -1e6;
      }
    }
  };

  const spinning = () => animate && ready && !paused;
  const running = () => inView && (spinning() || dragging || Math.abs(velocity) > 0.0002);

  const tick = (now: number) => {
    frame = 0;
    // Bildrate begrenzen (beim Ziehen immer volle Rate)
    if (interval && !dragging && now - drawn < interval - 2) {
      frame = requestAnimationFrame(tick);
      return;
    }
    drawn = now;
    const delta = Math.min(0.1, (now - last) / 1000 || 0);
    last = now;
    if (!dragging) {
      if (spinning()) yaw += AUTO_SPEED * delta;
      yaw += velocity;
      velocity *= 0.94;
      // Die Neigung kehrt langsam in die Grundstellung zurück
      pitch += (BASE_PITCH - pitch) * 0.02;
    }
    sync(now);
    const busy = draw(now);
    if (running() || (busy && inView)) frame = requestAnimationFrame(tick);
  };

  const schedule = () => {
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  // --- Ziehen zum Drehen ---
  const onDown = (event: PointerEvent) => {
    dragging = true;
    velocity = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
    schedule();
  };
  const onMove = (event: PointerEvent) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    const scale = 2.4 / Math.max(240, Math.min(width, height));
    yaw += dx * scale;
    velocity = dx * scale * 0.5;
    pitch = Math.max(-1.1, Math.min(0.6, pitch - dy * scale));
  };
  const onUp = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    canvas.releasePointerCapture(event.pointerId);
    canvas.classList.remove('is-dragging');
    if (!animate) velocity = 0;
    schedule();
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  observer?.observe(canvas);
  const stopInView = whileInView(canvas, (visible) => {
    inView = visible;
    if (visible) schedule();
  });
  const stopPaused = onMotionPausedChange((next) => {
    paused = next;
    schedule();
  });

  resize();

  // Erst das Standbild, dann die Drehung: nach dem Laden, wenn der Browser nichts Dringendes tut.
  const begin = () => {
    const go = () => {
      ready = true;
      schedule();
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 2500 });
    else setTimeout(go, 600);
  };
  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });

  return {
    setProgress(progress) {
      const share = PATCHED_START + (1 - PATCHED_START) * Math.max(0, Math.min(1, progress));
      const next = Math.round(nodes.length * share);
      if (next === target) return;
      target = next;
      schedule();
    },
    destroy() {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      stopInView();
      stopPaused();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    },
  };
}
