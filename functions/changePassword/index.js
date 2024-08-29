
const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: "1GiB",
});

const changePassword = async (req, res) => {
  const auth = admin.auth();
  try {
    if (!req.body.clave) {
      throw Error("Falta la nueva clave");
    } else if (!req.body.uid) {
      throw Error("Falta el uid del usuario a cambiar");
    } else if (!req.body.email) {
      throw Error("Falta el email del usuario");
    }
    await auth.updateUser(`${req.body.uid}`, {
      password: `${req.body.clave}`,
    });
    res.status(200).send({
      status: 200,
      // eslint-disable-next-line max-len
      message: `Contraseña cambiada exitosamente para el usuario: ${req.body.email}`,
    });
  } catch (error) {
    res.status(403).send({
      status: 403,
      message: `Ocurrió el siguiente error: ${error}`,
    });
  }
};

exports.changePassword = onRequest({
  cors: [/globso\.flutterflow\.app$/, /app\.flutterflow\.io\/debug$/],
}, changePassword);
