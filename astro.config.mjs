import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import rehypeSlug from 'rehype-slug';

export default defineConfig({
  site: 'https://www.ch1n3du.net',
  trailingSlash: 'always',
  integrations: [mdx()],
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      themes: { light: 'one-light', dark: 'one-dark-pro' },
      defaultColor: false,
    },
    rehypePlugins: [rehypeSlug],
  },
});
