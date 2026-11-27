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

## 4. 脸部贴图（改画，不是重新生成）

模型的脸是三张展开的贴图，位置和形状都对应着 3D 脸上的固定位置，所以**只能在原图上改画，图的尺寸、每个部件的位置和形状、背景颜色都不能动**。用图像编辑：把下面的原图作为输入图，参考图（头部转面 `head-turnaround.webp`、刘海正面 `fringe-front.webp`）作为风格参考一起给。原图由维护者从基础模型导出（VRoid 示例模型，许可允许修改和再发布）。

**4a · 脸（`face-skin.png`，1024×1024）**：嘴、鼻子、腮红。

```text
Edit this exact image and keep everything outside the small changes below pixel-for-pixel the same. It is the unwrapped face texture of a 3D anime character (1024×1024): the large pale face area in the middle, ear shapes in the corners, two eye-hole shapes, a nose mark and a straight mouth line. Keep the image size, the layout, the position and shape of every part, the eye holes and the colours outside the face exactly as they are.

Only change these, in the style of the attached head reference: replace the straight mouth line with a small, closed, gentle smile — one thin warm-brown line of about the same width and in the same place, its corners turned up very slightly; make the nose a tiny short warm line in the same place; keep the two soft round blush patches under the eye holes but make them faint warm peach. Skin a warm peach like the reference. Flat anime colours, no texture or noise, no shading, no new features, no lips, no teeth.
```

**4b · 虹膜（`eye-iris.png`，1024×512）**：两只虹膜。

```text
Edit this exact image and keep the image size, the black background, and the position, size and oval shape of both irises exactly. It is the iris texture of a 3D anime character: two irises on black.

Repaint each iris in the style of the attached head reference: a warm honey-amber brown, darker brown at the top (under the upper lash), lighter golden amber towards the bottom, a dark brown round pupil in the centre, a thin dark brown rim, a few soft lighter flecks in the lower half. No white highlight dots (the model adds its own highlights). Clean anime rendering, flat with soft gradients, no photorealistic texture. Both irises the same.
```

**4c · 睫毛（`eye-lashes.png`，1024×256）**：上睫毛线和眼皮的线。

```text
Edit this exact image and keep the image size, the dark background colour, and the positions of all shapes exactly. It is the eyelash texture of a 3D anime character: two dark upper lash lines, and above each a pale eyelid-crease shape.

Reshape only the two dark lash lines, in the style of the attached head reference: a clean, fairly thick upper lash line in dark warm brown, thickest at the outer end where it finishes in a short flick outwards and slightly down, thinning towards the inner corner, with a soft lower edge. Keep the pale crease shapes above them as they are. Flat anime colours, no individual hairs, nothing else added.
```

改好之后：三张都保持原来的尺寸存成 PNG，放到 `inputs/source/persona/model/face/`（不进仓库），告诉维护者。维护者会把它们换到模型上，从正面、3/4、侧面对照参考图检查，并确认眨眼时睫毛和眼皮仍然对得上。

## 不要（如果工具有反向提示词栏）

```text
perspective, foreshortening, dynamic pose, tilted head, smile, open mouth, blush, dramatic lighting, cast shadow, floor, gradient background, text, labels, arrows, measurement lines, extra accessories, different hairstyle, long hair, ponytail, hat (for sheets 1 and 2), colour changes to the outfit
```

## 生成之后

1. 挑一张：几个视角大小一致、对齐；发型和设定图一致；侧面确实是正侧面。
2. 存到 `inputs/source/persona/model/`（不进仓库），告诉维护者，说明是第几张。
3. 维护者会把它接进三视图对照表，然后从「比例」开始捏。
