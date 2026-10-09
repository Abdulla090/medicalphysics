import * as THREE from 'three';

export interface PatientMaterials {
  skin: THREE.MeshPhysicalMaterial;
  ghost: THREE.MeshStandardMaterial;
  fabric: THREE.MeshStandardMaterial;
  casualShirt: THREE.MeshStandardMaterial;
  trousers: THREE.MeshStandardMaterial;
  footwear: THREE.MeshStandardMaterial;
  piping: THREE.MeshStandardMaterial;
  eyelid: THREE.MeshStandardMaterial;
  iris: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  dispose: () => void;
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function texture(pixels: Uint8Array<ArrayBuffer>, size: number, repeat: number, color = false) {
  const result = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  result.repeat.set(repeat, repeat);
  result.magFilter = THREE.LinearFilter;
  result.minFilter = THREE.LinearMipmapLinearFilter;
  result.generateMipmaps = true;
  result.anisotropy = 4;
  result.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  result.needsUpdate = true;
  return result;
}

/** Original deterministic, tileable textures. Patient surface UVs use metres. */
export function createPatientMaterials(): PatientMaterials {
  const size = 512;
  const count = size * size;
  const color = new Uint8Array(count * 4);
  const relief = new Uint8Array(count * 4);
  const rough = new Uint8Array(count * 4);
  const pore = new Float32Array(count);
  const random = seededRandom(731409);
  // Each 8 cm tile contains fine, irregular pores; wrapping prevents texture seams.
  for (let i = 0; i < 15500; i++) {
    const cx = Math.floor(random() * size), cy = Math.floor(random() * size);
    const strength = 9 + random() * 18;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const distance = ox * ox + oy * oy;
      const index = ((cy + oy + size) % size) * size + (cx + ox + size) % size;
      pore[index] -= strength * Math.exp(-distance * 1.6);
    }
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const offset = (y * size + x) * 4;
    const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
    const broad = Math.sin(u * 3 + Math.cos(v * 2)) * 2.5 + Math.cos(u * 5 - v * 4) * 1.6;
    const mottling = Math.sin(u * 11 + Math.sin(v * 8) * 0.8) * 0.7;
    const fine = (random() - 0.5) * 3.5;
    const pigment = broad + mottling + fine + pore[y * size + x] * 0.055;
    color[offset] = 212 + pigment;
    color[offset + 1] = 178 + pigment * 0.91;
    color[offset + 2] = 157 + pigment * 0.84;
    color[offset + 3] = 255;
    const height = 137 + pore[y * size + x] + fine;
    const roughness = 191 + broad * 2.1 + fine * 3 - pore[y * size + x] * 0.28;
    for (let c = 0; c < 3; c++) {
      relief[offset + c] = Math.max(0, Math.min(255, height));
      rough[offset + c] = Math.max(0, Math.min(255, roughness));
    }
    relief[offset + 3] = rough[offset + 3] = 255;
  }
  const skinColor = texture(color, size, 12.5, true);
  const skinRelief = texture(relief, size, 12.5);
  const skinRoughness = texture(rough, size, 12.5);

  const weaveSize = 256;
  const weaveColor = new Uint8Array(weaveSize * weaveSize * 4);
  const weaveHeight = new Uint8Array(weaveColor.length);
  for (let y = 0; y < weaveSize; y++) for (let x = 0; x < weaveSize; x++) {
    const offset = (y * weaveSize + x) * 4;
    const warp = Math.cos(x * Math.PI / 4), weft = Math.cos(y * Math.PI / 4);
    const over = (Math.floor(x / 8) + Math.floor(y / 8)) % 2;
    const thread = (over ? warp * 0.7 + weft * 0.3 : weft * 0.7 + warp * 0.3) * 5;
    const fuzz = (random() - 0.5) * 2;
    weaveColor[offset] = 218 + thread + fuzz;
    weaveColor[offset + 1] = 225 + thread + fuzz;
    weaveColor[offset + 2] = 222 + thread + fuzz;
    weaveColor[offset + 3] = 255;
    weaveHeight[offset] = weaveHeight[offset + 1] = weaveHeight[offset + 2] = 140 + thread * 6;
    weaveHeight[offset + 3] = 255;
  }
  const fabricColor = texture(weaveColor, weaveSize, 50, true);
  const fabricBump = texture(weaveHeight, weaveSize, 50);

  const irisSize = 256;
  const irisPixels = new Uint8Array(irisSize * irisSize * 4);
  const hairPixels = new Uint8Array(irisSize * irisSize * 4);
  for (let y = 0; y < irisSize; y++) for (let x = 0; x < irisSize; x++) {
    const offset = (y * irisSize + x) * 4;
    const dx = (x + 0.5) / irisSize * 2 - 1, dy = (y + 0.5) / irisSize * 2 - 1;
    const radius = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
    const radial = Math.sin(angle * 87 + Math.sin(radius * 31) * 1.3) * 7 + Math.cos(angle * 143 - radius * 12) * 5;
    const limbal = Math.max(0, (radius - 0.76) / 0.24);
    const pupil = radius < 0.33;
    irisPixels[offset] = pupil ? 17 : 72 + radial - limbal * 44;
    irisPixels[offset + 1] = pupil ? 20 : 79 + radial - limbal * 43;
    irisPixels[offset + 2] = pupil ? 21 : 66 + radial - limbal * 36;
    irisPixels[offset + 3] = 255;
    const fiber = Math.sin(x * Math.PI / 2 + Math.sin(y / irisSize * Math.PI * 8) * 0.6) * 4;
    hairPixels[offset] = 43 + fiber;
    hairPixels[offset + 1] = 36 + fiber;
    hairPixels[offset + 2] = 31 + fiber;
    hairPixels[offset + 3] = 255;
  }
  const irisMap = texture(irisPixels, irisSize, 1, true);
  irisMap.wrapS = irisMap.wrapT = THREE.ClampToEdgeWrapping;
  const hairMap = texture(hairPixels, irisSize, 35, true);
  const skin = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: skinColor, bumpMap: skinRelief, bumpScale: 0.00013, roughnessMap: skinRoughness, roughness: 0.94, metalness: 0, clearcoat: 0.025, clearcoatRoughness: 0.76, side: THREE.DoubleSide });
  const ghost = new THREE.MeshStandardMaterial({ color: '#c6e0de', roughness: 0.78, transparent: true, opacity: 0.115, depthWrite: false, side: THREE.DoubleSide });
  const fabric = new THREE.MeshStandardMaterial({ color: '#8fbfc0', map: fabricColor, bumpMap: fabricBump, bumpScale: 0.0002, roughness: 0.93, side: THREE.DoubleSide });
  const casualShirt = new THREE.MeshStandardMaterial({ color: '#586e72', map: fabricColor, bumpMap: fabricBump, bumpScale: 0.00014, roughness: 0.91, side: THREE.DoubleSide });
  const trousers = new THREE.MeshStandardMaterial({ color: '#454e58', map: fabricColor, bumpMap: fabricBump, bumpScale: 0.00015, roughness: 0.97, side: THREE.DoubleSide });
  const footwear = new THREE.MeshStandardMaterial({ color: '#343d43', roughness: 0.68, metalness: 0.01 });
  const piping = new THREE.MeshStandardMaterial({ color: '#c5d5d0', roughness: 0.88 });
  const eyelid = new THREE.MeshStandardMaterial({ color: '#956b5d', roughness: 0.86 });
  const iris = new THREE.MeshStandardMaterial({ map: irisMap, roughness: 0.28 });
  const hair = new THREE.MeshStandardMaterial({ map: hairMap, roughness: 0.93 });
  const textures = [skinColor, skinRelief, skinRoughness, fabricColor, fabricBump, irisMap, hairMap];
  return { skin, ghost, fabric, casualShirt, trousers, footwear, piping, eyelid, iris, hair, dispose: () => {
    [skin, ghost, fabric, casualShirt, trousers, footwear, piping, eyelid, iris, hair].forEach(material => material.dispose());
    textures.forEach(item => item.dispose());
  } };
}
