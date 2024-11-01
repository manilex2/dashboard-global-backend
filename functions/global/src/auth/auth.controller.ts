import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Usuario } from './auth.interface';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signUp')
  async registrarUsuario(
    @Req() _req: Request,
    @Res() res: Response,
    @Body() usuario: Usuario,
  ) {
    try {
      const user = await this.authService.signUp(usuario);
      res
        .setHeader('Content-Type', 'application/json')
        .status(HttpStatus.OK)
        .send({ message: user });
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

  @Put('changePassword')
  async cambiarClave(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: Usuario,
  ) {
    try {
      const change = await this.authService.changePassword(body);
      res.setHeader('Content-Type', 'application/json');
      res.status(HttpStatus.OK).send({ message: change });
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
