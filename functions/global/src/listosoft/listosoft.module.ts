import { Module } from '@nestjs/common';
import { ListosoftController } from './listosoft.controller';
import { ListosoftService } from './listosoft.service';
import { CommonModule } from '../common/common.module';

@Module({
  controllers: [ListosoftController],
  providers: [ListosoftService],
  imports: [CommonModule],
})
export class ListosoftModule {}
