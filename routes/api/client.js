const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();

const auth = require('../../routes/auth');

const ClientController = require('../../controllers/client');
const AuthController = require('../../controllers/auth');

// client routes
router.get('/client/me', auth.client, auth.loggingIn.required, AuthController.getClient);
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/client/pdf', auth.client, auth.loggingIn.required, upload.single('pdf'), ClientController.setPdf);
router.get('/client/files', auth.client, auth.loggingIn.required, ClientController.getFiles);
router.get('/client/templates', auth.client, auth.loggingIn.required, ClientController.getTemplates);
router.post('/client/processText', auth.client, auth.loggingIn.required, ClientController.processText);
router.post('/client/translateText', auth.client, auth.loggingIn.required, ClientController.translateText);
router.post('/client/resumeText', auth.client, auth.loggingIn.required, ClientController.resumeConversation);
router.post(
  '/client/processAudio',
  auth.client,
  auth.loggingIn.required,
  upload.single('audio'),
  ClientController.processAudio,
);

module.exports = router;
