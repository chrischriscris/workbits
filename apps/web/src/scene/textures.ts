import * as THREE from "three";

function seeded(seed: number) {
  let value = seed % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function makeTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  height = size,
) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function repeat(texture: THREE.Texture, x: number, y: number) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(x, y);
  return texture;
}

/** Same image, different tiling. Clones share one GPU upload. */
export function withRepeat(texture: THREE.Texture, x: number, y: number) {
  const copy = texture.clone();
  return repeat(copy, x, y);
}

/** Flat woven rug: soft border bands + a quiet field pattern. */
function rugTexture(
  random: () => number,
  {
    field,
    border,
    band,
    pattern,
  }: { field: string; border: string; band: string; pattern: "lines" | "diamond" | "plain" | "quiet" },
) {
  return makeTexture(512, (ctx, size) => {
    ctx.fillStyle = border;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = band;
    ctx.fillRect(14, 14, size - 28, size - 28);
    ctx.fillStyle = field;
    ctx.fillRect(30, 30, size - 60, size - 60);
    if (pattern === "lines") {
      // A pale maze of short strokes, like a flat-weave office rug.
      ctx.strokeStyle = "rgba(150, 140, 126, 0.22)";
      ctx.lineWidth = 3;
      const step = 32;
      for (let x = 48; x < size - 48; x += step) {
        for (let y = 48; y < size - 48; y += step) {
          ctx.beginPath();
          if (random() > 0.5) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + step * 0.8, y);
          } else {
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + step * 0.8);
          }
          ctx.stroke();
        }
      }
    } else if (pattern === "diamond") {
      ctx.strokeStyle = "rgba(255, 252, 245, 0.35)";
      ctx.lineWidth = 3;
      for (let i = -size; i < size * 2; i += 46) {
        ctx.beginPath();
        ctx.moveTo(i, 30);
        ctx.lineTo(i + size, size - 30);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i, size - 30);
        ctx.lineTo(i + size, 30);
        ctx.stroke();
      }
      ctx.fillStyle = field;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(30, 30, size - 60, size - 60);
      ctx.globalAlpha = 1;
    } else if (pattern === "quiet") {
      // Soft inset frame and a faint scatter of tufts: detail without busyness.
      ctx.strokeStyle = "rgba(196, 170, 136, 0.35)";
      ctx.lineWidth = 4;
      ctx.strokeRect(60, 60, size - 120, size - 120);
      ctx.fillStyle = "rgba(205, 180, 146, 0.22)";
      for (let col = 0; col < 9; col += 1) {
        for (let row = 0; row < 9; row += 1) {
          if ((col + row) % 2 === 0) ctx.fillRect(96 + col * 40 - 3, 96 + row * 40 - 3, 6, 6);
        }
      }
    }
    ctx.strokeStyle = "rgba(90, 70, 50, 0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(38, 38, size - 76, size - 76);
    // Fibre speckle.
    for (let i = 0; i < 1400; i += 1) {
      ctx.fillStyle = random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(60,40,20,0.035)";
      ctx.fillRect(random() * size, random() * size, 2, 2);
    }
  });
}

export function createTextures() {
  const random = seeded(4217);

  // Pale washed oak: long boards, staggered butt joints, very soft grain.
  // The reference floor is close to warm ivory, not honey; keep the value high
  // and the saturation low so the props carry the color.
  // Window-shaped pool of sunlight: four soft panes on black, for additive
  // blending onto the floor.
  const sunPatch = makeTexture(256, (ctx, size) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);
    ctx.filter = "blur(9px)";
    ctx.fillStyle = "#fff";
    const pane = size * 0.36;
    const gap = size * 0.05;
    const start = (size - pane * 2 - gap) / 2;
    for (const x of [start, start + pane + gap]) {
      for (const y of [start, start + pane + gap]) ctx.fillRect(x, y, pane, pane);
    }
    ctx.filter = "none";
  });

  // Pale warm microcement: big soft clouds and a faint speckle, drawn with
  // wrap-around so it tiles without seams.
  const concrete = makeTexture(1024, (ctx, size) => {
    ctx.fillStyle = "#e3dfda";
    ctx.fillRect(0, 0, size, size);
    const blob = (x: number, y: number, radius: number, color: string) => {
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          const gradient = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, radius);
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gradient;
          ctx.fillRect(x + dx - radius, y + dy - radius, radius * 2, radius * 2);
        }
      }
    };
    for (let index = 0; index < 26; index += 1) {
      const light = random() > 0.5;
      blob(
        random() * size,
        random() * size,
        120 + random() * 260,
        light ? `rgba(248, 246, 243, ${0.18 + random() * 0.16})` : `rgba(196, 190, 182, ${0.1 + random() * 0.12})`,
      );
    }
    for (let index = 0; index < 5000; index += 1) {
      ctx.fillStyle = random() > 0.5 ? "rgba(255,255,255,0.18)" : "rgba(160,148,132,0.12)";
      ctx.fillRect(random() * size, random() * size, 1.5, 1.5);
    }
  });

  const wood = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#e7d7c4";
    ctx.fillRect(0, 0, size, size);
    const rows = 10;
    const rowHeight = size / rows;
    for (let row = 0; row < rows; row += 1) {
      let x = -random() * size * 0.5;
      while (x < size) {
        const length = size * (0.38 + random() * 0.42);
        const tone = random();
        ctx.fillStyle =
          tone > 0.62
            ? `rgba(255, 246, 232, ${0.18 + random() * 0.14})`
            : tone > 0.3
              ? `rgba(228, 210, 188, ${0.12 + random() * 0.14})`
              : `rgba(208, 186, 160, ${0.1 + random() * 0.12})`;
        ctx.fillRect(x, row * rowHeight, length, rowHeight);
        // Butt joint: a soft seam with a pale bevel next to it.
        ctx.fillStyle = "rgba(150, 120, 92, 0.32)";
        ctx.fillRect(x, row * rowHeight, 2, rowHeight);
        ctx.fillStyle = "rgba(255, 250, 240, 0.5)";
        ctx.fillRect(x + 2, row * rowHeight, 2, rowHeight);
        for (let grain = 0; grain < 4; grain += 1) {
          ctx.strokeStyle = `rgba(188, 162, 132, ${0.06 + random() * 0.05})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          const y = row * rowHeight + 5 + random() * (rowHeight - 10);
          ctx.moveTo(x + 4, y);
          ctx.bezierCurveTo(x + length * 0.3, y + 2.5, x + length * 0.6, y - 2.5, x + length - 4, y);
          ctx.stroke();
        }
        x += length;
      }
      // Long seam between rows, with a highlight on the lower board's edge.
      ctx.fillStyle = "rgba(146, 116, 88, 0.34)";
      ctx.fillRect(0, row * rowHeight, size, 3);
      ctx.fillStyle = "rgba(255, 250, 240, 0.55)";
      ctx.fillRect(0, row * rowHeight + 3, size, 2);
    }
  });
  repeat(wood, 5, 3.6);

  // Pale warm porcelain tile.
  const tile = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#ded5c8";
    ctx.fillRect(0, 0, size, size);
    const cells = 4;
    const cell = size / cells;
    for (let x = 0; x < cells; x += 1) {
      for (let y = 0; y < cells; y += 1) {
        const tone = 236 + Math.floor(random() * 10);
        ctx.fillStyle = `rgb(${tone}, ${tone - 5}, ${tone - 13})`;
        ctx.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(x * cell + 6, y * cell + 6, cell * 0.5, cell * 0.08);
      }
    }
  });
  repeat(tile, 3, 3);

  // Large pale stone pavers for the garden nook.
  const stone = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#cfc6b8";
    ctx.fillRect(0, 0, size, size);
    const rows = 3;
    const rowHeight = size / rows;
    for (let row = 0; row < rows; row += 1) {
      const offset = row % 2 === 0 ? 0 : size / 4;
      for (let col = -1; col < 3; col += 1) {
        const tone = 222 + Math.floor(random() * 14);
        ctx.fillStyle = `rgb(${tone}, ${tone - 6}, ${tone - 16})`;
        ctx.fillRect(offset + col * (size / 2) + 4, row * rowHeight + 4, size / 2 - 8, rowHeight - 8);
      }
    }
  });
  repeat(stone, 2, 2);

  // White subway tile for the kitchen backsplash.
  const backsplash = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#ddd6cb";
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const cols = 4;
    const h = size / rows;
    const w = size / cols;
    for (let row = 0; row < rows; row += 1) {
      const offset = row % 2 === 0 ? 0 : w / 2;
      for (let col = -1; col <= cols; col += 1) {
        const tone = 246 + Math.floor(random() * 6);
        ctx.fillStyle = `rgb(${tone}, ${tone - 3}, ${tone - 9})`;
        ctx.fillRect(offset + col * w + 2, row * h + 2, w - 4, h - 4);
      }
    }
  });
  repeat(backsplash, 6, 1);

  const rug = rugTexture(random, {
    field: "#d98e73",
    border: "#c9795d",
    band: "#f3e6d4",
    pattern: "diamond",
  });
  const rugSage = rugTexture(random, {
    field: "#b4c6ac",
    border: "#8fae88",
    band: "#eef0e4",
    pattern: "diamond",
  });
  const rugCream = rugTexture(random, {
    field: "#efe6d8",
    border: "#e0d2bf",
    band: "#f8f3ea",
    pattern: "plain",
  });
  const rugLines = rugTexture(random, {
    field: "#ece6dc",
    border: "#d9d1c4",
    band: "#f6f2ea",
    pattern: "lines",
  });
  const rugBlush = rugTexture(random, {
    field: "#efd9cc",
    border: "#e2bfae",
    band: "#f8eee6",
    pattern: "plain",
  });

  const rugIvory = rugTexture(random, {
    field: "#f4ecdd",
    border: "#e7d9c3",
    band: "#faf5ec",
    pattern: "quiet",
  });

  // Concentric jute weave for round rugs.
  const rugJute = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#d9c4a0";
    ctx.fillRect(0, 0, size, size);
    for (let r = size / 2; r > 0; r -= 9) {
      ctx.strokeStyle = r % 18 === 0 ? "rgba(160, 128, 86, 0.28)" : "rgba(255, 244, 222, 0.22)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Pale, friendly UI on every screen.
  const screen = makeTexture(512, (ctx, size) => {
    const background = ctx.createLinearGradient(0, 0, size, size);
    background.addColorStop(0, "#dbeaf8");
    background.addColorStop(1, "#c4dbf1");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#8fb3e2";
    ctx.fillRect(0, 0, size, 46);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(18, 16, 90, 14);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(28, 76, 300, 180);
    ctx.fillRect(348, 76, 136, 380);
    ctx.fillRect(28, 276, 300, 180);
    ctx.fillStyle = "#9cc0ea";
    ctx.fillRect(48, 100, 140, 14);
    ctx.fillStyle = "#c9d9ea";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(48, 132 + i * 22, 240 - i * 26, 9);
    }
    ctx.fillStyle = "#e9a88f";
    ctx.fillRect(48, 300, 70, 70);
    ctx.fillStyle = "#a8c9a3";
    ctx.fillRect(132, 300, 70, 70);
    ctx.fillStyle = "#c9d9ea";
    for (let i = 0; i < 8; i += 1) {
      ctx.fillRect(366, 100 + i * 40, 100, 14);
    }
  });

  // Overlapping soft circles (terracotta + sage) on cream.
  const posterA = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#f6efe4";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#e9c9b4";
    ctx.fillRect(size * 0.1, size * 0.55, size * 0.8, size * 0.35);
    ctx.fillStyle = "#d4876a";
    ctx.beginPath();
    ctx.arc(size * 0.38, size * 0.38, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9db495";
    ctx.beginPath();
    ctx.arc(size * 0.62, size * 0.62, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(246, 239, 228, 0.35)";
    ctx.beginPath();
    ctx.arc(size * 0.62, size * 0.62, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });

  // Stacked arches.
  const posterB = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#f3ece0";
    ctx.fillRect(0, 0, size, size);
    const arch = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + w / 2);
      ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      ctx.fill();
    };
    arch(size * 0.18, size * 0.16, size * 0.5, size * 0.66, "#a8bfa3");
    arch(size * 0.42, size * 0.36, size * 0.4, size * 0.46, "#d98e73");
    ctx.fillStyle = "#e7c27d";
    ctx.beginPath();
    ctx.arc(size * 0.74, size * 0.22, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
  });

  // Rolling hills line print.
  const posterC = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#f4efe6";
    ctx.fillRect(0, 0, size, size);
    const hill = (y: number, amp: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, size);
      ctx.lineTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y - amp, size * 0.6, y + amp, size, y - amp * 0.4);
      ctx.lineTo(size, size);
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = "#efc9a8";
    ctx.beginPath();
    ctx.arc(size * 0.68, size * 0.32, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    hill(size * 0.55, 60, "#c9d6c0");
    hill(size * 0.68, 50, "#9db495");
    hill(size * 0.82, 40, "#6f8f6a");
  });

  // What the window looks out on: soft sky and treetops.
  const windowView = makeTexture(512, (ctx, size) => {
    const sky = ctx.createLinearGradient(0, 0, 0, size);
    sky.addColorStop(0, "#cfe4ee");
    sky.addColorStop(0.65, "#e6f0ef");
    sky.addColorStop(1, "#d8e6dc");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 9; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(126, 160, 128, 0.85)" : "rgba(152, 184, 146, 0.85)";
      ctx.beginPath();
      ctx.arc(random() * size, size * (0.78 + random() * 0.2), size * (0.1 + random() * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
  });

  return {
    sunPatch,
    concrete,
    wood,
    tile,
    stone,
    backsplash,
    rug,
    rugSage,
    rugCream,
    rugLines,
    rugBlush,
    rugIvory,
    rugJute,
    screen,
    posterA,
    posterB,
    posterC,
    windowView,
  };
}

export const textures = createTextures();
