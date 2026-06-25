import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const pages = await getCollection('pages', ({ data }) => {
    return data.hidefromhome !== true;
  });

  const sortedPages = pages.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'ch1n3du.net',
    description: 'Articles by ch1n3du',
    site: context.site,
    items: sortedPages.map((page) => ({
      title: page.data.title,
      pubDate: page.data.date,
      description: page.data.description,
      link: `/${page.id.replace(/\.mdx?$/, '')}/`,
    })),
  });
}
