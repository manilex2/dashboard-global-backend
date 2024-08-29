/* eslint-disable max-len */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const axios = require("axios");
const instance = axios.create({
  baseURL: `${process.env.LISTOSOFT_URL_ENDPOINT}`,
  headers: {"LApiKey": process.env.LISTOSOFT_API_KEY},
});
const {getFirestore} = require("firebase-admin/firestore");

router.get("/", async (req, res) => {
  try {
    const response = await instance.get("CentrosCostos");
    const db = getFirestore();
    const centrosCosto = (await db.collection("costCenters").get()).docs.map((doc) => {
      const data = doc.data();
      data.id = doc.id; // Asegurarse de que el id del documento está disponible
      return data;
    });
    const nuevosCentrosCosto = response.data.filter((item1) =>
      !centrosCosto.some((item2) => item1.centroCostoID === item2.costCenterIdNumber),
    );

    const batch = db.batch();
    const nuevosCentrosCostoMap = new Map();
    const registrosSubidos = [];

    // Crear documentos en batch
    nuevosCentrosCosto.forEach((item) => {
      const newDocRef = db.collection("costCenters").doc();
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
    });

    // Actualizar los documentos en batch con los padres
    nuevosCentrosCosto.forEach((item, i) => {
      if (item.centroCostoIDPadre) {
        let costCenterFatherRef = null;

        const padreExistente = centrosCosto.find((centro) => centro.costCenterIdNumber === item.centroCostoIDPadre);
        if (padreExistente) {
          costCenterFatherRef = db.collection("costCenters").doc(padreExistente.id);
        } else {
          costCenterFatherRef = nuevosCentrosCostoMap.get(item.centroCostoIDPadre);
        }

        if (costCenterFatherRef) {
          const newDocRef = nuevosCentrosCostoMap.get(item.centroCostoID);
          batch.update(newDocRef, {costCenterFatherRef});

          // Actualizar el registro en registrosSubidos
          const registro = registrosSubidos.find((doc) => doc.id === newDocRef.id);
          if (registro) {
            registro.costCenterFatherRef = costCenterFatherRef;
          }
        }
      }
    });

    await batch.commit();
    res.status(200).send(registrosSubidos);
  } catch (error) {
    console.error("Error obteniendo data desde ListoSoft API:", error);
    res.status(500).send({status: 500, message: `Ocurrió el siguiente error: ${error}`});
  }
});

module.exports = router;
