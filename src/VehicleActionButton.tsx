import type {ButtonHTMLAttributes} from 'react';
import {Plus,Undo2,ArrowUpRight} from 'lucide-react';
type Props=ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'start'|'return';card?:boolean};
export default function VehicleActionButton({variant='start',card=false,className='',children,type='button',...props}:Props){
 const Icon=variant==='return'?Undo2:Plus;
 return <button {...props} type={type} className={`vehicle-action vehicle-action-${variant}${card?' vehicle-action-card':''}${className?' '+className:''}`}><span className="vehicle-action-icon" aria-hidden="true"><Icon size={21} strokeWidth={2}/></span><span className="vehicle-action-label">{children||(variant==='return'?'คืนรถ':'บันทึกใช้รถ')}</span>{variant==='start'&&<ArrowUpRight className="vehicle-action-arrow" size={19} aria-hidden="true"/>}</button>;
}
