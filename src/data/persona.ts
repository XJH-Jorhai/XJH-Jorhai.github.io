// Persona 页的文案与素材索引。
// 文字全部取自用户提供的《Persona 页面视觉设计方向稿》和人物设定图上的标注；没有另外编写人物的名字、
// 年龄或性格设定（未提供的不写）。色值是从设定图色卡上取样得到的，不是官方色号。
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
  concept: ['Persona', 'Visual identity', 'Concept 01'],
  claim: { en: ['Soft Character,', 'Bold Expression.'], zh: '柔和的人物，强烈的表达。' },
  keeper: 'xjh_jorhai',
  statement: ['温柔不必以', '温柔的方式呈现。'],
  body: [
    '角色自身是温暖、亲切、细腻的：浅金色短发、柔和的粉色装饰、灰紫色的服饰，以及平静而略带好奇的神情。',
    '页面不必延续这种柔和。高对比的配色、有力量感的字、鲜明的几何结构与非对称的构图，让人物与环境之间产生有意识的视觉冲突——这种冲突不是需要消除的不协调，而是这一页最重要的视觉特征。',
  ],
  principles: [
    { zh: '对比', en: 'Contrast', text: '温柔与锐利、安静与喧闹、具象与抽象。' },
    { zh: '张力', en: 'Tension', text: '构图具有方向性、冲突感和视觉力量。' },
    { zh: '秩序', en: 'Order', text: '大胆的视觉表现依然建立在明确的排版逻辑之上。' },
    { zh: '个性', en: 'Character', text: '具有鲜明的个人审美，不依赖通用博客模板。' },
    { zh: '克制', en: 'Restraint', text: '不是每个元素都需要吸引注意力，视觉重点应当明确。' },
  ],
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
  paletteLine: '让一个温柔的人物，拥有一套并不温柔的视觉语言。',
  details: [
    { ...asset('detail', 'hat'), zh: '渔夫帽', en: 'Bucket hat' },
    { ...asset('detail', 'bow'), zh: '发结', en: 'Hair bow' },
    { ...asset('detail', 'collar'), zh: '领口', en: 'Collar' },
    { ...asset('detail', 'knit'), zh: '针织', en: 'Knit' },
    { ...asset('detail', 'plaid'), zh: '格纹', en: 'Plaid' },
    { ...asset('detail', 'shoes'), zh: '鞋袜补充', en: 'Shoes & socks' },
  ],
  closing: ['让人物保持温柔，', '让设计大胆表达。'],
  back: assets.head.find(item => item.id === 'back')!,
};
