const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');  // Your service account JSON

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
