import { Module } from '@nestjs/common';
import { BookScraperService } from './book-scraper.service';

@Module({
  providers: [BookScraperService],
  exports: [BookScraperService],
})
export class BookModule {}
