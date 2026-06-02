import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParams } from '@anthropic-ai/sdk/resources/messages/messages';
import { BookScraperService } from '../book/book-scraper.service';
import type { ScrapedBook } from '../book/book-scraper.service';
import type {
  EvaluationResult,
  EvaluationFocus,
  PageEvaluation,
} from './evaluation.types';
import type { ScrapedPage } from '../book/book-scraper.service';
import { EvaluationCacheService } from '../cache/evaluation-cache.service';

interface AiPageFeedback {
  pageNumber: number;
  feedback: string;
}

type AiPayload = Omit<
  EvaluationResult,
  'bookUrl' | 'pages' | 'orientation' | 'cached'
> & {
  pageFeedback?: AiPageFeedback[];
};

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const BOOK_URL_PATTERN = /^https?:\/\/myf2b\.com\/cab2s\/[a-zA-Z0-9_-]+$/;

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);
  private readonly anthropic: Anthropic;
  private readonly model: string;

  constructor(
    private configService: ConfigService,
    private readonly bookScraperService: BookScraperService,
    private readonly cacheService: EvaluationCacheService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.anthropic = new Anthropic({ apiKey });
    this.model =
      this.configService.get<string>('ANTHROPIC_MODEL') ?? DEFAULT_MODEL;
  }

  async evaluateByUrl(url: string, force = false, focus: EvaluationFocus = 'balanced'): Promise<EvaluationResult> {
    const normalizedUrl = this.cacheService.normalizeBookUrl(url);

    if (!BOOK_URL_PATTERN.test(normalizedUrl)) {
      throw new Error(
        'Invalid URL. Expected a book URL of the form https://myf2b.com/cab2s/<id>',
      );
    }

    if (!force) {
      const cached = await this.cacheService.get(normalizedUrl);
      if (cached) {
        this.logger.log(`Cache hit for ${normalizedUrl} [focus: ${focus}]`);
        return { ...cached, bookUrl: normalizedUrl, cached: true };
      }
    }

    this.logger.log(
      `Starting evaluation for: ${normalizedUrl} [focus: ${focus}]${force ? ' (force refresh)' : ''}`,
    );
    const book = await this.bookScraperService.scrapeBook(normalizedUrl);
    const result = await this.evaluateBook(book, focus);
    const response: EvaluationResult = {
      ...result,
      bookUrl: normalizedUrl,
      cached: false,
      focus,
    };
    await this.cacheService.set(normalizedUrl, response);
    return response;
  }

  async evaluateBook(book: ScrapedBook, focus: EvaluationFocus = 'balanced'): Promise<EvaluationResult> {
    this.logger.log(`Evaluating "${book.title}" with ${this.model} [focus: ${focus}]`);

    const payload = await this.evaluateViaPdf(book, focus);
    const { pageFeedback: _pf, ...rest } = payload;

    return {
      ...rest,
      bookTitle: payload.bookTitle || book.title,
      bookUrl: book.url,
      pages: this.mergePageFeedback(book.pages, payload.pageFeedback),
      orientation: book.orientation,
    };
  }

  private mergePageFeedback(
    scraped: ScrapedPage[],
    aiPages: AiPageFeedback[] | undefined,
  ): PageEvaluation[] {
    const byNumber = new Map<number, string>();
    for (const entry of aiPages ?? []) {
      if (
        typeof entry.pageNumber === 'number' &&
        typeof entry.feedback === 'string' &&
        entry.feedback.trim()
      ) {
        byNumber.set(entry.pageNumber, entry.feedback.trim());
      }
    }

    return scraped.map((sp) => ({
      pageNumber: sp.pageNumber,
      label: sp.label,
      imageUrl: sp.imageUrl,
      pageText: sp.pageText,
      feedback:
        byNumber.get(sp.pageNumber) ??
        'No feedback was generated for this page.',
    }));
  }

  private async evaluateViaPdf(book: ScrapedBook, focus: EvaluationFocus = 'balanced'): Promise<AiPayload> {
    const pdfUrl = book.pdfUrl;
    const prompt = this.buildPrompt(book.title, book.pages, focus);

    try {
      const raw = await this.callClaude([
        {
          type: 'document',
          source: { type: 'url', url: pdfUrl },
        },
        { type: 'text', text: prompt },
      ]);
      return this.parsePayload(raw);
    } catch (urlErr) {
      this.logger.warn(
        `PDF via URL failed (${urlErr})`,
      );
      throw urlErr;
    }
  }

  private async callClaude(
    userContent: MessageCreateParams['messages'][0]['content'],
  ): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: this.systemPrompt(),
      messages: [{ role: 'user', content: userContent }],
    });

    const parts: string[] = [];
    for (const block of response.content) {
      if (block.type === 'text') parts.push(block.text);
    }
    return parts.join('\n').trim();
  }


  private systemPrompt(): string {
    return [
      'You are an expert early-childhood literacy evaluator reviewing student-authored picture books',
      'created by Grade 1-3 students (ages 6-9) using the Footsteps2Brilliance platform.',
      'Each page combines a background illustration with the student\'s own drawing on top, plus their typed or handwritten text.',
      '',
      'Books vary widely in genre: some are fiction (stories with characters), some are non-fiction',
      '(informational, like a report on animals), some are instructional (how-to steps), and some are',
      'personal narratives (the student writing about their own life). Always identify the genre first',
      'and calibrate your rubric accordingly — a non-fiction book should not be penalized for lacking',
      'a story arc, and a short book should be judged relative to its scope.',
      '',
      'Be encouraging and constructive. Score each dimension 1-5 relative to typical Grade 1-3 work.',
      'Your output will be read by a classroom teacher. Keep the tone warm but professional.',
      'Before calling any page blank, inspect the PDF page image: student drawings, doodles, and typed text',
      'all count as content. Never label a page blank if you can see either.',
      'Respond with valid JSON only — no markdown fences, no extra text.',
    ].join(' ');
  }

  private focusEmphasis(focus: EvaluationFocus): string {
    const emphases: Record<EvaluationFocus, string> = {
      balanced: '',
      creativity:    'EVALUATION FOCUS: Pay special attention to Creativity & Voice — originality, personality, unexpected ideas, and unique perspective. Weight this dimension heavily in your overall assessment and give the most detailed feedback here.',
      language:      'EVALUATION FOCUS: Pay special attention to Language & Vocabulary — word choice, sentence variety, and grade-appropriate spelling. Weight this dimension heavily in your overall assessment and give the most detailed feedback here.',
      structure:     'EVALUATION FOCUS: Pay special attention to Content Structure — story arc for fiction, logical organization for non-fiction, and clarity of sequence. Weight this dimension heavily in your overall assessment and give the most detailed feedback here.',
      illustrations: 'EVALUATION FOCUS: Pay special attention to Illustration–Text Harmony — how well the drawings and words complement, reinforce, and add meaning to each other. Weight this dimension heavily in your overall assessment and give the most detailed feedback here.',
      effort:        'EVALUATION FOCUS: Pay special attention to Effort & Depth — how deeply the student engaged, the completeness of ideas, and overall dedication. Weight this dimension heavily in your overall assessment and give the most detailed feedback here.',
    };
    return emphases[focus];
  }

  private buildPrompt(knownTitle: string, pages: ScrapedPage[], focus: EvaluationFocus = 'balanced'): string {
    const titleClause = knownTitle ? ` titled "${knownTitle}"` : '';
    const fallbackTitle = knownTitle || 'Unknown';
    const pageList = pages
      .map((p) => {
        const textPart = p.pageText
          ? ` — student text: "${p.pageText.slice(0, 300)}"`
          : '';
        return `  ${p.pageNumber}. ${p.label}${textPart}`;
      })
      .join('\n');
    const pageCount = pages.length;
    const emphasis = this.focusEmphasis(focus);
    return [
      `Evaluate this student picture book${titleClause}.`,
      'Read every page carefully: all visible text, the illustrations, and how they work together.',
      ...(emphasis ? ['', emphasis] : []),
      '',
      'Rubric dimension guidance:',
      '- contentStructure: For FICTION score story arc (setup/problem/resolution).',
      '  For NON-FICTION score logical organization of facts. For INSTRUCTIONAL score clarity of steps.',
      '  For PERSONAL NARRATIVE score whether events are presented in a clear order.',
      '- languageAndVocabulary: Word choice, sentence variety, spelling relative to the grade level.',
      '  A Grade 1 student writing "he goed to the store" shows developmental spelling — score generously.',
      '- illustrationTextHarmony: Do the drawings and words reinforce each other?',
      '  Do the pictures add meaning or tell more than the words alone?',
      '- creativityAndVoice: Does the student\'s personality come through? Are there original ideas,',
      '  unexpected details, humor, or a distinctive perspective? Fan-fiction and pop-culture books',
      '  can still show strong voice.',
      '- effortAndDepth: How deeply did the student engage? 8+ pages with developed ideas = high effort.',
      '  4 pages with minimal text = lower effort, even if each page is good.',
      '- Truly blank pages only: Call a page "blank" ONLY when the PDF shows no student-added drawing',
      '  AND no student text (empty or default template only). If there is ANY visible student drawing,',
      '  coloring, or characters — the page is NOT blank. If there is ANY typed/handwritten text — even',
      '  repetitive filler like "aaaaaa" — the page is NOT blank; instead note low effort or placeholder',
      '  text gently and score effortAndDepth/language lower if appropriate. Never contradict what you see.',
      '  Per-page feedback must describe actual content on that page (e.g. drawings, repeated letters).',
      '',
      'Confidence (required — be honest):',
      '- high: text and images were clear; you are confident in scores and feedback.',
      '- medium: some handwriting, image quality, or ambiguous content limited certainty.',
      '- low: significant portions were hard to read or interpret; treat scores as approximate.',
      '- uncertainties: list 0-3 specific caveats for the teacher (which page, which rubric dimension,',
      '  what might be wrong). Examples: "Page 4 text was illegible — vocabulary score may be off",',
      '  "Could not tell if the ending was intentional or incomplete". Use [] if truly none.',
      '',
      `Per-page feedback: this book has ${pageCount} page(s) in reading order:`,
      pageList,
      `Provide pageFeedback with exactly ${pageCount} entries — pageNumber 1 through ${pageCount},`,
      'one warm sentence each that mentions something specific you noticed on that page',
      '(text, drawing, or how they work together). Match pageNumber to the list above.',
      '',
      'Return a JSON object with EXACTLY this structure (no extra keys, no comments):',
      '{',
      `  "bookTitle": "title as shown on the cover, or '${fallbackTitle}' if unclear",`,
      '  "genre": "Fiction or Non-fiction or Instructional or Personal Narrative or Other",',
      '  "overallScore": 0.0,',
      '  "overallGrade": "Exceptional or Strong or Developing or Emerging",',
      '  "teacherSummary": "2-3 warm sentences referencing specific things from this book",',
      '  "rubric": {',
      '    "contentStructure":        { "score": 0, "feedback": "1-2 sentences specific to this book" },',
      '    "languageAndVocabulary":   { "score": 0, "feedback": "1-2 sentences specific to this book" },',
      '    "illustrationTextHarmony": { "score": 0, "feedback": "1-2 sentences specific to this book" },',
      '    "creativityAndVoice":      { "score": 0, "feedback": "1-2 sentences specific to this book" },',
      '    "effortAndDepth":          { "score": 0, "feedback": "1-2 sentences specific to this book" }',
      '  },',
      '  "highlights": ["specific positive from this book", "specific positive", "specific positive"],',
      '  "suggestions": ["specific gentle suggestion", "specific gentle suggestion"],',
      '  "pageFeedback": [',
      '    { "pageNumber": 1, "feedback": "one specific sentence for page 1" },',
      `    ... exactly ${pageCount} entries, pageNumber 1 to ${pageCount}`,
      '  ],',
      '  "confidence": "high or medium or low",',
      '  "confidenceNote": "1-2 sentences on overall reliability, or null if high and nothing to flag",',
      '  "uncertainties": ["specific caveat for teacher", "..."]',
      '}',
    ].join('\n');
  }

  private parsePayload(raw: string): AiPayload {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as Partial<AiPayload>;
      return this.normalizePayload(parsed);
    } catch (err) {
      this.logger.error(`JSON parse failed: ${err}\nRaw: ${raw}`);
      throw new Error(
        'AI returned an unexpected response format. Please try again.',
      );
    }
  }

  private normalizePayload(parsed: Partial<AiPayload>): AiPayload {
    const confidence = ['high', 'medium', 'low'].includes(
      parsed.confidence as string,
    )
      ? parsed.confidence!
      : 'medium';

    const uncertainties = Array.isArray(parsed.uncertainties)
      ? parsed.uncertainties.filter(
          (u): u is string => typeof u === 'string' && u.trim().length > 0,
        )
      : [];

    const note =
      typeof parsed.confidenceNote === 'string' &&
      parsed.confidenceNote.trim().length > 0
        ? parsed.confidenceNote.trim()
        : null;

    const pageFeedback = Array.isArray(
      (parsed as { pageFeedback?: unknown }).pageFeedback,
    )
      ? (
          (parsed as { pageFeedback: AiPageFeedback[] }).pageFeedback ?? []
        ).filter(
          (p) =>
            typeof p.pageNumber === 'number' &&
            typeof p.feedback === 'string' &&
            p.feedback.trim().length > 0,
        )
      : [];

    return {
      ...parsed,
      confidence,
      confidenceNote: note,
      uncertainties,
      pageFeedback,
    } as AiPayload;
  }
}
