# Persona 3D 模型 · 参考图 prompt

给图像生成用。2026-11-26 起草。用途：把 `lab/persona-model/` 里的基础模型一步步捏成她。模型每一步都要拿这些图从正面、侧面、背面对照（`npm run lab:model:check` 生成的三视图对照表），所以图要**能量**：正交、不透视、同一比例、平光。

现有的人物设定图（三视图）已经是 A 字站姿、同比例，身体比例、衣服就用它量。这里只补它缺的三样：**摘掉帽子的发型**（帽子把头顶和发型轮廓挡住了）、**头部特写转面**（脸和头发要比全身图精细得多）、**帽子单独的转面**。

## 通用要求（每张都一样）

| 项 | 要求 |
| --- | --- |
| 参考 | 生成时把人物设定图（`reference-sheet.webp`）作为参考图一起给 |
| 相机 | 正交视角（orthographic），镜头和眼睛同高，**没有透视变形**，不要仰拍俯拍 |
| 对齐 | 同一张图里的几个视角**同样大小**、头顶对齐、脚底（或下巴）落在同一条水平线上 |
| 光 | 平光，几乎没有阴影，没有轮廓光、没有高光反射 |
| 背景 | 纯白 #FFFFFF，平涂，无地面、无投影、无文字、无标注线 |
| 表情 | 中性、闭嘴、眼睛平视前方 |

## 1. 全身三视图，不戴帽子

```text
A clean character turnaround model sheet of the attached original character, for a 3D modeller. Three views side by side on one wide canvas: front view, right side view (facing right), back view. Orthographic projection with no perspective, camera at eye level. All three views exactly the same scale, aligned so the top of the head and the soles of the feet sit on the same horizontal lines.

Pose: a relaxed A-pose, arms straight and angled about 35 degrees away from the body, hands open with fingers together and palms facing the thighs, feet slightly apart and parallel, standing straight, neutral face looking straight ahead, mouth closed.

Keep her design exactly as in the reference — honey-blonde chin-length bob with side-swept bangs, the small dusty-pink ribbon bow in her hair, the oversized grey-lavender cable-knit cardigan with dark buttons, the white shirt with a soft collar and thin dusty-pink ribbon tie, the grey, lavender and pink plaid pleated skirt, white socks and brown loafers — but WITHOUT the bucket hat, so the whole hairstyle, the top of the head and the parting are visible.

Flat even lighting with almost no shading, no rim light, no specular highlights. Clean line art with flat colours. Plain flat white background, no floor, no shadow, no text, no labels, no guide lines.
```

## 2. 头部特写转面，不戴帽子

```text
A head turnaround sheet of the attached original character for a 3D modeller: the head and neck only, down to the collarbones, five views in one row on one wide canvas — front, three-quarter front (turned 45 degrees to her left), right side profile (facing right), three-quarter back, and back. Orthographic projection, camera at eye level, all five heads exactly the same size with the top of the head and the chin aligned on the same horizontal lines.

Keep her design exactly as in the reference: honey-blonde chin-length bob with side-swept bangs, warm brown eyes, the small dusty-pink ribbon bow in her hair on her right side, the white shirt collar with the thin dusty-pink ribbon tie. No bucket hat: the whole hairstyle, the parting and the way the hair falls at the back and sides must be clearly readable in every view.

Neutral calm face, eyes open looking straight ahead in each view, mouth closed. Flat even lighting with almost no shading, no rim light. Clean line art with flat colours. Plain flat white background, no text, no labels, no guide lines.
```

## 3. 帽子单独转面

```text
A prop turnaround sheet of the white bucket hat from the attached character reference, the hat alone with no head inside it, five views in one row on one wide canvas: front, right side, back, top-down view, and a three-quarter view from slightly above. Orthographic projection, all views the same scale. Keep it exactly as in the reference: white bucket hat with a short soft downward brim, one pale-blue and one dusty-pink stripe around the crown. Flat even lighting, no shadow, clean line art with flat colours, plain flat white background, no text, no labels.
```

## 不要（如果工具有反向提示词栏）

```text
perspective, foreshortening, dynamic pose, tilted head, smile, open mouth, blush, dramatic lighting, cast shadow, floor, gradient background, text, labels, arrows, measurement lines, extra accessories, different hairstyle, long hair, ponytail, hat (for sheets 1 and 2), colour changes to the outfit
```

## 生成之后

1. 挑一张：几个视角大小一致、对齐；发型和设定图一致；侧面确实是正侧面。
2. 存到 `inputs/source/persona/model/`（不进仓库），告诉维护者，说明是第几张。
3. 维护者会把它接进三视图对照表，然后从「比例」开始捏。
