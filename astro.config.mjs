import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://yourusername.github.io',
  base: '/bangla-library',
  integrations: [react()],
  output: 'static',
});
