import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DocumentReference, getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';
import {
  BalanceSituacionResponse,
  CostCenterResponse,
} from './listosoft.interface';
import { BalanceDTO } from '../common/common.interface';
import { DateTime } from 'luxon';
import { CommonService } from '../common/common.service';

@Injectable()
export class ListosoftService {
  db = getFirestore();
  constructor(private commonService: CommonService) {}

  /**
   * Agrega nuevos registros para los Centros de Costos.
   * @param {number} puerto Puerto del servidor que se va a hacer la consulta.
   * @return {number} Devuelve la cantidad de Centros de Costos agregados.
   */
  async getCostCenter(puerto: number): Promise<number> {
    try {
      let costCentersSaved: number = 0;
      const response = await axios
        .get(`${process.env.LISTOSOFT_URL_ENDPOINT}:${puerto}/CentrosCostos`, {
          headers: {
            LApiKey: process.env.LISTOSOFT_API_KEY,
          },
        })
        .catch((err) => {
          throw new Error(err);
        });
      const centrosCosto = (
        await this.db.collection('costCenters').get()
      ).docs.map((doc) => {
        const data = doc.data();
        data.id = doc.id; // Asegurarse de que el id del documento está disponible
        return data;
      });

      const data: CostCenterResponse[] = response.data;
      const nuevosCentrosCosto = data.filter(
        (item1) =>
          !centrosCosto.some(
            (item2) => item1.centroCostoID === item2.costCenterIdNumber,
          ),
      );

      const batch = this.db.batch();
      const nuevosCentrosCostoMap = new Map();
      const registrosSubidos = [];

      // Crear documentos en batch
      nuevosCentrosCosto.forEach((item) => {
        const newDocRef = this.db.collection('costCenters').doc();
        const newDocData = {
          id: newDocRef.id,
          codigo: item.codigo,
          nombre: item.nombre,
          costCenterFatherIdNum: item.centroCostoIDPadre,
          costCenterIdNumber: item.centroCostoID,
        };

        if (!newDocData.costCenterFatherIdNum) {
          delete newDocData.costCenterFatherIdNum;
        }

        batch.set(newDocRef, newDocData);

        // Guardar la referencia en el mapa
        nuevosCentrosCostoMap.set(item.centroCostoID, newDocRef);
        registrosSubidos.push(newDocData); // Agregar el nuevo documento a la lista de registros subidos
        costCentersSaved++;
      });

      // Actualizar los documentos en batch con los padres
      nuevosCentrosCosto.forEach((item) => {
        if (item.centroCostoIDPadre) {
          let costCenterFatherRef = null;

          const padreExistente = centrosCosto.find(
            (centro) => centro.costCenterIdNumber === item.centroCostoIDPadre,
          );
          if (padreExistente) {
            costCenterFatherRef = this.db
              .collection('costCenters')
              .doc(padreExistente.id);
          } else {
            costCenterFatherRef = nuevosCentrosCostoMap.get(
              item.centroCostoIDPadre,
            );
          }

          if (costCenterFatherRef) {
            const newDocRef = nuevosCentrosCostoMap.get(item.centroCostoID);
            batch.update(newDocRef, { costCenterFatherRef });

            // Actualizar el registro en registrosSubidos
            const registro = registrosSubidos.find(
              (doc) => doc.id === newDocRef.id,
            );
            if (registro) {
              registro.costCenterFatherRef = costCenterFatherRef;
            }
          }
        }
      });

      await batch.commit().catch((err) => {
        throw new Error(err);
      });

      return costCentersSaved;
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Agrega nuevos registros para los balances.
   * @param {BalanceDTO} body Contiene el cuerpo de la solicitud que incluye el puerto del servidor y los parámetros a consultar.
   * @return {number} Devuelve la cantidad de Balances agregados.
   */
  async updateBalance(body: BalanceDTO): Promise<number> {
    try {
      let balancesSaved: number = 0;
      let batchCount = 0;
      const companyRef = (
        await this.db
          .collection('companies')
          .where('RUC', '==', body.ruc)
          .limit(1)
          .get()
      ).docs[0].ref;
      let balanceRef: DocumentReference;
      switch (body.tipo) {
        case 'I':
          balanceRef = (
            await this.db
              .collection('balance')
              .where('companyId', '==', companyRef)
              .where('gSheet', '==', false)
              .where('balanceType', '==', 'incomeStatement')
              .limit(1)
              .get()
          ).docs[0].ref;
          break;
        case 'F':
          balanceRef = (
            await this.db
              .collection('balance')
              .where('companyId', '==', companyRef)
              .where('gSheet', '==', false)
              .where('balanceType', '==', 'balanceSheet')
              .limit(1)
              .get()
          ).docs[0].ref;
          break;
        default:
          break;
      }
      switch (body.tipo) {
        case 'I':
          await this.commonService.deleteCollectionByBalanceRef(
            this.db,
            'statement_income',
            balanceRef,
            body,
          );
          break;
        case 'F':
          await this.commonService.deleteCollectionByBalanceRef(
            this.db,
            'statement_financial_position',
            balanceRef,
            body,
          );
          break;
        default:
          break;
      }
      let batch = this.db.batch();
      const response = await axios.post(
        `${process.env.LISTOSOFT_URL_ENDPOINT}:${body.servidor}/API/EstadoSituacionResultado`,
        {
          periodo: body.periodo,
          mes: body.mes,
          codigo: body.codigo,
          ruc: body.ruc,
          tipo: body.tipo,
          codigoCentroCosto: body.codigoCentroCosto || null,
          codigoSubCentroCosto: body.codigoSubCentroCosto || null,
          codigoSucursal: body.codigoSucursal || null,
          esAcumulado: body.esAcumulado || true,
        },
        {
          headers: {
            LApiKey: process.env.LISTOSOFT_API_KEY,
          },
        },
      );
      const data: BalanceSituacionResponse[] = response.data;
      const registrosSubidos = [];
      for (let i = 0; i < data.length; i++) {
        const element = data[i];
        if (!element.codigo && !element.cuenta) {
          continue;
        }
        let newDocRef: DocumentReference;
        switch (body.tipo) {
          case 'I':
            newDocRef = this.db.collection('statement_income').doc();
            break;
          case 'F':
            newDocRef = this.db
              .collection('statement_financial_position')
              .doc();
            break;
          default:
            break;
        }
        let count = 0;

        data[i].ref = newDocRef;

        const newDocData = {
          id: newDocRef.id,
          orden: element.orden,
          codigo: element.codigo,
          cuenta: element.cuenta.trim(),
          parcial: element.parcial || 0,
          subtotal: element.subtotal || 0,
          total: element.total || 0,
          ejercicio: element.ejercicio,
          periodo: body.periodo,
          mes: body.mes,
          valor: element.valor || 0,
          nivel: element.nivel,
          nota: element.nota,
          tipo: element.tipo,
          codigo2: element.codigo2,
          balanceId: balanceRef,
          statementIncomeFatherId: null,
          statementFinancialFatherId: null,
          uniqueCodeBC: `${balanceRef.id}_${String(element.codigo)}`,
        };
        while (count < data.length) {
          if (data[i - 1 - count] && element.codigo) {
            if (element.codigo.startsWith(data[i - 1 - count].codigo)) {
              switch (body.tipo) {
                case 'I':
                  newDocData.statementIncomeFatherId = data[i - 1 - count].ref;
                  break;
                case 'F':
                  newDocData.statementFinancialFatherId =
                    data[i - 1 - count].ref;
                  break;
                default:
                  break;
              }
              break;
            }
          }
          count++;
        }
        const cleanDocData =
          this.commonService.removeEmptyProperties(newDocData);
        batch.set(newDocRef, cleanDocData);
        registrosSubidos.push(newDocData);
        balancesSaved++;
        batchCount++;
        // Si alcanzamos el límite de 500 operaciones, hacemos commit y reiniciamos el batch
        if (batchCount === 500) {
          await batch.commit();
          batch = this.db.batch(); // Nuevo batch para las siguientes operaciones
          batchCount = 0; // Reiniciar contador de operaciones del batch
        }
        count = 0;
      }
      await batch.commit();

      return balancesSaved;
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Agrega nuevos registros para los balances de todas las compañías.
   * @return {number} Devuelve la cantidad de Balances agregados.
   */
  async updateBalanceMacro(): Promise<number> {
    try {
      let balancesSaved: number = 0;
      const now = DateTime.now();
      const month = now.month.toString().padStart(2, '0');
      const year = now.year.toString().padStart(4, '0');
      const companies = (
        await this.db.collection('companies').where('enable', '==', true).get()
      ).docs.map((doc) => {
        return doc;
      });
      if (companies.length == 0) {
        console.log('No hay ninguna compañía registrada.');
        return balancesSaved;
      }
      for (const company of companies) {
        const balances = (
          await this.db
            .collection('balance')
            .where('companyId', '==', company.ref)
            .where('gSheet', '==', false)
            .get()
        ).docs.map((doc) => {
          return doc;
        });
        if (balances.length == 0) {
          console.log(
            `No hay balances de Listosoft para la compañía: ${company.data().CompanyName}`,
          );
          continue;
        }
        for (const balance of balances) {
          const tipoBalance =
            balance.data().balanceType == 'incomeStatement' ? 'I' : 'F';
          const body: BalanceDTO = {
            periodo: Number(year),
            mes: Number(month),
            codigo: company.data().codigo,
            ruc: company.data().RUC,
            tipo: tipoBalance,
            esAcumulado: true,
            servidor: company.data().servidor,
          };
          balancesSaved = balancesSaved + (await this.updateBalance(body));
        }
      }
      return balancesSaved;
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
