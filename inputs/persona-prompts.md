# Persona 主视觉 · 绘画 prompt

给图像生成用。2026-11-17 起草。用户当天按此生成了 v2（透明背景，1024×1536，单手插袋、两指扶帽檐），已存为 `inputs/source/persona/key-visual-v2.webp` 并上线；以后再换图也按这里的要求。

## 要什么

- **只画人物，不画海报。** 色块、斜条、大字「PERSONA」都由网页自己排（可动、可响应屏幕、文字清晰）。图里只要人物本身，背景越干净越好抠。
- **人物不变，气质变。** 服装、发型、配色严格沿用人物设定图；表情和姿态从「温柔、好奇」收成「冷静、收敛、有点酷的姐姐」。
- **生成时把人物设定图（`reference-sheet.webp`）作为参考图一起给。** 这比文字描述更能锁住服装细节。

## 规格

| 项 | 要求 |
| --- | --- |
| 画幅 | 竖幅 2:3（如 1024×1536），能给多大给多大；有 2× 放大就放大一次 |
| 取景 | 头顶到膝盖（帽子和双手完整在画内，四周留白） |
| 背景 | 首选**透明背景 PNG**；做不到就用**纯色平涂绿 #00B140**：无渐变、无地面、无投影、无光晕 |
| 画面 | 画内不要任何文字、标志、色块、线条、装饰 |

## 主 prompt（英文，直接复制）

```text
A full-colour anime character illustration of an original character, three-quarter body from the top of the hat down to just below the knees, standing, for a fashion editorial key visual. Use the attached character reference sheet for her design and keep every costume detail exactly as shown.

Character: a young woman in her early twenties with a composed, cool, self-possessed presence — the calm older-sister type. Honey-blonde chin-length bob with side-swept bangs falling slightly over one eye, warm brown eyes with a level, steady, slightly half-lidded gaze straight at the viewer, mouth closed with at most the faintest hint of a smile, no blush. Tall, slim, relaxed posture.

Outfit (must match the reference): a white bucket hat with one pale-blue and one dusty-pink stripe around the crown; a small dusty-pink ribbon bow clipped in her hair on her right side; an oversized grey-lavender cable-knit cardigan with dark buttons, sleeves slightly long; a white shirt with a soft collar and a thin dusty-pink ribbon tie; a grey, lavender and pink plaid pleated skirt.

Pose: weight on one leg, body turned about 30 degrees to her left while her face turns back to the viewer; one hand in the cardigan pocket, the other hand lifting the brim of the hat with two fingers. Unhurried and confident, not cute, not playful.

Style: clean high-end anime illustration with crisp, even line art and restrained cel shading, two tones per material, matte surfaces, subtle soft rim light. Restrained palette: ivory, honey gold, grey-lavender, dusty pink, pale teal. Sharp, mature facial features. Editorial and calm, closer to a fashion magazine illustration than a game splash art.

Background: fully transparent. No background, no floor, no cast shadow, no text, no logo, no frame, no graphic shapes.
```

如果生成工具不支持透明背景，把最后一段换成：

```text
Background: a perfectly flat, uniform chroma-key green (#00B140) filling the whole canvas, with no gradient, no floor, no cast shadow, no glow and no texture. No text, no logo, no frame, no graphic shapes.
```

## 不要（如果工具有反向提示词栏）

```text
smiling broadly, open mouth, blushing, sparkles, chibi, childish proportions, big moe eyes, tears, winking, peace sign, heart hands, cleavage, short shorts, extra accessories, earrings, necklace, glasses, different hat, different hairstyle, long hair, ponytail, colour changes to the outfit, glossy plastic shading, heavy painterly texture, watercolor bleed, motion lines, speed lines, background scenery, text, watermark, signature, logo, border, cropped hat, cropped hands, cropped feet at the ankle
```

## 可换的姿态（主 prompt 里替换 Pose 一段）

- **A 双手插兜**：`Pose: both hands in the cardigan pockets, shoulders relaxed, weight on one leg, head tilted very slightly down while her eyes look up at the viewer.`
- **B 回头**：`Pose: body turned three-quarters away from the viewer, looking back over her shoulder at the viewer with a calm, unimpressed expression; one hand holding the hat brim against a light breeze.`
- **C 抱臂**：`Pose: arms loosely crossed, leaning back very slightly, chin a little raised, a calm level stare at the viewer.`

## 生成之后

1. 挑一张：脸冷静但不凶，服装细节对得上设定图，帽子和双手完整。
2. 存到 `inputs/source/persona/`（透明或绿底都行），告诉维护者。
3. 更新 `inputs/persona-recipe.json`（路径、哈希、背景方式；透明图用 `"background": "alpha"`，并按需要调 `alpha.floor`），运行 `npm run persona -- --debug <目录>`，在四种底色上检查边缘（尤其腿边：生成器常留一层很淡的背景雾），首页第 4 屏和 Persona 页会一起换上新图。
4. 新图的宽高比不同，两处的人物位置要复核：`home.css` 的 `.hp-figure` / `--fig`，`persona.css` 的 `--fig` / `--wl`（大字从人物身后接出去的位置）。

## 眼睛跟随鼠标需要的素材（可选，2026-11-24）

首页 Persona 与 About 那一屏现在已经有鼠标透视（各层不同深度、人物微转）。如果还想要「眼睛跟着鼠标看」，需要一张**去掉了瞳孔的同一张图**：网页会把原图里的虹膜和瞳孔剪下来，放在这张「只有眼白」的图上方，随鼠标在眼眶里移动几个像素。只有眼睛那一小块会被用到，其余部分不需要和原图完全一致，但构图、大小必须一样。

用图像编辑（不是重新生成）：把 `key-visual-v2.webp` 作为输入图，只改眼睛。

```text
Edit only the eyes of this exact image and change nothing else. Remove both irises and pupils completely, leaving only the whites of the eyes inside the same eyelid shapes. Keep the eyelids, eyelashes, eyelid lines, eyebrows, eye shape, face, hair, hat, lighting and every other pixel exactly as they are. The empty eye whites should have the same soft shading as in the original: a slightly darker band just under the upper eyelid and a gentle grey-lavender shadow toward the corners, no highlights, no glow. Keep the transparent background. Same canvas size (1024×1536), same position of everything.
```

交付：存到 `inputs/source/persona/`，告诉维护者。

**已完成（2026-11-24）**：用户交来的是一张只有双眼的特写（1946×808，不是整张图），存为 `key-visual-v2-eyes-plate.webp`。因为不是同一画布，处理时每只眼睛按眼眶范围单独对齐，并且只取虹膜下面那一块眼白；眼眶、虹膜都还是原图像素（配方 `eyes`，说明见 `RUNBOOK.md`）。以后换主视觉，按上面的 prompt 再要一张；整张图或特写都可以，特写要包含两只完整的眼眶。
