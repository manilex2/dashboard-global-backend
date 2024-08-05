const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const express = require("express");
const appExpress = express();
const costCenter = require("./costCenter/costCenter");
// eslint-disable-next-line max-len
const estadoSituacionResultado = require("./estadoSituacionResultado/estadoSituacionResultado");

admin.initializeApp();

setGlobalOptions({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: "1GiB",
});

appExpress.use(express.json());
appExpress.use(express.urlencoded({extended: true}));

appExpress.use("/costCenter", costCenter);
appExpress.use("/estadoSituacionResultado", estadoSituacionResultado);

exports.listoSoft = onRequest({
  cors: [/globso\.flutterflow\.app$/, /app\.flutterflow\.io\/debug$/],
}, appExpress);
