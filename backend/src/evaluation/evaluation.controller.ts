import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import type { EvaluateBookDto, EvaluationResult } from './evaluation.types';

@Controller('evaluate')
export class EvaluationController {
  private readonly logger = new Logger(EvaluationController.name);

  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  async evaluate(@Body() dto: EvaluateBookDto): Promise<EvaluationResult> {
    const { url } = dto;

    if (!url || typeof url !== 'string') {
      throw new HttpException('Book URL is required', HttpStatus.BAD_REQUEST);
    }

    const force = dto.force === true;
    const focus = dto.focus ?? 'balanced';

    try {
      return await this.evaluationService.evaluateByUrl(url, force, focus);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      this.logger.error(`Evaluation failed for ${url}: ${message}`);

      if (message.includes('Invalid URL')) {
        throw new HttpException(message, HttpStatus.BAD_REQUEST);
      }

      if (
        message.includes('Failed to load book page') ||
        message.includes('No page images found') ||
        message.includes('net::ERR') ||
        message.includes('Timeout')
      ) {
        throw new HttpException(
          `Could not load the book: ${message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      if (
        message.includes('ANTHROPIC_API_KEY') ||
        message.includes('OPENAI_API_KEY')
      ) {
        throw new HttpException(
          'Server configuration error: AI service is not configured (set ANTHROPIC_API_KEY in backend/.env)',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (message.includes('AI returned')) {
        throw new HttpException(message, HttpStatus.BAD_GATEWAY);
      }

      throw new HttpException(
        'Evaluation failed. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
