import { Module } from '@nestjs/common';
import { ListosoftController } from './listosoft.controller';
import { ListosoftService } from './listosoft.service';

@Module({
  controllers: [ListosoftController],
  providers: [ListosoftService],
  exports: [ListosoftService],
})
export class ListosoftModule {}
