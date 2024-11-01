import { Module } from '@nestjs/common';
import { GsheetController } from './gsheet.controller';
import { GsheetService } from './gsheet.service';
import { ListosoftModule } from 'src/listosoft/listosoft.module';

@Module({
  controllers: [GsheetController],
  providers: [GsheetService],
  imports: [ListosoftModule],
})
export class GsheetModule {}
