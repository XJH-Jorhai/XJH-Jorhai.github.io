# Persona 3D 模型 · 交接说明

给接手继续捏模型的协作者（另一个 AI 代理或人）。先读完这一页、`README.md`（每一步做了什么、为什么）和仓库根目录的 `AGENTS.md`。改完之后由维护者验收，验收标准见文末。

## 在哪里

- 仓库：`XJH-Jorhai/XJH-Jorhai.github.io`
- 原型目录：`lab/persona-model/`（正式站点不受影响，用户确认前不要把模型放进 `src/`）
- 当前进度在分支 `claude/keen-bohr-un7b8r`，PR #24。**建议做法**：等 PR #24 合并后，从最新 `main` 新建自己的分支，改完开 PR，PR 描述里写清楚改了哪一步、怎么验收的。不要直接推 `main`，不要改写别人的分支历史。
- 在线预览（只有用户自己能打开）：https://claude.ai/artifact/VVoC7jz7muhuzbHFN2WfzE

## 怎么跑

```sh
npm ci
npm run lab:model         # 构建原型到 lab/persona-model/dist/（第一次会下载基础模型到 .cache/）
npx vite preview --outDir lab/persona-model/dist --port 4390   # 打开 http://127.0.0.1:4390/
npm run lab:model:check   # 验收图 → reports/evidence/persona-model/（需要 Playwright 的 Chromium；可用 BROWSER_EXECUTABLE 指定）
npm run check             # 提交前必须 0 errors 0 warnings
```

`?shot` 打开时隐藏界面，`window.__model` 提供 `view(角度, 正交?, 距离, 眼高, 目标高)`、`setHat(on)`、`landmarks()`、`vrm`，给无头渲染用。

## 文件

| 文件 | 管什么 |
| --- | --- |
| `main.ts` | 场景、相机、三渲二配色（`teisu()`：阴影偏深蓝、细红轮廓光、深蓝描边）、A 字站姿、呼吸眨眼、视线跟随、按钮 |
| `shape.ts` | 身材比例（小腿缩短）、头发：剪成波波头、每缕发梢收尖、C 形鼓起再内卷、前额发束梳成刘海、发色、发片描边宽度 |
| `clothes.ts` | 开衫（由基础模型的 T 恤细分改成，V 领、纽扣、袖子收成气球袖再接袖管）、衬衫和领子、蝴蝶结和飘带、格纹百褶裙、袜子、鞋的颜色 |
| `headwear.ts` | 刘海下面那层深色底发、发结、渔夫帽（可摘）；另外铺的发束刘海已停用（`extraFringe`，会像两种头发叠在一起） |
| `turntable.mjs` | 验收渲染：八角度、三视图对照、上半身 / 头 / 腿近景 |
| `build.mjs`、`template.html` | 构建 |

所有尺寸都是基础模型静止姿势下的米数，旁边的注释写了是怎么从设定图量出来的。改数值时同样写清楚依据。

## 参考图

- 公开的：`public/media/persona/view-front.webp`、`view-side.webp`、`view-back.webp`（戴帽子的三视图，`turntable.mjs` 拿它对照）。
- 私有的（不在仓库里，`inputs/source/` 被 git 忽略）：`inputs/source/persona/model/head-turnaround.webp`（头部五个角度，不戴帽子）、`hat-turnaround.webp`（帽子）、`body-turnaround-nohat.webp`（不戴帽子的全身三视图）。需要的话向用户要，放到同样的路径；**不要提交它们**。

## 必须遵守

1. **人形先行，不从零建网格去贴合某一张图。** 之前一次尝试照一张侧面照片建模，结果只在那一个角度像，换个角度不是人形。所有改动都在基础模型上做：从已有表面长出来、按量过的尺寸变形、或者围着她搭真实的 3D 形状再绑到骨骼上。
2. **挂到骨骼上的东西要抵消骨骼自身的静止旋转**（见 `clothes.ts` 和 `headwear.ts` 里的 `carry`），否则侧面看会歪、会翘出去。
3. **不要重画、不要改人物设定。** 发型、服装、配色照设定图；不给人物编名字或性格。
4. 三渲二只用站点的颜色体系（纸白、深蓝、信号红 + 人物自己的配色），不要模糊、不要写实高光。
5. 原型只放在 `lab/persona-model/`；临时脚本和截图放仓库外或 `reports/evidence/`（已忽略）。

## 还要做的（按优先级）

1. **头发**：卷和蓬松已经有了（第 7 步）；还差刘海最外侧一两缕从头发里翘出来，以及头顶的发旋和分缝（参考图头顶有一道从后往前的分缝）。
2. **领口**：V 领上角还有两小块深色（开衫描边从领口里面露出来）。
3. **鞋头**：乐福鞋的颜色、鞋底、横带都有了，但鞋头还是运动鞋偏扁的轮廓。
4. 之后才做：脸（贴图和表情，要先请用户画表情参考图）、动作、交互、进入正式站点。

## 验收标准（维护者会照这个查）

- `npm run check` 0 errors 0 warnings；`npm run lab:model` 能构建；页面打开无控制台错误。
- `npm run lab:model:check` 生成的每一张图：
  - 八角度和三视图：从每个角度都是完整的人形，比例和设定图对得上。
  - 近景（上半身 24 张、头 12 张、腿 12 张）：**衣服之间没有缝、看不到衣服里面、没有悬空的零件、没有穿模**。远看对、近看有缝也不算完成。
- 改动有说明：哪个数值改成多少、依据是什么（写在代码注释和 `README.md` 的进度里）。
- 正式站点（`src/`、`public/`）没有改动；没有提交私有参考图和截图。
