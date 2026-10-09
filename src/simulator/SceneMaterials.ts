import { useEffect, useMemo } from 'react';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

type Surface = 'terrazzo' | 'ceiling' | 'carbon' | 'timber' | 'vinyl' | 'plaster' | 'soil' | 'rubber' | 'oak' | 'quartz' | 'acoustic' | 'skin' | 'hair';

/** Deterministic, small material maps: the teaching environment works offline. */
export function useSurfaceTexture(surface: Surface) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      let seed = 19427;
      const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      ctx.fillStyle = { terrazzo: '#bfc2bd', ceiling: '#e6e7e2', carbon: '#343d41', timber: '#a98b6d', vinyl: '#adbab4', plaster: '#e8e8e0', soil: '#655d49', rubber: '#43504c', oak: '#b1a18a', quartz: '#ebede8', acoustic: '#7e938f', skin: '#b89076', hair: '#34302d' }[surface];
      ctx.fillRect(0, 0, 512, 512);
      if (surface === 'skin') {
        // Skin microvariation is intentionally subtle at the simulator's scale.
        for (let i = 0; i < 26000; i++) {
          const warm = random() > 0.4;
          ctx.fillStyle = warm ? `rgba(102,52,42,${0.01 + random() * 0.035})` : `rgba(250,214,192,${0.015 + random() * 0.06})`;
          ctx.beginPath(); ctx.ellipse(random() * 512, random() * 512, 0.5 + random() * 2.5, 0.4 + random() * 1.4, 0, 0, Math.PI * 2); ctx.fill();
        }
      } else if (surface === 'hair') {
        for (let i = 0; i < 3600; i++) {
          ctx.strokeStyle = random() < 0.5 ? 'rgba(177,155,119,.058)' : 'rgba(10,7,7,.13)';
          ctx.lineWidth = 0.4 + random();
          const y = random() * 512;
          ctx.beginPath(); ctx.moveTo(0, y);
          ctx.bezierCurveTo(142, y + random() * 7, 370, y - random() * 7, 512, y + random() * 8); ctx.stroke();
        }
      } else if (surface === 'quartz') {
        for (let i = 0; i < 18000; i++) {
          const x = random() * 512, y = random() * 512;
          const dark = random() < 0.2;
          ctx.fillStyle = dark ? 'rgba(72,83,82,0.16)' : 'rgba(255,255,255,0.52)';
          ctx.fillRect(x, y, 0.5 + random() * (dark ? 1.1 : 3), 0.5 + random() * 1.3);
        }
        ctx.strokeStyle = 'rgba(123,136,133,.075)'; ctx.lineWidth = 0.7;
        for (let i = 0; i < 17; i++) {
          const y = random() * 512;
          ctx.beginPath(); ctx.moveTo(-15, y);
          ctx.bezierCurveTo(145, y + random() * 35 - 17, 350, y + random() * 65 - 32, 530, y + random() * 25 - 12);
          ctx.stroke();
        }
      } else if (surface === 'oak') {
        // Quarter-sawn oak: warm directional pores, small growth-ring irregularity.
        for (let i = 0; i < 1250; i++) {
          const x = random() * 512;
          const thickness = 0.2 + random() * 2;
          ctx.strokeStyle = random() < 0.42 ? `rgba(76,58,43,${0.025 + random() * 0.15})` : `rgba(251,233,207,${0.035 + random() * 0.20})`;
          ctx.lineWidth = thickness;
          ctx.beginPath(); ctx.moveTo(x, -5);
          ctx.bezierCurveTo(x + random() * 13 - 6, 140, x + random() * 12 - 6, 344, x + random() * 12 - 6, 520);
          ctx.stroke();
        }
        for (let i = 0; i < 1500; i++) {
          ctx.fillStyle = 'rgba(80,61,49,.08)';
          ctx.fillRect(random() * 512, random() * 512, 0.3 + random(), 2 + random() * 11);
        }
      } else if (surface === 'acoustic') {
        for (let i = 0; i < 24000; i++) {
          ctx.fillStyle = random() > 0.55 ? 'rgba(15,43,37,0.08)' : 'rgba(233,244,228,0.12)';
          ctx.beginPath(); ctx.arc(random() * 512, random() * 512, 0.25 + random() * 1.25, 0, Math.PI * 2); ctx.fill();
        }
      } else if (surface === 'vinyl') {
        // Directional linoleum grain and low-contrast welded seams. No photo assets or downloads.
        for (let i = 0; i < 17500; i++) {
          const x = random() * 512, y = random() * 512, size = random() * 2.5 + 0.25;
          ctx.fillStyle = random() < 0.5 ? 'rgba(63,85,78,0.052)' : 'rgba(239,248,239,0.087)';
          ctx.fillRect(x, y, size, 0.4 + random() * 1.4);
        }
        ctx.strokeStyle = 'rgba(61,85,77,0.17)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(512, 1); ctx.moveTo(1, 0); ctx.lineTo(1, 512); ctx.stroke();
        ctx.strokeStyle = 'rgba(248,250,240,0.32)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(512, 5); ctx.moveTo(5, 0); ctx.lineTo(5, 512); ctx.stroke();
      } else if (surface === 'terrazzo') {
        for (let i = 0; i < 9500; i++) {
          const x = random() * 512;
          const y = random() * 512;
          const radius = 0.3 + random() * 1.7;
          ctx.fillStyle = ['#8f9690', '#e3e5df', '#acb0a9', '#9ca29c', '#d1cabe'][i % 5];
          ctx.globalAlpha = 0.25 + random() * 0.35;
          ctx.beginPath();
          ctx.ellipse(x, y, radius, radius * 0.6, random() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(91,101,94,0.16)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, 511, 511);
      } else if (surface === 'carbon') {
        for (let y = 0; y < 512; y += 8) {
          for (let x = 0; x < 512; x += 8) {
            const horizontal = (x / 8 + y / 8) % 4 < 2;
            ctx.fillStyle = horizontal ? '#3d474a' : '#2e363a';
            ctx.fillRect(x, y, 7, 7);
            ctx.strokeStyle = horizontal ? '#495257' : '#374146';
            ctx.lineWidth = 0.7;
            for (let line = 1; line < 7; line += 2) {
              ctx.beginPath();
              ctx.moveTo(x + (horizontal ? 0 : line), y + (horizontal ? line : 0));
              ctx.lineTo(x + (horizontal ? 7 : line), y + (horizontal ? line : 7));
              ctx.stroke();
            }
          }
        }
      } else if (surface === 'timber') {
        for (let i = 0; i < 900; i++) {
          ctx.strokeStyle = `rgba(${i % 2 ? '66,45,26' : '223,192,149'},${0.03 + random() * 0.12})`;
          ctx.lineWidth = 0.3 + random() * 1.2;
          const x = random() * 512;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.bezierCurveTo(x + random() * 12, 170, x - random() * 10, 350, x + random() * 4, 512);
          ctx.stroke();
        }
      } else if (surface === 'plaster') {
        // Fine aggregate and very faint roller texture: a wall should still read as white.
        for (let i = 0; i < 12000; i++) {
          ctx.fillStyle = random() < 0.5 ? 'rgba(84,103,90,0.045)' : 'rgba(255,255,247,0.28)';
          ctx.fillRect(random() * 512, random() * 512, 0.4 + random() * 1.5, 0.5 + random() * 3);
        }
        for (let i = 0; i < 35; i++) {
          const x = random() * 512;
          ctx.strokeStyle = 'rgba(134,143,128,0.035)';
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + random() * 4 - 2, 512); ctx.stroke();
        }
      } else if (surface === 'soil') {
        for (let i = 0; i < 14500; i++) {
          const x = random() * 512, y = random() * 512;
          const radius = 0.35 + random() * 2.6;
          ctx.fillStyle = ['#83785b', '#494737', '#9b977b', '#787c5d', '#4b5941'][i % 5];
          ctx.globalAlpha = 0.24 + random() * 0.4;
          ctx.beginPath(); ctx.ellipse(x, y, radius, radius * 0.55, random() * 6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (surface === 'rubber') {
        for (let i = 0; i < 20000; i++) {
          const brightness = random() > 0.53 ? 225 : 26;
          ctx.fillStyle = `rgba(${brightness},${brightness},${brightness},${0.013 + random() * 0.045})`;
          ctx.fillRect(random() * 512, random() * 512, 1.25, 0.65);
        }
        for (let x = 0; x < 512; x += 64) {
          ctx.fillStyle = 'rgba(220,233,224,.035)';
          ctx.fillRect(x + 0.5, 0, 1, 512);
        }
      } else {
        for (let i = 0; i < 17000; i++) {
          ctx.fillStyle = `rgba(73,82,76,${0.02 + random() * 0.055})`;
          ctx.fillRect(random() * 512, random() * 512, 1, 1);
        }
        ctx.strokeStyle = '#c9cec8';
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, 509, 509);
        ctx.strokeStyle = '#f4f5f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(4, 4, 504, 504);
      }
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    result.wrapS = result.wrapT = RepeatWrapping;
    const repeats = { terrazzo: [6, 6], ceiling: [8, 8], carbon: [2, 6], timber: [1, 1], vinyl: [3, 3], plaster: [3, 2], soil: [3, 2], rubber: [2, 2], oak: [1, 1], quartz: [2, 2], acoustic: [2, 2], skin: [1, 1], hair: [1, 1] }[surface];
    result.repeat.set(repeats[0], repeats[1]);
    result.anisotropy = 8;
    return result;
  }, [surface]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
