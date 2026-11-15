export const workThemes = {
 a: {name:'Porcelain & Copper',scheme:'light',base:'#F2F1EC',surface:'#E7E6DF',text:'#202321',muted:'#666D68',line:'#D3D5CD',accent:'#965E42',secondary:'#4C6B63'},
 b: {name:'Mineral Fog',scheme:'light',base:'#ECEFEE',surface:'#DDE3E1',text:'#20282C',muted:'#59696D',line:'#C9D1D0',accent:'#586F80',secondary:'#A7755A'},
 paper: {name:'Watercolor Paper',scheme:'light',base:'#F3EDE2',surface:'#EAE2D3',text:'#1D2733',muted:'#615F58',line:'#D6CDBC',accent:'#083366',secondary:'#EF3025'},
 c: {name:'Graphite Gallery',scheme:'dark',base:'#191D1D',surface:'#262D2C',text:'#F1F0E9',muted:'#AFB7B2',line:'#404A48',accent:'#CEA383',secondary:'#90ABA1'},
} as const;
export type WorkTheme = keyof typeof workThemes;
