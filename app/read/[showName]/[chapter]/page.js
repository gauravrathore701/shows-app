export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';

import MangaReader from '../../../components/MangaReader';
import { listChapters, chapterPages } from '../../../lib/manga-server';

export default async function ReadPage({ params }) {
  const { showName, chapter } = await params;
  const show = decodeURIComponent(showName);
  const file = decodeURIComponent(chapter);

  const chapters = listChapters(show);
  const idx = chapters.findIndex(c => c.name === file);
  if (idx === -1) notFound();

  const pages = await chapterPages(show, file);
  if (pages.length === 0) notFound();

  return (
    <MangaReader
      showName={show}
      chapter={file}
      chapterNum={chapters[idx].num}
      chapterTitle={chapters[idx].title}
      pageCount={pages.length}
      prev={idx > 0 ? chapters[idx - 1] : null}
      next={idx < chapters.length - 1 ? chapters[idx + 1] : null}
    />
  );
}
