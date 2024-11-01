import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { Usuario } from './auth.interface';

@Injectable()
export class AuthService {
  db: FirebaseFirestore.Firestore = getFirestore();

  /**
   * Función para cambiar contraseña en Vanu
   * @param {Usuario} usuario parámetros del usuario para cambiar la contreaseña
   * @return {string} Mensaje si la contraseña del usuario fue cambiada exitosamente.
   */
  async changePassword(usuario: Usuario): Promise<string> {
    const auth = getAuth();
    const users = (
      await this.db
        .collection('users')
        .where('email', '==', usuario.email)
        .get()
    ).docs.map((user) => {
      return user.data();
    });

    if (users.length > 0) {
      const user = {
        id: users[0].id,
        email: usuario.email,
        password: `${usuario.clave}`,
      };
      try {
        await auth.updateUser(`${user.id}`, {
          password: `${user.password}`,
        });
        console.log(
          `Contraseña cambiada exitosamente para el usuario: ${user.email}`,
        );
        const usuarioDB = {
          firstLogin: false,
        };
        await this.db.doc(user.id).update(usuarioDB);
      } catch (error) {
        console.error('Error al cambiar contraseña de usuario:', error);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } else {
      throw new HttpException(
        'El usuario no se encuentra creado.',
        HttpStatus.NOT_FOUND,
      );
    }
    return 'Contraseña cambiada exitosamente.';
  }

  /**
   * Función para crear usuario en Vanu
   * @param {Usuario} usuario parámetros del usuario para registrar
   * @return {string} Mensaje si el usuario fue registrado exitosamente.
   */
  async signUp(usuario: Usuario): Promise<string> {
    const auth = getAuth();
    const users = (await this.db.collection('users').get()).docs.map((user) => {
      return user.data();
    });
    const created = users.some((resp) => resp.email === usuario.email);
    if (!created) {
      const newUserRef = this.db.collection('users').doc();
      const user = {
        email: usuario.email,
        displayName: usuario.display_name,
        password: `${usuario.clave}`,
      };
      try {
        const userFirebase = await auth.createUser({
          ...user,
          uid: `${newUserRef.id}`,
        });
        console.log('Usuario creado con éxito:', userFirebase.uid);
        try {
          const usuarioDB = {
            email: usuario.email,
            display_name: usuario.display_name,
            photo_url: !usuario.photo_url ? '' : usuario.photo_url,
            phone_number: usuario.phone_number,
            rolName: !usuario.rolName
              ? ''
              : usuario.rolName.charAt(0).toUpperCase() +
                usuario.rolName.slice(1).toLowerCase(),
            uid: userFirebase.uid,
            created_time: new Date(userFirebase.metadata.creationTime),
            firstLogin: true,
          };
          newUserRef.set(usuarioDB);
        } catch (error) {
          throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      } catch (error) {
        console.error('Error al crear usuario:', error);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } else {
      throw new HttpException(
        'El usuario ya se encuentra creado.',
        HttpStatus.CONFLICT,
      );
    }
    return 'Usuario creado con éxito';
  }
}
