const express = require('express');
const router = express.Router();
// Controllers

const auth = require('../../routes/auth');

const ClientController = require('../../controllers/client/client');

// client routes
router.get('/client/me', auth.client, auth.loggingIn.required, ClientController.getClient);
router.post('/login', ClientController.login);
router.post('/register', ClientController.register);
router.get('/client/templates', auth.client, auth.loggingIn.required, ClientController.getTemplates);
router.post('/processText', auth.client, auth.loggingIn.required, ClientController.processText);
router.post('/translateText', auth.client, auth.loggingIn.required, ClientController.translateText);

module.exports = router;
