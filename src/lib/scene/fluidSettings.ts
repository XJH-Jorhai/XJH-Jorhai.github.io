export const fluidControls = {
 force: {label:'Force', hint:'力源强度；先调这一项', min:0,max:180,step:1,value:10},
 radius: {label:'Source radius',hint:'输入光带宽度',min:.4,max:6,step:.05,value:6},
 drift: {label:'Throw',hint:'甩出距离与惯性输运',min:0,max:3,step:.05,value:1.3},
 damping: {label:'Motion damping',hint:'越大，运动越快停下',min:.2,max:3,step:.05,value:0.35},
 diffusion: {label:'Diffusion',hint:'光带向外散开的速度',min:0,max:40,step:1,value:7},
 fade: {label:'Fade rate',hint:'越大，光带越快消失',min:.15,max:2.5,step:.05,value:2.15},
 curl: {label:'Curl',hint:'局部卷曲强度',min:0,max:2,step:.05,value:0.45},
 brightness: {label:'Light intensity',hint:'只调亮度，不增加力',min:.2,max:2,step:.05,value:2},
 refraction: {label:'Refraction',hint:'封面内部折射强度',min:0,max:2,step:.05,value:0.3},
} as const;
export type FluidKey=keyof typeof fluidControls;
export type FluidSettings=Record<FluidKey,number>;
export const fluidDefaults=Object.fromEntries(Object.entries(fluidControls).map(([key,s])=>[key,s.value])) as FluidSettings;
export function sanitizeFluidSettings(input:unknown):FluidSettings{
 const result={...fluidDefaults};if(!input||typeof input!=='object')return result;
 for(const key of Object.keys(fluidControls) as FluidKey[]){const v=(input as Record<string,unknown>)[key],s=fluidControls[key];if(typeof v==='number'&&Number.isFinite(v))result[key]=Math.min(s.max,Math.max(s.min,v));}return result;
}
