import { DocumentReference } from 'firebase-admin/firestore';

export interface ParamsDTO {
  puerto: number;
}

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

export interface CostCenterResponse {
  centroCostoID: number;
  centroCostoIDPadre: number;
  nombre: string;
  codigo: string;
}

export interface BalanceSituacionResponse {
  id: string;
  orden: string;
  cuenta: string;
  codigo: string;
  parcial: number;
  subtotal: number;
  total: number;
  ejercicio: string;
  valor: number;
  nivel: number;
  nota: string;
  tipo: string;
  codigo2: string;
  ref: DocumentReference;
  statementIncomeFatherId?: DocumentReference;
  statementFinancialFatherId?: DocumentReference;
}
