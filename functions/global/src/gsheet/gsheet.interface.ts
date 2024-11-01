export interface GSheetDTO {
  sheetId: string;
  periodo: string;
  mes: string;
  codigo: string;
  ruc: string;
  tipo: 'F' | 'I';
  esAcumulado: boolean;
  codigoCentroCosto?: any;
  codigoSubCentroCosto?: any;
  codigoSucursal?: any;
}
