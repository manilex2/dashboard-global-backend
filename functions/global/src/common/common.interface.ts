export interface BalanceDTO {
  periodo: number;
  mes: number;
  codigo: string;
  ruc: string;
  tipo: 'F' | 'I';
  esAcumulado: boolean;
  servidor: number;
  codigoCentroCosto?: any;
  codigoSubCentroCosto?: any;
  codigoSucursal?: any;
}
