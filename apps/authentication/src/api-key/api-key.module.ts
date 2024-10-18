import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '@app/common';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])],
  providers: [ApiKeyService],
  controllers: [],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
