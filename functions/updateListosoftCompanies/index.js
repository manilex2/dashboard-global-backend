/* eslint-disable max-len */
require("dotenv").config("./.env");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

setGlobalOptions({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: "1GiB",
});

// Programar la función
exports.updateListosoftCompanies = onSchedule({
  timeZone: "America/Guayaquil",
  schedule: "0 10 10-14 * *",
}, async () => {
  try {
    // Realiza una solicitud HTTP a la función existente
    const response = await axios.post(`${process.env.URL_FUNCTIONS}/listosoft/balances`);
    console.log("Respuesta de la función:", response.data);
  } catch (error) {
    console.error("Error al llamar a la función:", error);
  }
});
