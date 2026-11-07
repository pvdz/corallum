// The Rasp, drawn the same wherever they swim or sleep: parrotfish in profile.

/**
 * One Rasp in profile (facing +x, length `len` from the middle to the snout): a parrotfish's
 * deep body under a blunt brow, long dorsal and anal fins, a fan tail with a pale margin, a
 * beating pectoral fin, a fine net of scales, a stripe from the beak to the eye, and the beak
 * itself: two plates of fused teeth.
 */
export function drawParrotfish(ctx: CanvasRenderingContext2D, len: number, hue: number, beat: number, s: number, elder = false): void {
  const L = len;
  // The elder: colour gone out of it, the beak worn to a stub, the eye half shut.
  const sat = elder ? 0.35 : 1, lift = elder ? 18 : 0;
  const tail = Math.sin(beat) * L * 0.12;
  // Fins behind the body: dorsal along the back, anal under the rear, the tail.
  ctx.fillStyle = `hsla(${hue + 10},${34 * sat}%,${34 + lift}%,0.85)`;
  ctx.beginPath();
  ctx.moveTo(L * 0.42, -L * 0.4);
  ctx.quadraticCurveTo(-L * 0.1, -L * 0.62, -L * 0.72, -L * 0.24);
  ctx.lineTo(-L * 0.6, -L * 0.14);
  ctx.quadraticCurveTo(-L * 0.1, -L * 0.42, L * 0.42, -L * 0.3);
  ctx.closePath();
  ctx.moveTo(-L * 0.08, L * 0.38);
  ctx.quadraticCurveTo(-L * 0.4, L * 0.48, -L * 0.7, L * 0.22);
  ctx.lineTo(-L * 0.6, L * 0.12);
  ctx.closePath();
  // The tail: a fan, its trailing edge a shallow curve.
  ctx.moveTo(-L * 0.8, -L * 0.12);
  ctx.lineTo(-L * 1.34, -L * 0.44 + tail);
  ctx.quadraticCurveTo(-L * 1.22, tail * 0.6, -L * 1.34, L * 0.44 + tail);
  ctx.lineTo(-L * 0.8, L * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `hsla(${hue + 50},55%,72%,0.55)`;
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(-L * 1.34, -L * 0.44 + tail);
  ctx.quadraticCurveTo(-L * 1.22, tail * 0.6, -L * 1.34, L * 0.44 + tail);
  ctx.stroke();
  // The body: a blunt brow over the beak, the back arched, a slim wrist before the tail.
  const body = ctx.createLinearGradient(0, -L * 0.5, 0, L * 0.5);
  body.addColorStop(0, `hsl(${hue},${36 * sat}%,${40 + lift}%)`);
  body.addColorStop(0.6, `hsl(${hue + 12},${34 * sat}%,${36 + lift * 0.6}%)`);
  body.addColorStop(1, `hsl(${hue + 24},${30 * sat}%,${46 - lift * 0.4}%)`);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(L * 0.9, -L * 0.16);
  ctx.bezierCurveTo(L * 0.8, -L * 0.48, L * 0.2, -L * 0.54, -L * 0.3, -L * 0.36);
  ctx.quadraticCurveTo(-L * 0.62, -L * 0.22, -L * 0.84, -L * 0.13);
  ctx.lineTo(-L * 0.84, L * 0.13);
  ctx.quadraticCurveTo(-L * 0.5, L * 0.26, -L * 0.1, L * 0.42);
  ctx.bezierCurveTo(L * 0.4, L * 0.5, L * 0.8, L * 0.34, L * 0.9, L * 0.14);
  ctx.quadraticCurveTo(L * 0.98, 0, L * 0.9, -L * 0.16);
  ctx.fill();
  // Scales: a fine net of small arcs over the flank, faint.
  ctx.strokeStyle = elder ? 'rgba(235,240,245,0.28)' : `hsla(${hue + 30},40%,72%,0.16)`;
  ctx.lineWidth = 0.7 * s;
  ctx.beginPath();
  for (let row = -1; row <= 1; row++) {
    for (let q = 0; q < 5; q++) {
      const cx = -L * 0.5 + q * L * 0.22 + (row & 1) * L * 0.11, cy = row * L * 0.17;
      const r = L * 0.09;
      ctx.moveTo(cx + Math.cos(-1.1) * r, cy + Math.sin(-1.1) * r);
      ctx.arc(cx, cy, r, -1.1, 1.1);
    }
  }
  ctx.stroke();
  // The gill cover's edge, and the pectoral fin beating behind it.
  ctx.strokeStyle = `hsla(${hue + 20},30%,22%,0.5)`;
  ctx.lineWidth = 0.9 * s;
  ctx.beginPath();
  ctx.moveTo(L * 0.5, -L * 0.3);
  ctx.quadraticCurveTo(L * 0.38, 0, L * 0.5, L * 0.28);
  ctx.stroke();
  const flap = 0.35 + 0.25 * Math.sin(beat * 0.6);
  ctx.fillStyle = `hsla(${hue + 40},45%,70%,0.4)`;
  ctx.beginPath();
  ctx.ellipse(L * 0.3, L * 0.1, L * 0.22, L * 0.07, flap, 0, Math.PI * 2);
  ctx.fill();
  // A bright stripe from the beak back past the eye, as parrotfish wear.
  if (!elder) {
    ctx.strokeStyle = `hsla(${hue + 70},60%,68%,0.55)`;
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(L * 0.86, -L * 0.04);
    ctx.quadraticCurveTo(L * 0.7, -L * 0.22, L * 0.48, -L * 0.2);
    ctx.stroke();
  }
  // The beak: two plates of fused teeth, pale as bone, the mouth line between them.
  ctx.fillStyle = elder ? 'hsl(45,20%,78%)' : '#ece6d4';
  ctx.beginPath();
  if (elder) {
    // Worn down to a blunt, chipped stub.
    ctx.moveTo(L * 0.86, -L * 0.14);
    ctx.lineTo(L * 1.0, -L * 0.08);
    ctx.lineTo(L * 0.97, -L * 0.02);
    ctx.lineTo(L * 1.01, L * 0.06);
    ctx.lineTo(L * 0.86, L * 0.13);
    ctx.closePath();
    ctx.fill();
  } else {
  ctx.moveTo(L * 0.86, -L * 0.17);
  ctx.quadraticCurveTo(L * 1.16, -L * 0.12, L * 1.12, L * 0.01);
  ctx.lineTo(L * 0.88, L * 0.01);
  ctx.closePath();
  ctx.moveTo(L * 0.88, L * 0.04);
  ctx.lineTo(L * 1.08, L * 0.04);
  ctx.quadraticCurveTo(L * 1.06, L * 0.15, L * 0.86, L * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,52,40,0.55)';
  ctx.lineWidth = 0.6 * s;
  ctx.beginPath();
  ctx.moveTo(L * 0.86, L * 0.025);
  ctx.lineTo(L * 1.1, L * 0.025);
  ctx.stroke();
  }
  // The eye, ringed.
  ctx.fillStyle = `hsl(${hue + 60},50%,72%)`;
  ctx.beginPath();
  ctx.arc(L * 0.6, -L * 0.17, L * 0.095, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a0a10';
  ctx.beginPath();
  ctx.arc(L * 0.61, -L * 0.17, L * 0.06, 0, Math.PI * 2);
  ctx.fill();
  if (elder) {
    // A heavy lid over the top half.
    ctx.fillStyle = `hsl(${hue},${36 * sat}%,${40 + lift}%)`;
    ctx.beginPath();
    ctx.arc(L * 0.6, -L * 0.17, L * 0.1, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  }
}
