import admin from 'firebase-admin';
import config from './index.js';

const initializeFirebase = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'),
        clientEmail: config.firebase.clientEmail,
      }),
      databaseURL: config.firebase.databaseUrl
    });
  }
  return admin;
};

export default initializeFirebase;
