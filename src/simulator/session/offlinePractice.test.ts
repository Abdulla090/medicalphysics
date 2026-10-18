import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { downloadPractice, isPracticeAvailableOffline } from './offlinePractice';
const put=vi.fn(),match=vi.fn(),fetchMock=vi.fn();
beforeEach(()=>{
 vi.clearAllMocks();
 vi.stubGlobal('caches',{open:vi.fn().mockResolvedValue({put,match}),keys:vi.fn().mockResolvedValue(['radiography-practice-0123456789abcdef'])});
 vi.stubGlobal('fetch',fetchMock);Object.defineProperty(navigator,'serviceWorker',{value:{},configurable:true});
 match.mockResolvedValue(undefined);put.mockResolvedValue(undefined);
});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
it('caches only validated public files and marks readiness after the final file',async()=>{
 const files=['/index.html','/assets/room.js','/assets/font.woff2','/radiography/patient.glb'];
 fetchMock.mockResolvedValue({ok:true}).mockResolvedValueOnce({ok:true,json:async()=>({version:'0123456789abcdef',files})});
 const progress=vi.fn();await downloadPractice(progress);
 expect(put.mock.calls.map(call=>call[0])).toEqual([...files,'/.practice-ready']);
 expect(progress).toHaveBeenLastCalledWith(4,4);
 for(const file of files)expect(fetchMock).toHaveBeenCalledWith(file,{credentials:'omit'});
});
it('never marks a partial download ready',async()=>{
 fetchMock.mockResolvedValue({ok:false}).mockResolvedValueOnce({ok:true,json:async()=>({version:'0123456789abcdef',files:['/index.html','/assets/room.js']})});
 await expect(downloadPractice()).rejects.toThrow('Practice download incomplete');
 expect(put).not.toHaveBeenCalledWith('/.practice-ready',expect.anything());
});
it('rejects API paths, path traversal and malformed manifests',async()=>{
 for(const path of ['/api/student','/assets/../private.json','https://example.com/private.json']){
  fetchMock.mockResolvedValue({ok:true,json:async()=>({version:'0123456789abcdef',files:[path]})});
  await expect(downloadPractice()).rejects.toThrow('Invalid practice manifest');
 }
 expect(put).not.toHaveBeenCalled();
});
it('checks actual cached readiness, including when storage is unavailable',async()=>{
 expect(await isPracticeAvailableOffline()).toBe(false);
 match.mockResolvedValue({});expect(await isPracticeAvailableOffline()).toBe(true);
 match.mockRejectedValue(new Error('Storage blocked'));expect(await isPracticeAvailableOffline()).toBe(false);
});
