const express = require('express');
const router = express.Router();
// Controllers

const auth = require('../../routes/auth');

const ClientController = require('../../controllers/client/client');

// client routes
router.post('/processText', ClientController.processText);

// client routes
router.get('/me', auth.client, auth.loggingIn.required, ClientController.getClient);
router.post('/login', ClientController.login);
router.post('/register', ClientController.register);

module.exports = router;
