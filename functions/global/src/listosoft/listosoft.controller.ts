import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ListosoftService } from './listosoft.service';
import { Request, Response } from 'express';
import { BalanceDTO, ParamsDTO } from './listosoft.interface';

@Controller('listosoft')
export class ListosoftController {
  constructor(private listosoftService: ListosoftService) {}

  @Get('costCenter')
  async costCenter(
    @Req() _req: Request,
    @Res() res: Response,
    @Query() query: ParamsDTO,
  ) {
    try {
      const costCenterSaved: number = await this.listosoftService.getCostCenter(
        query.puerto,
      );
      res
        .setHeader('Content-Type', 'application/json')
        .status(HttpStatus.OK)
        .send({ message: `Guardados ${costCenterSaved} centros de costos.` });
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

  @Post('balances')
  async estadoSituacionResultados(
    @Req() _req: Request,
    @Res() res: Response,
    @Body() body: BalanceDTO,
  ) {
    let balancesCreados: number = 0;
    try {
      // Verifica si `body` tiene alguna propiedad
      const isEmptyBody = !body || Object.keys(body).length === 0;
      if (isEmptyBody) {
        balancesCreados = await this.listosoftService.updateBalanceMacro();
      } else {
        if (
          !body.periodo ||
          !body.mes ||
          !body.codigo ||
          !body.ruc ||
          !body.tipo ||
          !body.servidor
        ) {
          throw new Error(
            'Campo período, mes, código, ruc, tipo y servidor son obligatorios.',
          );
        } else if (
          body.tipo == 'I' &&
          (body.esAcumulado == null || body.esAcumulado == undefined)
        ) {
          throw new Error(
            'Cuando tipo es estado de resultado integral es necesario que indique si es acumulado o no',
          );
        }
        balancesCreados = await this.listosoftService.updateBalance(body);
      }
      res
        .setHeader('Content-Type', 'application/json')
        .status(HttpStatus.OK)
        .send({ message: `Creados ${balancesCreados} balances.` });
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
