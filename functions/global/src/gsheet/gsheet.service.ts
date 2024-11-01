import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  DocumentData,
  DocumentReference,
  getFirestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { ListosoftService } from '../listosoft/listosoft.service';

@Injectable()
export class GsheetService {
  db = getFirestore();
  auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  });

  constructor(private listoSoftService: ListosoftService) {}

  /**
   * Obtiene registros de Google Speadsheet y los guarda en la base.
   * @param {string} tipoBalance Indica si es I o F.
   * @param {number} month Mes a consultar.
   * @param {number} year Año a consultar.
   * @param {string} companyRuc RUC de la Compañía.
   * @param {DocumentReference} balanceRef Referencia del balance.
   * @param {string} googleSheetId Id de la Hoja de Cálculo de Google SpeadSheet.
   * @return {number} Devuelve la cantidad de registros agregados.
   */
  async getDataGSheet(
    tipoBalance: string,
    month: string,
    year: string,
    companyRuc?: string,
    balanceRef?: DocumentReference,
    googleSheetId?: string,
  ): Promise<number> {
    let balancesSaved: number = 0;
    let batchCount = 0;
    let bal: QueryDocumentSnapshot<DocumentData>;
    try {
      if (!balanceRef) {
        const companyRef = (
          await this.db
            .collection('companies')
            .where('RUC', '==', companyRuc)
            .limit(1)
            .get()
        ).docs[0].ref;
        switch (tipoBalance) {
          case 'I':
            bal = (
              await this.db
                .collection('balance')
                .where('companyId', '==', companyRef)
                .where('gSheet', '==', true)
                .where('balanceType', '==', 'incomeStatement')
                .limit(1)
                .get()
            ).docs[0];
            balanceRef = bal.ref;
            googleSheetId = bal.data().gSheetCodeSI;
            break;
          case 'F':
            bal = (
              await this.db
                .collection('balance')
                .where('companyId', '==', companyRef)
                .where('gSheet', '==', true)
                .where('balanceType', '==', 'balanceSheet')
                .limit(1)
                .get()
            ).docs[0];
            balanceRef = bal.ref;
            googleSheetId = bal.data().gSheetCodeSFP;
            break;
          default:
            break;
        }
      }
      switch (tipoBalance) {
        case 'I':
          await this.listoSoftService.deleteCollectionByBalanceRef(
            this.db,
            'statement_income',
            balanceRef,
            {
              mes: Number(month),
              periodo: Number(year),
              codigo: '',
              ruc: '',
              tipo: 'F',
              esAcumulado: false,
              servidor: 0,
            },
          );
          break;
        case 'F':
          await this.listoSoftService.deleteCollectionByBalanceRef(
            this.db,
            'statement_financial_position',
            balanceRef,
            {
              mes: Number(month),
              periodo: Number(year),
              codigo: '',
              ruc: '',
              tipo: 'F',
              esAcumulado: false,
              servidor: 0,
            },
          );
          break;
        default:
          break;
      }
      let batch = this.db.batch();
      const client = (await this.auth.getClient()) as any;
      const googleSheet = google.sheets({
        version: 'v4',
        auth: client,
      });

      const requestData = (
        await googleSheet.spreadsheets.values.get({
          auth: this.auth,
          spreadsheetId: googleSheetId,
          range: `${month}-${year}!A2:F`,
        })
      ).data;
      const data = requestData.values;
      const registrosSubidos = [];

      if (data == null || data.length == 0) {
        console.log('No hay datos para el rango seleccionado');
        return balancesSaved;
      }

      for (let i = 0; i < data.length; i++) {
        const element = data[i];
        let newDocRef: DocumentReference;
        switch (tipoBalance) {
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
        data[i][6] = newDocRef;

        const newDocData = {
          id: newDocRef.id,
          orden: String(i + 1),
          codigo: String(element[0]),
          cuenta: String(element[1]).trim(),
          parcial: 0,
          subtotal: 0,
          total: Number(element[2].replace(/,/g, '')) || 0,
          ejercicio: `${year}-${month}`,
          periodo: Number(year),
          mes: Number(month),
          valor: Math.round(Number(element[2].replace(/,/g, ''))) || 0,
          nivel: Number(element[3]),
          nota: String(element[4]) || '',
          tipo: String(element[5]),
          codigo2: String(element[0]),
          balanceId: balanceRef,
          statementIncomeFatherId: null,
          statementFinancialFatherId: null,
        };
        while (count < data.length) {
          if (data[i - 1 - count] && String(element[0])) {
            if (String(element[0]).startsWith(data[i - 1 - count][0])) {
              switch (tipoBalance) {
                case 'I':
                  newDocData.statementIncomeFatherId = data[i - 1 - count][6];
                  break;
                case 'F':
                  newDocData.statementFinancialFatherId =
                    data[i - 1 - count][6];
                  break;
                default:
                  break;
              }
              break;
            }
          }
          count++;
        }
        batch.set(newDocRef, newDocData);
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

      // Hacer commit del último batch si tiene operaciones pendientes
      if (batchCount > 0) {
        await batch.commit();
      }
      return balancesSaved;
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtiene registros de la coleccion de compañias y balances y actualiza o guarda.
   * @return {number} Devuelve la cantidad de registros agregados.
   */
  async getDataGSheetMacro(): Promise<number> {
    let balancesSaved: number = 0;
    try {
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
            .where('gSheet', '==', true)
            .get()
        ).docs.map((doc) => {
          return doc;
        });
        if (balances.length == 0) {
          console.log(
            `No hay balances de Google Spreadsheet para la compañía: ${company.data().CompanyName}`,
          );
          continue;
        }
        for (const balance of balances) {
          const sheetId =
            balance.data().gSheetCodeSFP || balance.data().gSheetCodeSI;
          const tipoBalance = balance.data().gSheetCodeSI ? 'I' : 'F';
          balancesSaved =
            balancesSaved +
            (await this.getDataGSheet(
              tipoBalance,
              month,
              year,
              company.data().RUC,
              balance.ref,
              sheetId,
            ));
        }
      }
      return balancesSaved;
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
