import { Global, Module } from '@nestjs/common';
import { EvaluationCacheService } from './evaluation-cache.service';

@Global()
@Module({
  providers: [EvaluationCacheService],
  exports: [EvaluationCacheService],
})
export class CacheModule {}
