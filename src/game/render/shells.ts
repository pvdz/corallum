// The shells of the Sunlit sand, drawn by kind at the origin (base at y = 0, about 12 s wide):
// on the sand, and on the line's shelf in the panel.

export function drawShellShape(ctx: CanvasRenderingContext2D, id: string, colour: string, s: number): void {
  ctx.fillStyle = colour;
  ctx.strokeStyle = 'rgba(90,60,40,0.5)';
  ctx.lineWidth = 0.6 * s;
  const sh = { colour };
  ctx.save();
    ctx.lineJoin = 'round';
    const dark = 'rgba(90,60,40,0.55)';
    ctx.beginPath();
    if (id === 'scallop') {
      // A fan of ribs from the hinge.
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 6 * s, Math.PI * 1.1, Math.PI * 1.9);
      ctx.closePath();
      ctx.fill();
      for (let k = 0; k < 7; k++) { const a = Math.PI * (1.13 + k * 0.105); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 6 * s, Math.sin(a) * 6 * s); }
      ctx.stroke();
      ctx.fillRect(-1.6 * s, -0.8 * s, 3.2 * s, 1.4 * s);
    } else if (id === 'sand-dollar') {
      // A flat disc with a five-petalled star.
      ctx.ellipse(0, -1.2 * s, 5.5 * s, 2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = dark;
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 1.6 * s, -1.2 * s + Math.sin(a) * 0.6 * s, 0.9 * s, 0.35 * s, a, 0, Math.PI * 2); ctx.stroke(); }
    } else if (id === 'auger' || id === 'cone' || id === 'tusk') {
      // A long tapering spire (auger: banded; cone: wide shoulder; tusk: a smooth curved horn).
      if (id === 'tusk') {
        ctx.moveTo(-6 * s, -1 * s);
        ctx.quadraticCurveTo(0, -5 * s, 6 * s, -2.5 * s);
        ctx.lineTo(6 * s, -1.6 * s);
        ctx.quadraticCurveTo(0, -3.4 * s, -6 * s, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        const wide = id === 'cone' ? 3.2 : 2.2;
        ctx.moveTo(-6 * s, -0.2 * s);
        ctx.lineTo(4 * s, -wide * s * 0.2);
        ctx.lineTo(6 * s, -wide * s * 0.6);
        ctx.lineTo(4 * s, -wide * s * 1.1);
        ctx.lineTo(-6 * s, -wide * s * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = dark;
        for (let k = 1; k < 5; k++) { const x = -6 * s + k * 2.2 * s; ctx.beginPath(); ctx.moveTo(x, -0.1 * s); ctx.lineTo(x + 0.8 * s, -wide * s * 0.85); ctx.stroke(); }
      }
    } else if (id === 'conch' || id === 'murex') {
      // A heavy spiral with a flared lip; the murex grows spines.
      ctx.moveTo(-6 * s, -1 * s);
      ctx.quadraticCurveTo(-2 * s, -7 * s, 5 * s, -3 * s);
      ctx.quadraticCurveTo(6 * s, 0, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = id === 'conch' ? '#ffd8c8' : '#f0e8e0';
      ctx.beginPath();
      ctx.ellipse(1 * s, -1.6 * s, 2.6 * s, 1.2 * s, -0.3, 0, Math.PI * 2);
      ctx.fill();
      if (id === 'murex') {
        ctx.strokeStyle = sh?.colour ?? '#d8c8b8';
        ctx.lineWidth = 0.9 * s;
        for (let k = 0; k < 6; k++) { const x = -5 * s + k * 1.8 * s; ctx.beginPath(); ctx.moveTo(x, -3 * s - Math.sin(k) * s); ctx.lineTo(x - 0.6 * s, -6 * s - (k % 2) * s); ctx.stroke(); }
      }
    } else if (id === 'moon-snail' || id === 'nautilus' || id === 'top') {
      // A round whorl with its spiral drawn in (nautilus: striped; top: a cone of whorls).
      if (id === 'top') {
        ctx.moveTo(-5 * s, 0);
        ctx.lineTo(0, -7 * s);
        ctx.lineTo(5 * s, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = dark;
        for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-5 * s + k * 1.3 * s, -k * 1.75 * s); ctx.lineTo(5 * s - k * 1.3 * s, -k * 1.75 * s + 0.6 * s); ctx.stroke(); }
      } else {
        const R = id === 'nautilus' ? 5 : 4;
        ctx.arc(0, -R * s, R * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = dark;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 5; a += 0.2) { const rr = R * s * (1 - a / (Math.PI * 5.5)); const px = Math.cos(a) * rr * 0.9, py = -R * s + Math.sin(a) * rr * 0.9; if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
        ctx.stroke();
        if (id === 'nautilus') {
          ctx.strokeStyle = 'rgba(170,90,60,0.6)';
          ctx.lineWidth = 1.1 * s;
          for (let k = 0; k < 5; k++) { const a = Math.PI * (0.6 + k * 0.22); ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.5 * s, -R * s + Math.sin(a) * R * 0.5 * s); ctx.lineTo(Math.cos(a) * R * s, -R * s + Math.sin(a) * R * s); ctx.stroke(); }
        }
      }
    } else {
      // Cowrie and olive: a glossy egg, spotted (cowrie) or smooth with a slit.
      ctx.ellipse(0, -2.4 * s, 5.5 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(-1.5 * s, -3.8 * s, 2.4 * s, 0.9 * s, -0.2, 0, Math.PI * 2);
      ctx.fill();
      if (id === 'cowrie') {
        ctx.fillStyle = 'rgba(90,50,30,0.5)';
        for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(-3.5 * s + k * 1.2 * s, -2 * s + Math.sin(k * 2.3) * 1.2 * s, 0.45 * s, 0, Math.PI * 2); ctx.fill(); }
      }
    }
  ctx.restore();
}
