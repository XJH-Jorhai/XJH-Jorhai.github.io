// Persona 页的文案与素材索引。
// 文字只有人物设定图上的标注和各部分的名称；方向稿里的设计主张属于给维护者的说明（AGENTS.md /
// design.md），不在页面上展示（2026-11-26 用户要求）。没有另外编写人物的名字、年龄或性格设定。色值是从设定图色卡上取样得到的，不是官方色号。
import assets from './persona.assets.json';

const hex = (id: string) => assets.palette.find(swatch => swatch.id === id)!.hex;
const asset = (group: 'view' | 'mood' | 'detail', id: string) => assets[group].find(item => item.id === id)!;

export const persona = {
  figure: assets.figure,
  // Eye-follow layers (home Persona & About page): placed in % of the figure, the iris travel in % of
  // the eye box. See scripts/process-persona.mjs and persona-stage.ts.
  eyes: assets.eyes.map(({ box, range, white, iris }) => {
    const [x, y, w, h] = box as [number, number, number, number], [left, right, up, down] = range as [number, number, number, number];
    const pct = (v: number, of: number) => `${(v / of * 100).toFixed(4)}%`;
    return { white, iris, style: `left:${pct(x, assets.figure.width)};top:${pct(y, assets.figure.height)};width:${pct(w, assets.figure.width)};height:${pct(h, assets.figure.height)};--rl:${pct(left, w)};--rr:${pct(right, w)};--ru:${pct(up, h)};--rd:${pct(down, h)}` };
  }),
  figureAlt: '原创角色的立姿像：戴白色渔夫帽、系粉色蝴蝶结的蜜金色短发女性，穿灰紫色针织开衫、白衬衫配粉色细丝带和格纹短裙；一只手插在开衫口袋里，另一只手两指扶着帽檐，神情平静。',
  // The home Persona cover's lines: the sections of /persona/ they open.
  coverLines: [
    { id: 'turnaround', zh: '三视图', en: 'Turnaround' },
    { id: 'moods', zh: '六种表情', en: 'Six moods' },
    { id: 'outfit', zh: '服饰细节', en: 'Outfit' },
  ],
  keeper: 'xjh_jorhai',
  views: [
    { ...asset('view', 'front'), zh: '正面', en: 'Front', alt: '人物正面全身：渔夫帽、针织开衫、格纹短裙、白色短袜与棕色乐福鞋。' },
    { ...asset('view', 'side'), zh: '侧面', en: 'Side', alt: '人物侧面全身，面向右侧。' },
    { ...asset('view', 'back'), zh: '背面', en: 'Back', alt: '人物背面全身，可见开衫背面的绞花纹。' },
  ],
  moods: [
    { ...asset('mood', 'calm'), zh: '平静', en: 'Calm' },
    { ...asset('mood', 'curious'), zh: '好奇', en: 'Curious' },
    { ...asset('mood', 'happy'), zh: '开心', en: 'Happy' },
    { ...asset('mood', 'serious'), zh: '认真', en: 'Serious' },
    { ...asset('mood', 'shy'), zh: '害羞', en: 'Shy' },
    { ...asset('mood', 'surprised'), zh: '惊讶', en: 'Surprised' },
  ],
  palette: [
    { role: '发色', name: '蜜金色', hex: hex('hair') },
    { role: '瞳色', name: '暖棕色', hex: hex('eye') },
    { role: '基础色', name: '象牙白', hex: hex('base') },
    { role: '点缀粉', name: '灰粉色', hex: hex('pink') },
    { role: '点缀青', name: '淡青色', hex: hex('cyan') },
    { role: '外套色', name: '灰薰衣紫', hex: hex('coat') },
  ],
  loud: [
    { name: '纸白', hex: '#F3EDE2' },
    { name: '深蓝', hex: '#083366' },
    { name: '信号红', hex: '#EF3025' },
  ],
  details: [
    { ...asset('detail', 'hat'), zh: '渔夫帽', en: 'Bucket hat' },
    { ...asset('detail', 'bow'), zh: '发结', en: 'Hair bow' },
    { ...asset('detail', 'collar'), zh: '领口', en: 'Collar' },
    { ...asset('detail', 'knit'), zh: '针织', en: 'Knit' },
    { ...asset('detail', 'plaid'), zh: '格纹', en: 'Plaid' },
    { ...asset('detail', 'shoes'), zh: '鞋袜补充', en: 'Shoes & socks' },
  ],
  back: assets.head.find(item => item.id === 'back')!,
};
