import { writeFile } from 'node:fs/promises';

const base = 'https://msk.earth';
const routes = ['/', '/aktualnosci', '/o-nas', '/miasta', '/fundacja', '/kontakt']; 

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(r => `  <url><loc>${base}${r}</loc></url>`).join('\n')}
</urlset>`;

await writeFile('dist/sitemap.xml', xml, 'utf8');
