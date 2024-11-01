import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ListosoftModule } from './listosoft/listosoft.module';
import { GsheetModule } from './gsheet/gsheet.module';

@Module({
  imports: [AuthModule, ListosoftModule, GsheetModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
