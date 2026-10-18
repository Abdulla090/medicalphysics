import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const executable=process.env.BLENDER_PATH || (process.platform==='win32'?'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe':'blender');
if(process.platform==='win32'&&!existsSync(executable))throw new Error('Set BLENDER_PATH to your Blender executable.');
const result=spawnSync(executable,['--background','--factory-startup','--python','scripts/build-clinical-characters.py'],{stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;
process.exitCode=result.status??1;
