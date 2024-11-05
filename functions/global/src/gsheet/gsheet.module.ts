import { Module } from '@nestjs/common';
import { GsheetController } from './gsheet.controller';
import { GsheetService } from './gsheet.service';
import { CommonModule } from '../common/common.module';

@Module({
  controllers: [GsheetController],
  providers: [GsheetService],
  imports: [CommonModule],
})
export class GsheetModule {}
