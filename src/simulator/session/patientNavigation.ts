import { ARCHITECTURE_COLLIDERS, SCENE_MANIFEST } from '../sceneManifest';
import { getRoomColliders, type GroundPoint, type RoomCollider } from '../RoomMovement';
import type { SimulatorState } from '../types';

export function pointBlocked(p: GroundPoint, colliders: RoomCollider[], radius = .22) {
  return colliders.some(c => c.kind === 'circle' ? Math.hypot(p.x-c.x,p.z-c.z) < c.radius+radius :
    Math.hypot(p.x-Math.max(c.minX,Math.min(c.maxX,p.x)), p.z-Math.max(c.minZ,Math.min(c.maxZ,p.z))) < radius);
}
export function patientColliders(state: SimulatorState, changingClosed: boolean, controlClosed: boolean) {
  return [...ARCHITECTURE_COLLIDERS,...getRoomColliders(state,1.6,controlClosed,changingClosed,false,true,true,false)];
}
/** A navigation graph sampled from the same geometry used for collision/rendering.
 * Edges are swept-tested, so diagonal corner cutting and closed-door traversal are impossible. */
export function findPatientRoute(start: GroundPoint, end: GroundPoint, colliders: RoomCollider[]): GroundPoint[] | null {
  const { bounds, navigation } = SCENE_MANIFEST, step=navigation.spacing;
  const key=(p:GroundPoint)=>Math.round((p.x-bounds.minX)/step)+','+Math.round((p.z-bounds.minZ)/step);
  const snap=(p:GroundPoint)=>({x:bounds.minX+Math.round((p.x-bounds.minX)/step)*step,z:bounds.minZ+Math.round((p.z-bounds.minZ)/step)*step});
  const clear=(a:GroundPoint,b:GroundPoint)=>{
    const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.06));
    for(let i=0;i<=n;i++) if(pointBlocked({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n},colliders,navigation.patientRadius)) return false;
    return true;
  };
  if(!clear(end,end)) return null;
  const from=snap(start),goal=snap(end),open=[key(from)];
  const points=new Map<string,GroundPoint>([[key(from),from]]),g=new Map([[key(from),0]]),previous=new Map<string,string>(),closed=new Set<string>();
  while(open.length && closed.size<5000) {
    open.sort((a,b)=>(g.get(a)!+Math.hypot(points.get(a)!.x-goal.x,points.get(a)!.z-goal.z))-(g.get(b)!+Math.hypot(points.get(b)!.x-goal.x,points.get(b)!.z-goal.z)));
    const id=open.shift()!,p=points.get(id)!;
    if(Math.hypot(p.x-end.x,p.z-end.z)<.38&&clear(p,end)){
      const route:GroundPoint[]=[end];let cursor:string|undefined=id;
      while(cursor){route.unshift(points.get(cursor)!);cursor=previous.get(cursor);}
      route[0]=start;
      // Visibility-based simplification retains obstacle-clear edges.
      const simple=[start];let i=0;
      while(i<route.length-1){let j=route.length-1;while(j>i+1&&!clear(route[i],route[j]))j--;simple.push(route[j]);i=j;}
      return simple.slice(1);
    }
    closed.add(id);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const q={x:p.x+dx*step,z:p.z+dz*step},qid=key(q);
      if(closed.has(qid)||q.x<bounds.minX+.25||q.x>bounds.maxX-.25||q.z<bounds.minZ+.25||q.z>bounds.maxZ-.25||!clear(p,q))continue;
      const score=g.get(id)!+Math.hypot(dx,dz)*step;
      if(score<(g.get(qid)??Infinity)){g.set(qid,score);previous.set(qid,id);points.set(qid,q);if(!open.includes(qid))open.push(qid);}
    }
  }
  return null;
}
