import { useEffect, useMemo, useState } from 'react';
import { CanvasTexture, SRGBColorSpace, Texture, TextureLoader } from 'three';
import { Block, Label } from './SceneAssets';
import type { CapturedImage, SimulatorState } from './types';

/** A separate shielded radiographer workstation, visible through the imaging observation window. */
export function OperatorStation({ state, barrierClosed, exposing, image }: { state: SimulatorState; barrierClosed: boolean; exposing: boolean; image?: CapturedImage }) {
  const [pacsImage, setPacsImage] = useState<Texture | null>(null);
  useEffect(() => {
    if (!image) { setPacsImage(null); return; }
    let active = true;
    const imageSource = image.previewUrl;
    const loaded = new TextureLoader().load(imageSource, texture => {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
      if (active) setPacsImage(texture);
      else texture.dispose();
    });
    return () => {
      active = false;
      setPacsImage(previous => previous === loaded ? null : previous);
      loaded.dispose();
    };
  }, [image]);
  const screen = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 496;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#101e1d'; ctx.fillRect(0, 0, 768, 496);
      ctx.fillStyle = '#18332e'; ctx.fillRect(12, 12, 744, 45);
      ctx.fillStyle = '#b1dfcc'; ctx.font = 'bold 22px Arial'; ctx.fillText('RADIOGRAPHY  /  ACQUISITION', 32, 43);
      ctx.fillStyle = '#c7e2d7'; ctx.font = 'bold 38px Arial'; ctx.fillText(image ? 'IMAGE AVAILABLE' : exposing ? 'ACQUIRING...' : 'SYSTEM READY', 38, 122);
      ctx.fillStyle = '#8ba99e'; ctx.font = '22px Arial'; ctx.fillText('Synthetic training console', 38, 160);
      ctx.fillStyle = '#25473e'; ctx.fillRect(36, 192, 695, 2);
      for (const [i, name, value] of [['01', 'TUBE VOLTAGE', `${state.kvp} kVp`], ['02', 'CURRENT', `${state.ma} mA`], ['03', 'EXPOSURE TIME', `${state.exposureMs} ms`], ['04', 'PROTECTIVE DOOR', barrierClosed ? 'CLOSED' : 'OPEN']] as string[][]) {
        const index = Number(i) - 1;
        ctx.fillStyle = '#90ada1'; ctx.font = '22px Arial'; ctx.fillText(name, 39, 239 + index * 55);
        ctx.fillStyle = index === 3 && !barrierClosed ? '#e7b280' : '#e1f3e6'; ctx.font = 'bold 27px Arial'; ctx.textAlign = 'right';
        ctx.fillText(value, 719, 241 + index * 55); ctx.textAlign = 'left';
      }
      ctx.fillStyle = exposing ? '#dca353' : barrierClosed ? '#6ab78f' : '#dca353';
      ctx.fillRect(37, 455, 695, 8);
    }
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4;
    return texture;
  }, [state.kvp, state.ma, state.exposureMs, barrierClosed, exposing, image]);
  useEffect(() => () => screen.dispose(), [screen]);

  return <group position={[5.05, 0, -1.10]}>
    <Block position={[0, 0.75, 0]} size={[1.44, 0.055, 0.71]} color="#c8d3cd" radius={0.018} roughness={0.30} />
    {[-0.62, 0.62].map(x => <group key={x}>
      <Block position={[x, 0.36, -0.24]} size={[0.055, 0.72, 0.055]} color="#697d79" radius={0.01} metalness={0.65} />
      <Block position={[x, 0.36, 0.24]} size={[0.055, 0.72, 0.055]} color="#697d79" radius={0.01} metalness={0.65} />
    </group>)}
    <Block position={[0, 0.71, -0.26]} size={[1.38, 0.18, 0.10]} color="#52655e" radius={0.012} />
    <Block position={[-0.29, 1.07, -0.27]} size={[0.06, 0.63, 0.045]} color="#62726c" metalness={0.75} radius={0.01} />
    <Block position={[-0.29, 1.4, -0.32]} size={[0.9, 0.62, 0.055]} color="#243a38" metalness={0.35} radius={0.025} />
    <mesh position={[-0.29, 1.4, -0.282]}>
      <planeGeometry args={[0.84, 0.56]} />
      <meshBasicMaterial map={screen} toneMapped={false} />
    </mesh>
    <Block position={[0.48, 1.24, -0.30]} size={[0.44, 0.43, 0.048]} color="#253c3d" radius={0.02} metalness={0.3} />
    <mesh position={[0.48, 1.24, -0.27]}><planeGeometry args={[0.37, 0.36]} /><meshBasicMaterial color={pacsImage ? '#ffffff' : '#192a2a'} map={pacsImage} toneMapped={false} /></mesh>
    {!pacsImage && <Label title={image ? 'PACS / LOADING' : 'PACS / NO IMAGE'} position={[0.48, 1.23, -0.24]} dark small width={0.34} height={0.13} />}
    <Block position={[-0.19, 0.797, 0.16]} size={[0.61, 0.028, 0.21]} color="#52615b" radius={0.022} />
    {Array.from({ length: 4 }, (_, row) => Array.from({ length: 11 }, (_, key) => <Block key={row * 11 + key} position={[-0.48 + key * 0.056, 0.814, 0.075 + row * 0.037]} size={[0.043, 0.009, 0.025]} color="#a5beb1" radius={0.003} />))}
    <Block position={[0.40, 0.797, 0.19]} size={[0.15, 0.035, 0.22]} color="#b6c6bb" radius={0.05} />
    <Block position={[0.60, 0.80, -0.04]} size={[0.18, 0.09, 0.18]} color="#465d4d" radius={0.02} />
    <mesh position={[0.60, 0.851, -0.04]}><sphereGeometry args={[0.041, 24, 18]} /><meshStandardMaterial color={exposing ? '#ffb34d' : '#a1c99a'} emissive={exposing ? '#e28d39' : '#4e8a66'} emissiveIntensity={0.55} /></mesh>
    <Label title="EXPOSURE SWITCH" position={[0.60, 0.82, 0.063]} width={0.26} height={0.058} small />
    <group position={[0.9, 0, 0.55]}>
      <mesh position={[0, 0.48, 0]} castShadow><cylinderGeometry args={[0.27, 0.25, 0.09, 24]} /><meshStandardMaterial color="#384b47" roughness={0.7} /></mesh>
      <Block position={[0, 0.3, -0.22]} size={[0.08, 0.49, 0.07]} color="#6c827a" metalness={0.5} />
      <Block position={[0, 0.53, -0.15]} size={[0.47, 0.08, 0.49]} color="#6a8176" radius={0.04} />
      <Block position={[0, 0.20, 0]} size={[0.43, 0.043, 0.43]} color="#81918b" radius={0.01} metalness={0.6} />
    </group>
    <Label title="SHIELDED OPERATOR CONTROL" detail="CLOSE DOOR / VERIFY PATIENT / PREPARE / EXPOSE" position={[0, 2.17, -0.48]} width={1.75} height={0.33} />
  </group>;
}
