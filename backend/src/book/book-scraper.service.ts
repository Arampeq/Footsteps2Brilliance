import { Injectable, Logger } from '@nestjs/common';

export interface ScrapedPage {
  pageNumber: number;
  label: string;
  imageUrl: string;
  pageText: string;
}

export interface ScrapedBook {
  title: string;
  url: string;
  pdfUrl: string;
  pages: ScrapedPage[];
  orientation: 'portrait' | 'landscape';
}

@Injectable()
export class BookScraperService {
  private readonly logger = new Logger(BookScraperService.name);

  async scrapeBook(url: string): Promise<ScrapedBook> {
    this.logger.log(`Scraping book: ${url}`);

    const printPageUrl = url.replace(/\/$/, '') + '/print';
    const res = await fetch(printPageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BookEvaluator/1.0)' },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      throw new Error(
        'Could not load the book print page. Check that the URL is a valid Create-A-Book link.',
      );
    }

    const html = await res.text();
    const { pdfUrl, title: formTitle } = this.buildPdfUrlFromHtml(html, url);

    if (!pdfUrl) {
      throw new Error(
        'Could not build a print PDF for this book. The print page may be missing page data.',
      );
    }

    const pages = this.extractAndBuildPages(html);
    if (pages.length === 0) {
      throw new Error('No page images found on the print page.');
    }

    const orientation = this.detectOrientation(html);
    const title = formTitle ?? (await this.fetchTitleLightly(url));
    this.logger.log(
      `"${title}" — ${orientation}, ${pages.length} pages, PDF ready`,
    );

    return { title, url, pdfUrl, pages, orientation };
  }

  private buildPdfUrlFromHtml(
    html: string,
    bookUrl: string,
  ): { pdfUrl: string | null; title: string | null } {
    const posMatches = [
      ...html.matchAll(/name="page_positions\[\]"[^>]*value="(\d+)"/g),
    ];
    const positions = posMatches.map((m) => m[1]);

    if (positions.length === 0) {
      this.logger.warn('No page_positions found in print page form');
      return { pdfUrl: null, title: null };
    }

    const parts: string[] = ['utf8=%E2%9C%93'];
    if (/name="frontcover"/.test(html)) parts.push('frontcover=1');
    for (const pos of positions) parts.push(`page_positions%5B%5D=${pos}`);
    if (/name="backcover"/.test(html)) parts.push('backcover=1');

    const pdfUrl =
      bookUrl.replace(/\/$/, '') + '/print.pdf?' + parts.join('&');
    const title = this.extractTitleFromHtml(html);

    return { pdfUrl, title };
  }

  private extractAndBuildPages(html: string): ScrapedPage[] {
    const origin = 'https://myf2b.com';

    const imgEntries: { src: string; offset: number }[] = [];
    const imgTagRegex = /<img[^>]+>/gi;
    let match: RegExpExecArray | null;

    while ((match = imgTagRegex.exec(html)) !== null) {
      const tag = match[0];
      const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
      if (!srcMatch) continue;

      let src = srcMatch[1];
      if (src.startsWith('//')) src = 'https:' + src;
      else if (src.startsWith('/')) src = origin + src;

      const lower = src.toLowerCase();
      const isPage =
        lower.includes('cover_original') ||
        lower.includes('/cab2page/') ||
        lower.includes('backcover') ||
        lower.includes('cab3_horizontal_backcover');

      if (!isPage) continue;
      if (lower.includes('logo') || lower.includes('parent-info')) continue;

      imgEntries.push({ src, offset: match.index });
    }

    const pages: ScrapedPage[] = [];
    let contentPageIndex = 0;

    for (let i = 0; i < imgEntries.length; i++) {
      const { src, offset } = imgEntries[i];
      const nextOffset = imgEntries[i + 1]?.offset ?? html.length;
      const chunk = html.slice(offset, nextOffset);

      const iframeMatch = chunk.match(
        /<iframe\b[^>]*class="page_xml"[^>]*srcdoc="([^"]+)"/i,
      );
      const pageText = iframeMatch ? this.decodeSrcdoc(iframeMatch[1]) : '';

      const lower = src.toLowerCase();
      let label: string;
      if (lower.includes('cover_original')) {
        label = 'Cover';
      } else if (
        lower.includes('backcover') ||
        lower.includes('cab3_horizontal_backcover')
      ) {
        label = 'Back cover';
      } else {
        contentPageIndex++;
        label = `Page ${contentPageIndex}`;
      }

      pages.push({
        pageNumber: pages.length + 1,
        label,
        imageUrl: src,
        pageText,
      });
    }

    return pages;
  }

  private detectOrientation(html: string): 'portrait' | 'landscape' {
    return /div[^>]+style="[^"]*width:\s*\d+px[^"]*height:\s*\d+px/.test(html)
      ? 'landscape'
      : 'portrait';
  }

  private decodeSrcdoc(encoded: string): string {
    const decoded = encoded
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');

    return decoded
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractTitleFromHtml(html: string): string | null {
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    if (titleTag && !/create-a-book|f2b/i.test(titleTag)) return titleTag;

    const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim();
    if (h1) return h1;

    return null;
  }

  private async fetchTitleLightly(url: string): Promise<string> {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BookEvaluator/1.0)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return 'Untitled book';
      const html = await res.text();
      return this.extractTitleFromHtml(html) ?? 'Untitled book';
    } catch {
      return 'Untitled book';
    }
  }
}
