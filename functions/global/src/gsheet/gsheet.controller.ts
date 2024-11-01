import {
  Controller,
  Post,
  HttpException,
  HttpStatus,
  Body,
  Req,
  Res,
} from '@nestjs/common';
import { GSheetDTO } from './gsheet.interface';
import { GsheetService } from './gsheet.service';
import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';

@Controller('gsheet')
export class GsheetController {
  constructor(private gsheetService: GsheetService) {}

  db = getFirestore();

  @Post('balances')
  async saveGSheetData(
    @Req() _req: Request,
    @Res() res: Response,
    @Body() body: GSheetDTO,
  ) {
    try {
      let gSheetRegSaved: number = 0;
      // Verifica si `body` tiene alguna propiedad
      const isEmptyBody = !body || Object.keys(body).length === 0;
      if (isEmptyBody) {
        gSheetRegSaved = await this.gsheetService.getDataGSheetMacro();
      } else {
        if (!body.periodo) {
          throw new HttpException(
            'Campo período es obligatorio.',
            HttpStatus.BAD_REQUEST,
          );
        } else if (!body.mes) {
          throw new HttpException(
            'Campo mes es obligatorio.',
            HttpStatus.BAD_REQUEST,
          );
        } else if (!body.ruc) {
          throw new HttpException(
            'Campo ruc es obligatorio.',
            HttpStatus.BAD_REQUEST,
          );
        } else if (!body.tipo) {
          throw new HttpException(
            'Campo tipo es obligatorio.',
            HttpStatus.BAD_REQUEST,
          );
        } else if (
          body.tipo == 'I' &&
          (body.esAcumulado == null || body.esAcumulado == undefined)
        ) {
          throw new HttpException(
            'Cuando tipo es estado de resultado integral es necesario que indique si es acumulado o no',
            HttpStatus.BAD_REQUEST,
          );
        }
        body.mes = String(body.mes).padStart(2, '0');
        body.periodo = String(body.periodo).padStart(4, '0');
        gSheetRegSaved = await this.gsheetService.getDataGSheet(
          body.tipo,
          body.mes,
          body.periodo,
          body.ruc,
        );
      }
      res
        .setHeader('Content-Type', 'application/json')
        .status(HttpStatus.OK)
        .send({
          message: `Guardados ${gSheetRegSaved} registros desde Google Sheet.`,
        });
    } catch (error) {
      if (error instanceof HttpException) {
        console.log(JSON.stringify(error.message));
        res.setHeader('Content-Type', 'application/json');
        return res.status(error.getStatus()).send({
          message: `Hubo el siguiente error: ${error.message}`,
        });
      }
      console.log(JSON.stringify(error));
      res.setHeader('Content-Type', 'application/json');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: `Hubo el siguiente error: ${JSON.stringify(error)}`,
      });
    }
  }
}
