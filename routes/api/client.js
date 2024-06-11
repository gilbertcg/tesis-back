const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();

const auth = require('../../routes/auth');

const ClientController = require('../../controllers/client/client');

// client routes
router.get('/client/me', auth.client, auth.loggingIn.required, ClientController.getClient);
router.post('/login', ClientController.login);
router.post('/register', ClientController.register);
router.post('/client/pdf', auth.client, auth.loggingIn.required, upload.single('pdf'), ClientController.setPdf);
router.get('/client/files', auth.client, auth.loggingIn.required, ClientController.getFiles);
router.get('/client/templates', auth.client, auth.loggingIn.required, ClientController.getTemplates);
router.post('/processText', auth.client, auth.loggingIn.required, ClientController.processText);
router.post('/translateText', auth.client, auth.loggingIn.required, ClientController.translateText);
router.get('/pineconeFile', ClientController.getFilesPinecone);

module.exports = router;
