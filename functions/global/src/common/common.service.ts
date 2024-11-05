import { Injectable } from '@nestjs/common';
import { DocumentReference } from 'firebase-admin/firestore';
import { BalanceDTO } from './common.interface';

@Injectable()
export class CommonService {
  /**
   * Remover todas las propiedades no definidas o nulas de un objeto.
   * @param {object} obj Objeto a verificar.
   * @return {object} Resultado del objeto quitadas las propiedades no definidas o nulas.
   */
  removeEmptyProperties(obj: object): object {
    return Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined),
    );
  }

  /**
   * Borrar todos los registros de la coleccion de Situación Financiera o Estado de Resultados.
   * @param {FirebaseFirestore.Firestore} db Instancia de la Base de datos de Firestore.
   * @param {string} collectionName Nombre de la colección.
   * @param {DocumentReference} balanceRef Referencia del registro de Balance.
   * @param {BalanceDTO} body Cuerpo enviado que viene de la solicitud HTTP.
   * @return {string} Resultado de la operación.
   */
  async deleteCollectionByBalanceRef(
    db: FirebaseFirestore.Firestore,
    collectionName: string,
    balanceRef: DocumentReference,
    body: BalanceDTO,
  ): Promise<string> {
    const batchSize = 100; // Límite de documentos a eliminar en un solo lote
    try {
      const collectionRef = db
        .collection(collectionName)
        .where('balanceId', '==', balanceRef)
        .where('mes', '==', body.mes)
        .where('periodo', '==', body.periodo);
      let snapshot = await collectionRef.limit(batchSize).get();

      while (!snapshot.empty) {
        // Crear un batch para la eliminación
        const batch = db.batch();

        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();

        // Vuelve a obtener los documentos restantes
        snapshot = await collectionRef.limit(batchSize).get();
      }

      if (snapshot.empty) {
        console.log(`Colección "${collectionName}" eliminada con éxito.`);
        return `Colección "${collectionName}" eliminada con éxito.`;
      }
    } catch (error) {
      throw new Error(`Ocurrió el siguiente error: ${error}`);
    }
  }
}
