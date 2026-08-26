import { Module } from '@nestjs/common';
import { DocumentCompilerService } from './document-compiler.service';

@Module({
  providers: [DocumentCompilerService]
})
export class AppModule {}
