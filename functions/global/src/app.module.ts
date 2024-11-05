import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ListosoftModule } from './listosoft/listosoft.module';
import { GsheetModule } from './gsheet/gsheet.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [AuthModule, ListosoftModule, GsheetModule, CommonModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
