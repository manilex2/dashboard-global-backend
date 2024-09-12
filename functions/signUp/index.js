/* eslint-disable max-len */
require("dotenv").config({path: "./.env"});
const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const {getFirestore} = require("firebase-admin/firestore");

admin.initializeApp();
setGlobalOptions({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: "1GiB",
});

const signUp = async (req, res) => {
  const body = req.body;
  if (!body.clave || !body.email) {
    throw new Error("BAD REQUEST: No se proporcionó una clave y/o email");
  }
  const auth = admin.auth();
  const db = getFirestore();
  try {
    const users = (await db.collection("users").get()).docs.map((user) => {
      return user.data();
    });
    const created = users.some((resp) => resp.email === req.body.email);
    if (!created) {
      const newUserRef = db.collection("users").doc();
      const user = {
        email: body.email,
        displayName: body.display_name,
        password: `${body.clave}`,
      };
      try {
        const userFirebase = await auth.createUser({...user, uid: `${newUserRef.id}`});
        console.log("Usuario creado con éxito:", userFirebase.uid);
        try {
          const usuario = {
            email: body.email,
            display_name: body.display_name,
            photo_url: !body.photo_url? "" : body.photo_url,
            phone_number: body.phone_number,
            rol: body.rol.toLowerCase(),
            uid: userFirebase.uid,
            created_time: new Date(userFirebase.metadata.creationTime),
            firstLogin: true,
          };
          newUserRef.set(usuario);
        } catch (error) {
          throw new Error(error);
        }
      } catch (error) {
        console.error("Error al crear usuario:", error);
        throw new Error(error);
      }
    } else {
      throw new Error("El usuario ya se encuentra creado.");
    }
    res.status(201).send({message: "Usuario creado exitósamente."});
  } catch (error) {
    console.error("Error al registrar usuario: ", error);
    res.setHeader("Content-Type", "application/json");

    // Utiliza el message del objeto Error
    const errorMessage = error.message || "Ocurrió un error desconocido";

    // Chequea el tipo de error con los mensajes que iniciaste en los throw
    if (errorMessage.startsWith("BAD REQUEST")) {
      res.status(400).json({
        message: `Solicitud incorrecta: ${errorMessage}`,
      });
    } else if (errorMessage.startsWith("UNAUTHORIZED")) {
      res.status(401).json({
        message: `Error de autorización: ${errorMessage}`,
      });
    } else if (errorMessage.startsWith("FORBIDDEN")) {
      res.status(403).json({
        message: `Prohibido: ${errorMessage}`,
      });
    } else if (errorMessage.startsWith("NOT FOUND")) {
      res.status(404).json({
        message: `Recurso no encontrado: ${errorMessage}`,
      });
    } else if (errorMessage.startsWith("CONFLICT")) {
      res.status(409).json({
        message: `Conflicto: ${errorMessage}`,
      });
    } else {
      res.status(500).json({
        message: `Error interno del servidor: ${errorMessage}`,
      });
    }
  }
};

exports.singUp = onRequest((req, res) => {
  const allowedOrigins = [
    "https://globso.flutterflow.app",
    "https://app.flutterflow.io/debug",
  ];

  const origin = req.headers.origin;

  // Verifica si el origen de la solicitud está en la lista de orígenes
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Manejo de solicitud preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Aquí puedes seguir con tu lógica principal (createPdf)
  signUp(req, res);
});
