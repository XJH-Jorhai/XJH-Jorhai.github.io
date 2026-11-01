# Piston Letter Studio

Source: https://github.com/XJH-Jorhai/piston-letter-studio

Pinned revision: `f4e4619eaafa825c296c61312a150a177009f5cf` (v1.2.0).

`src/piston-letters.js`, `src/default-config.js`, and the eight Minecraft PNG textures are copied byte for byte from that revision. No audio, player, editor or export libraries are included.

The blog reuses the original configuration, frameState and minecraftParts exports. `src/lib/scene/PistonGolem.ts` adapts its exact isometric projection, texture crops and shading to the blog's existing Three.js renderer and Motion scheduler. The original custom element is not instantiated on the visitor page, so it creates no additional context or frame loop.

Minecraft Java Edition 1.21.4 textures belong to Mojang / Microsoft. See `assets/minecraft/README.md` for their fixed source and attribution. This is not an official Minecraft product.
