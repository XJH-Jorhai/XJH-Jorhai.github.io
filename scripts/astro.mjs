// Keep all Astro commands self-contained in restricted/local environments.
process.env.ASTRO_TELEMETRY_DISABLED = '1';
await import('../node_modules/astro/bin/astro.mjs');
