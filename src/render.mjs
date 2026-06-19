import { getBrowser } from './browser.mjs';

async function withPage(html, fn) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1320, height: 1200, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    return await fn(page);
  } finally {
    await page.close();
  }
}

export async function renderHtml(html, opts = {}) {
  const { format = 'png', scale = 2, width = 1320, transparent = false, css = '' } = opts;

  if (format === 'pdf') {
    return withPage(html, async (page) => {
      const el = await page.$('.diagram');
      const box = await el.boundingBox();
      const buffer = Buffer.from(await page.pdf({
        printBackground: true,
        width: `${Math.ceil(box.width)}px`,
        height: `${Math.ceil(box.height)}px`,
        pageRanges: '1',
      }));
      return { buffer, mimeType: 'application/pdf', ext: 'pdf', width: Math.ceil(box.width), height: Math.ceil(box.height) };
    });
  }

  if (format === 'svg') {
    return withPage(html, async (page) => {
      const { outerHTML, w, h } = await page.evaluate(() => {
        const el = document.querySelector('.diagram');
        const r = el.getBoundingClientRect();
        return { outerHTML: el.outerHTML, w: Math.ceil(r.width), h: Math.ceil(r.height) };
      });
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
        `<foreignObject width="${w}" height="${h}">` +
        `<div xmlns="http://www.w3.org/1999/xhtml"><style>${css}</style>${outerHTML}</div>` +
        `</foreignObject></svg>`;
      return { buffer: Buffer.from(svg, 'utf8'), mimeType: 'image/svg+xml', ext: 'svg', width: w, height: h };
    });
  }

  // png (default)
  return withPage(html, async (page) => {
    await page.setViewport({ width, height: 1200, deviceScaleFactor: Math.max(1, Math.min(3, scale)) });
    await page.setContent(html, { waitUntil: 'load' });
    const el = await page.$('.diagram');
    const box = await el.boundingBox();
    const buffer = Buffer.from(await el.screenshot({ type: 'png', omitBackground: transparent }));
    return { buffer, mimeType: 'image/png', ext: 'png', width: Math.ceil(box.width), height: Math.ceil(box.height) };
  });
}
