const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();

const auth = require('../../routes/auth');

const AuthController = require('../../controllers/auth');
const ChatbotController = require('../../controllers/chatbot');
const EmailsController = require('../../controllers/emails');
const DocumentsController = require('../../controllers/documents');
const TemplatesController = require('../../controllers/templates');

//auth
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/client/me', auth.client, auth.loggingIn.required, AuthController.getClient);
router.put('/client', auth.client, auth.loggingIn.required, AuthController.update);

// files
router.post('/client/pdf', auth.client, auth.loggingIn.required, upload.single('pdf'), DocumentsController.setPdf);
router.get('/client/files', auth.client, auth.loggingIn.required, DocumentsController.getFiles);

// templates
router.get('/client/templates', auth.client, auth.loggingIn.required, TemplatesController.getTemplates);
router.post('/client/processText', auth.client, auth.loggingIn.required, TemplatesController.processText);
router.post('/client/translateText', auth.client, auth.loggingIn.required, TemplatesController.translateText);
router.post(
  '/client/processAudio',
  auth.client,
  auth.loggingIn.required,
  upload.single('audio'),
  TemplatesController.processAudio,
);

// emails
router.post('/client/resumeText', auth.client, auth.loggingIn.required, EmailsController.resumeConversation);
router.get('/client/emails', auth.client, auth.loggingIn.required, EmailsController.getEmails);
router.post('/client/emails', auth.client, auth.loggingIn.required, EmailsController.updateEmails);

// chatbot
router.post('/client/chatbot', auth.client, auth.loggingIn.required, ChatbotController.chatbot);

module.exports = router;
