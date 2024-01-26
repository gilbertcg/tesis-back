const express = require('express');
const router = express.Router();
// Controllers

const ClientController = require('../../controllers/client/client');

// client routes
router.post('/processText', ClientController.processText);

module.exports = router;
