// Manga API. Two shapes:
//   GET /api/manga/<show>                      -> { chapters: [...] }
//   GET /api/manga/<show>/<chapter.cbz>        -> { pages: <count> }
//   GET /api/manga/<show>/<chapter.cbz>/<n>    -> the nth page image (0-based)
//
// Pages are streamed out of the .cbz on demand — nothing is unpacked to disk.
import { listChapters, chapterPages, readPage } from '../../../lib/manga-server';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { path: segs = [] } = await params;
  const parts = segs.map(s => decodeURIComponent(s));

  if (parts.length === 0) {
    return Response.json({ error: 'show required' }, { status: 400 });
  }

  const [show, chapter, pageIdx] = parts;

  if (parts.length === 1) {
    return Response.json({ show, chapters: listChapters(show) });
  }

  if (parts.length === 2) {
    const pages = await chapterPages(show, chapter);
    if (pages.length === 0) {
      return Response.json({ error: 'chapter not found' }, { status: 404 });
    }
    return Response.json({ show, chapter, pages: pages.length });
  }

  if (parts.length === 3) {
    const idx = Number(pageIdx);
    let page;
    try {
      page = await readPage(show, chapter, idx);
    } catch {
      return new Response('unzip failed', { status: 500 });
    }
    if (!page) return new Response('page not found', { status: 404 });

    return new Response(page.buffer, {
      headers: {
        'Content-Type': page.contentType,
        'Content-Length': String(page.buffer.length),
        // The archive never changes once filed, so let the phone keep the page.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return Response.json({ error: 'bad path' }, { status: 400 });
}
