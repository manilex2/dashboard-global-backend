/* eslint-disable max-len */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const axios = require("axios");
const instance = axios.create({
  baseURL: `${process.env.LISTOSOFT_URL_ENDPOINT}`,
  headers: {"Authorization": process.env.LISTOSOFT_API_KEY},
});
const {getFirestore} = require("firebase-admin/firestore");

/**
 * Borrar todos los registros de la coleccion de Situación Financiera o Estado de Resultados.
 * @param {FirebaseFirestore.Firestore} db Instancia de la Base de datos de Firestore.
 * @param {string} collectionName Nombre de la colección.
 * @param {FirebaseFirestore.DocumentReference} balanceRef Referencia del registro de Balance.
 * @return {string} Resultado de la operación.
 */
async function deleteCollectionByBalanceRef(db, collectionName, balanceRef) {
  const batchSize = 100; // Límite de documentos a eliminar en un solo lote
  try {
    const collectionRef = db.collection(collectionName).where("balanceId", "==", balanceRef);
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

router.post("/", async (req, res) => {
  try {
    if (!req.body.periodo || !req.body.mes || !req.body.codigo || !req.body.ruc || !req.body.tipo) {
      throw new Error("Campo período, mes, código, ruc y tipo son obligatorios.");
    } else if (req.body.tipo == "I" && req.body.esAcumulado == null) {
      throw new Error("Cuando tipo es estado de resultado integral es necesario que indique si es acumulado o no");
    }
    const db = getFirestore();
    const companyRef = (await db.collection("companies").where("RUC", "==", req.body.ruc).limit(1).get()).docs[0].ref;
    let balanceRef;
    switch (req.body.tipo) {
      case "I":
        balanceRef = (await db.collection("balance").where("companyId", "==", companyRef).where("balanceType", "==", "incomeStatement").limit(1).get()).docs[0].ref;
        break;
      case "F":
        balanceRef = (await db.collection("balance").where("companyId", "==", companyRef).where("balanceType", "==", "balanceSheet").limit(1).get()).docs[0].ref;
        break;
      default:
        break;
    }
    switch (req.body.tipo) {
      case "I":
        await deleteCollectionByBalanceRef(db, "statement_income", balanceRef);
        break;
      case "F":
        await deleteCollectionByBalanceRef(db, "statement_financial_position", balanceRef);
        break;
      default:
        break;
    }
    const batch2 = db.batch();
    const response = await instance.post("SituacionFinanciera", {
      periodo: req.body.periodo,
      mes: req.body.mes,
      codigo: req.body.codigo,
      ruc: req.body.ruc,
      tipo: req.body.tipo,
      codigoCentroCosto: req.body.codigoCentroCosto || null,
      codigoSubCentroCosto: req.body.codigoSubCentroCosto || null,
      codigoSucursal: req.body.codigoSucursal || null,
      esAcumulado: req.body.esAcumulado || true,
    });
    const registrosSubidos = [];
    for (let i = 0; i < response.data.length; i++) {
      const element = response.data[i];
      if (!element.codigo) {
        continue;
      }
      let newDocRef;
      switch (req.body.tipo) {
        case "I":
          newDocRef = db.collection("statement_income").doc();
          break;
        case "F":
          newDocRef = db.collection("statement_financial_position").doc();
          break;
        default:
          break;
      }
      let count = 0;

      response.data[i].ref = newDocRef;

      const newDocData = {
        id: newDocRef.id,
        orden: element.orden,
        codigo: element.codigo,
        cuenta: element.cuenta.trim(),
        parcial: element.parcial || 0,
        subtotal: element.subtotal || 0,
        total: element.total || 0,
        ejercicio: element.ejercicio,
        periodo: req.body.periodo,
        mes: req.body.mes,
        valor: element.valor || 0,
        nivel: element.nivel,
        nota: element.nota,
        tipo: element.tipo,
        codigo2: element.codigo2,
        balanceId: balanceRef,
      };
      while (count < response.data.length) {
        if (response.data[i-1-count] && element.codigo) {
          if (element.codigo.startsWith(response.data[i-1-count].codigo)) {
            switch (req.body.tipo) {
              case "I":
                newDocData.statementIncomeFatherId = response.data[i-1-count].ref;
                break;
              case "F":
                newDocData.statementFinancialFatherId = response.data[i-1-count].ref;
                break;
              default:
                break;
            }
            break;
          }
        }
        count++;
      }
      batch2.set(newDocRef, newDocData);
      registrosSubidos.push(newDocData);
      count = 0;
    }
    await batch2.commit();
    res.status(200).send(registrosSubidos);
  } catch (error) {
    console.error("Error obteniendo data desde ListoSoft API:", error);
    res.status(500).send({status: 500, message: `Ocurrió el siguiente error: ${error}`});
  }
});

module.exports = router;
