//verifies the ID tokens sent by clients that have already authenticated via Firebase  
const admin = require('../config/firebase');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;  // Attach user info to request object
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: token verification failed' });
  }
}

module.exports = authenticateToken;
