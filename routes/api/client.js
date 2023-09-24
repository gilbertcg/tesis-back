const express = require('express');
const router = express.Router();
// Controllers
const ClientController = require('../../controllers/client/client');
const auth = require('../../routes/auth');

// client routes
router.get('/me', auth.client, auth.loggingIn.required, auth.log(1), ClientController.getClient);
router.post('/login', ClientController.login);
router.post('/register', ClientController.register);

module.exports = router;
