import { memo, useMemo } from 'react';
import { Object3D } from 'three';
import { WaitingChairs } from './WaitingChairs';
import { ClinicalCharacter } from './ClinicalCharacter';
import { DEFAULT_STATE } from './protocols';
import { WAITING_SEATS } from './sceneManifest';
import { Label } from './SceneAssets';
import { useLanguage } from '@/contexts/LanguageContext';

export const WaitingHall=memo(function WaitingHall({activePatientSeated=false}:{activePatientSeated?:boolean}){
 const {language}=useLanguage();
 const lightTarget=useMemo(()=>{const target=new Object3D();target.position.set(-1.1,.4,9.5);return target;},[]);
 return <group name="waiting-hall">
  <primitive object={lightTarget}/>
  <spotLight position={[-1.1,2.85,7.1]} target={lightTarget} intensity={18} angle={1.1} penumbra={.85} distance={8} decay={2} color="#fff4e5" castShadow shadow-mapSize={[1024,1024]} shadow-bias={-.0002} shadow-normalBias={.012} shadow-radius={3}/>
  <WaitingChairs/>
  {WAITING_SEATS.map((seat,index)=><group key={index}>{seat.person!==null&&!(activePatientSeated&&index===0)&&<group position={[seat.x,0,seat.z+.02]} rotation={[0,seat.yaw,0]}><ClinicalCharacter state={{...DEFAULT_STATE,patientSize:.93+(index%3)*.035,arms:'down'}} garment="outpatient" seated appearance={seat.person}/></group>}</group>)}
  <Label title={language==='ku'?'هۆڵی چاوەڕوانی':'Patient waiting'} detail={language==='ku'?'تکایە دانیشە. بانگت دەکرێت.':'PLEASE TAKE A SEAT. WE WILL CALL YOU.'} position={[-1.16,2.84,10.475]} rotation={[0,Math.PI,0]} width={2.35} height={.31}/>
 </group>;
});
export function RegistrationAlcove(){
 const {language}=useLanguage();
 const screenX=5.50;
 return <group name="registration-alcove">
  {[{z:3.66,length:.72},{z:5.995,length:.41}].map(({z,length})=><group key={z}>
   <mesh position={[screenX,.58,z]} castShadow><boxGeometry args={[.07,1.16,length]}/><meshStandardMaterial color="#d9dcd3" roughness={.84}/></mesh>
   <mesh position={[screenX,1.65,z]}><boxGeometry args={[.035,.97,length]}/><meshStandardMaterial color="#cbd6cc" transparent opacity={.62} roughness={.68}/></mesh>
   <mesh position={[screenX,2.16,z]}><boxGeometry args={[.075,.025,length]}/><meshStandardMaterial color="#637c71" metalness={.5} roughness={.5}/></mesh>
  </group>)}
  <mesh position={[screenX,2.35,4.9]}><boxGeometry args={[.055,.3,1.78]}/><meshStandardMaterial color="#284d44"/></mesh>
  <Label title={language==='ku'?'تۆمارکردن':'Registration'} detail={language==='ku'?'یەک نەخۆش لە هەر کاتێکدا':'ONE PATIENT AT A TIME'} position={[screenX-.038,2.35,4.9]} rotation={[0,-Math.PI/2,0]} width={1.65} height={.23} dark/>
 </group>;
}
