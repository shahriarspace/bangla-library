import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://shahriarspace.github.io',
  base: '/bangla-library',
  integrations: [react(), sitemap()],
  output: 'static',
});
