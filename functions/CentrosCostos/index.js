/* eslint-disable max-len */
require("dotenv").config("./.env");
const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: "1GiB",
});

const CentrosCostos = async (req, res) => {
  try {
    if (req.headers.authorization != process.env.LISTOSOFT_API_KEY) {
      throw new Error("No autorizado");
    }
    const data = [
      {
        centroCostoID: 2,
        codigo: "PRYA",
        nombre: "PROYECTO A",
        centroCostoIDPadre: null,
      },
      {
        centroCostoID: 3,
        codigo: "PRYB",
        nombre: "PROYECTO B",
        centroCostoIDPadre: null,
      },
      {
        centroCostoID: 4,
        codigo: "MAQXY",
        nombre: "MAQXY",
        centroCostoIDPadre: null,
      },
      {
        centroCostoID: 19,
        codigo: "1.1.1",
        nombre: "TALLER REGIONAL",
        centroCostoIDPadre: 2,
      },
      {
        centroCostoID: 20,
        codigo: "1.1.2",
        nombre: "TALLERES NACIONALES",
        centroCostoIDPadre: 2,
      },
    ];
    res.status(200).json(data);
  } catch (error) {
    if (error.message == "No autorizado") {
      res.status(401).send({status: 401, message: `La autorización no es correcta.`});
    }
    res.status(500).send({status: 500, message: `Ocurrió el siguiente error: ${error}`});
  }
};

exports.CentrosCostos = onRequest({
  cors: [/globso\.flutterflow\.app$/, /app\.flutterflow\.io\/debug$/],
}, CentrosCostos);
