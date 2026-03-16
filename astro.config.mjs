import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://shahriarspace.github.io',
  base: '/bangla-library',
  integrations: [react()],
  output: 'static',
});
