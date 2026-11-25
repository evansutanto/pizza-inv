import { defineConfig } from 'vitest/config';
import { CONFIG } from './src/app/Config.ts';

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  server: { watch: { ignored: ['**/artifacts/**','**/dist-subpath/**','**/playwright-report/**','**/test-results/**'] } },
  plugins: [{
    name:'static-invitation-fallback',
    transformIndexHtml:html=>html.replaceAll('__EVENT_TITLE__',escapeHtml(CONFIG.title)).replaceAll('__EVENT_DATE__',escapeHtml(CONFIG.date)).replaceAll('__EVENT_TIME__',escapeHtml(CONFIG.time)),
  }],
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 650 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
