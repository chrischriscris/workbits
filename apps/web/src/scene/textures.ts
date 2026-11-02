import * as THREE from "three";
import { palette } from "../theme";

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
) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
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

export function createTextures() {
  const random = seeded(4217);

  const wood = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#c79a6b";
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const rowHeight = size / rows;
    for (let row = 0; row < rows; row += 1) {
      const offset = row % 2 === 0 ? 0 : size / 5;
      const shade = 0.94 + random() * 0.1;
      ctx.fillStyle = `rgba(255, 235, 205, ${0.06 + random() * 0.08})`;
      ctx.fillRect(0, row * rowHeight, size, rowHeight * shade);
      ctx.strokeStyle = "rgba(135, 96, 58, 0.32)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, row * rowHeight);
      ctx.lineTo(size, row * rowHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(offset, row * rowHeight);
      ctx.lineTo(offset, (row + 1) * rowHeight);
      ctx.stroke();
      for (let knot = 0; knot < 2; knot += 1) {
        const x = random() * size;
        const y = row * rowHeight + random() * rowHeight;
        ctx.strokeStyle = "rgba(166, 128, 82, 0.14)";
        ctx.beginPath();
        ctx.ellipse(x, y, 8 + random() * 10, 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "rgba(255,255,255,0.06)");
    gradient.addColorStop(1, "rgba(123,87,51,0.05)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  });
  repeat(wood, 3, 2.2);

  const tile = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#e0d4c3";
    ctx.fillRect(0, 0, size, size);
    const cells = 4;
    const cell = size / cells;
    for (let x = 0; x < cells; x += 1) {
      for (let y = 0; y < cells; y += 1) {
        const tone = 0.97 + random() * 0.05;
        ctx.fillStyle = `rgba(255, 253, 247, ${tone})`;
        ctx.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
      }
    }
    ctx.strokeStyle = "rgba(188, 178, 164, 0.36)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= cells; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(size, i * cell);
      ctx.stroke();
    }
  });
  repeat(tile, 3, 3);

  const rug = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#c9795d";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(251, 244, 231, 0.55)";
    ctx.fillRect(22, 22, size - 44, size - 44);
    ctx.fillStyle = "#d98e73";
    ctx.fillRect(40, 40, size - 80, size - 80);
    ctx.strokeStyle = "rgba(122, 70, 53, 0.28)";
    ctx.lineWidth = 5;
    ctx.strokeRect(52, 52, size - 104, size - 104);
    ctx.fillStyle = "rgba(251, 244, 231, 0.35)";
    for (let i = 0; i < 7; i += 1) {
      ctx.fillRect(90, 90 + i * 48, size - 180, 5);
    }
  });

  const rugSage = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#8fae88";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(251, 244, 231, 0.55)";
    ctx.fillRect(22, 22, size - 44, size - 44);
    ctx.fillStyle = "#a8bfa3";
    ctx.fillRect(40, 40, size - 80, size - 80);
    ctx.strokeStyle = "rgba(95, 120, 92, 0.28)";
    ctx.lineWidth = 5;
    ctx.strokeRect(52, 52, size - 104, size - 104);
    ctx.fillStyle = "rgba(251, 244, 231, 0.35)";
    for (let i = 0; i < 7; i += 1) {
      ctx.fillRect(90, 90 + i * 48, size - 180, 5);
    }
  });

  const rugCream = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#e3d6c4";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(251, 247, 241, 0.6)";
    ctx.fillRect(22, 22, size - 44, size - 44);
    ctx.fillStyle = "#e3d6c4";
    ctx.fillRect(40, 40, size - 80, size - 80);
    ctx.strokeStyle = "rgba(178, 158, 132, 0.35)";
    ctx.lineWidth = 5;
    ctx.strokeRect(52, 52, size - 104, size - 104);
    ctx.fillStyle = "rgba(255, 253, 248, 0.45)";
    for (let i = 0; i < 7; i += 1) {
      ctx.fillRect(90, 90 + i * 48, size - 180, 5);
    }
  });

  const screen = makeTexture(512, (ctx, size) => {
    const background = ctx.createLinearGradient(0, 0, size, size);
    background.addColorStop(0, "#2c4c6d");
    background.addColorStop(1, "#477399");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(207, 232, 239, 0.16)";
    ctx.fillRect(34, 34, size - 68, 28);
    ctx.fillStyle = "rgba(168, 191, 163, 0.9)";
    ctx.fillRect(34, 90, 150, 12);
    ctx.fillStyle = "rgba(255, 253, 247, 0.28)";
    ctx.fillRect(34, 120, 260, 8);
    ctx.fillRect(34, 140, 220, 8);
    ctx.fillRect(34, 160, 280, 8);
    ctx.fillStyle = "rgba(108, 140, 255, 0.9)";
    ctx.fillRect(34, 196, 104, 38);
    ctx.fillStyle = "rgba(217, 142, 115, 0.8)";
    ctx.fillRect(154, 196, 104, 38);
    ctx.fillStyle = "rgba(255, 253, 247, 0.2)";
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(34, 262 + i * 30, 300 - i * 34, 9);
    }
    ctx.fillStyle = "rgba(168, 191, 163, 0.45)";
    ctx.fillRect(size - 150, 90, 116, 116);
    ctx.fillStyle = "rgba(255, 253, 247, 0.3)";
    ctx.fillRect(size - 134, 106, 84, 10);
    ctx.fillRect(size - 134, 126, 64, 8);
    ctx.fillRect(size - 134, 144, 76, 8);
  });

  const posterA = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#fbf7f1";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#d98e73";
    ctx.beginPath();
    ctx.arc(size * 0.38, size * 0.42, size * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a8bfa3";
    ctx.beginPath();
    ctx.arc(size * 0.62, size * 0.58, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c6b7a";
    ctx.fillRect(size * 0.18, size * 0.72, size * 0.5, size * 0.04);
    ctx.fillRect(size * 0.18, size * 0.79, size * 0.34, size * 0.025);
  });

  const posterB = makeTexture(512, (ctx, size) => {
    ctx.fillStyle = "#e9f1ec";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#5c6b7a";
    ctx.fillRect(size * 0.16, size * 0.2, size * 0.3, size * 0.6);
    ctx.fillStyle = "#d98e73";
    ctx.fillRect(size * 0.5, size * 0.2, size * 0.12, size * 0.6);
    ctx.fillStyle = "#a8bfa3";
    ctx.fillRect(size * 0.66, size * 0.3, size * 0.18, size * 0.5);
    ctx.fillStyle = "rgba(46, 52, 64, 0.65)";
    ctx.fillRect(size * 0.16, size * 0.84, size * 0.34, size * 0.02);
  });

  return { wood, tile, rug, rugSage, rugCream, screen, posterA, posterB };
}

export const textures = createTextures();
