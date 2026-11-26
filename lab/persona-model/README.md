# Persona 3D 模型原型（本地）

把首页和 `/persona/` 的人物做成一个可以转动、会看人的三渲二模型。先在这里一步步捏，用户确认后再进正式站点。正式站点暂时不受影响。

```sh
npm run lab:model         # 构建到 lab/persona-model/dist/（第一次会下载基础模型到 .cache/）
npx vite preview --outDir lab/persona-model/dist   # 或任意静态服务器打开 dist/index.html
npm run lab:model:check   # 八角度环绕图 + 三视图对照表 → reports/evidence/persona-model/
```

## 原则

1. **人形先行。** 起点是现成的二次元基础模型：pixiv 的 VRoid 示例模型 `VRM1_Constraint_Twist_Sample`（VRM 联盟示例仓库，[VRM Public License 1.0](https://vrm.dev/licenses/1.0/)，模型自带的许可写明：允许修改并再发布、允许商用、不需要署名）。不从零捏网格去贴一张图——那样只在一个角度像，转过去就不是人（之前一次尝试的教训）。
2. **每一步八个角度验收。** `lab:model:check` 渲染 0°–315° 八个角度，以及正交的正面 / 侧面 / 背面，和人物设定图的三视图并排。任何一个角度不成立，这一步就不算完成。
3. **只改量得到的东西，一次一件。** 顺序：比例 → 发型与帽子 → 衣服 → 脸（贴图，表情换贴图）→ 动起来（眨眼、呼吸、头发和裙摆）→ 交互。参考图的 prompt 在 `inputs/persona-model-prompts.md`。

## 现在（第 1 步：人形）

- 基础模型原样（还不像她），A 字站姿、呼吸、眨眼，眼睛和一点头部跟着指针，头发弹簧。
- 三渲二着色换成站点的颜色：阴影偏深蓝（保留一点材质本色），细细的红色轮廓光，深蓝描边。「TEISU 色调」按钮可以切回模型原来的颜色对比。
- 拖动转视角，滚轮缩放；正面 / 侧面 / 背面按钮，自转。

生成的 `dist/` 和 `.cache/` 不提交。
