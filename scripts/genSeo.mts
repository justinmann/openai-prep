// Regenerates client/public/sitemap.xml from shared/seo.ts:
//   npx tsx scripts/genSeo.mts
// tests/unit/seo.test.ts fails when the committed file is out of date.
import { writeFileSync } from 'node:fs';
import { sitemapXml } from '../shared/seo';

writeFileSync('client/public/sitemap.xml', sitemapXml());
console.log('wrote client/public/sitemap.xml');
