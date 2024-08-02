const Imap = require('imap');
const mongoose = require('mongoose');
const moment = require('moment');
const nodemailer = require('nodemailer');

const { simpleParser } = require('mailparser');
const Emails = mongoose.model('Emails');
const pineconeController = require('../config/pinecone-client');
const { PINECONE_INDEX_NAME_EMAILS } = process.env;

function getEmails(email, password, searchFilters) {
  const imapConfig = {
    user: email,
    password: password,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false,
    },
    authTimeout: 3000,
  };
  const imap = new Imap(imapConfig);
  let emailsArray = [];

  function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
  }

  imap.once('ready', () => {
    openInbox(err => {
      if (err) throw err;
      imap.search(searchFilters, (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
          console.log('No unread emails found.');
          imap.end();
          return emailsArray;
        }
        const f = imap.fetch(results, { bodies: '' });

        f.on('message', msg => {
          msg.on('body', stream => {
            simpleParser(stream, (err, mail) => {
              if (err) throw err;
              const mailbox = imapConfig.mailbox || 'INBOX';
              let type = 'received';
              if (mailbox === 'INBOX') {
                type = 'received';
              } else if (mailbox === 'Sent') {
                type = 'sent';
              } else if (mailbox === 'Drafts') {
                type = 'draft';
              }
              emailsArray.push({
                subject: mail.subject,
                messageId: mail.messageId,
                from: mail.from.text,
                body: mail.text,
                date: mail.date,
                type,
              });
            });
          });
        });

        f.once('end', () => {
          imap.end();
        });
      });
    });
  });

  imap.connect();

  return new Promise((resolve, reject) => {
    imap.once('end', () => {
      resolve(emailsArray);
    });

    imap.once('error', err => {
      reject(err);
    });
  });
}

function saveEmails(emails, clientID) {
  const emailsFromated = formatEmailsToText(emails);
  pineconeController.saveTextPinecone(PINECONE_INDEX_NAME_EMAILS, clientID, emailsFromated, {});
  for (const email of emails) {
    Emails.findOne({ gmailID: email.messageId }).exec((error, gmailEmail) => {
      if (error) {
        console.log(error);
      }
      if (!gmailEmail) {
        const newGemailEmail = new Emails({
          clientID: clientID,
          body: email.body,
          gmailID: email.messageId,
          from: email.from,
          subject: email.subject,
          type: email.type,
          gmailCreationDate: new Date(email.date),
        });
        newGemailEmail.save();
      }
    });
  }
}

function formatEmailsToText(emails) {
  let emailsText = '------------------------------------\n';
  for (const email of emails) {
    const formattedDate = moment(email.date).format('MMM DD, YYYY');

    emailsText += `
Email ID: ${email.messageId}
Fecha: ${formattedDate}
Para: ${email.from}
Asunto: ${email.subject}
Tipo: ${email.type}

Contenido:
${email.body}

------------------------------------
    `;
  }
  return emailsText;
}

async function sendEmail(to, subject, text, email, pass) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: pass,
      },
    });

    const mailOptions = {
      from: `<${email}>`,
      to: to,
      subject: subject,
      text: text,
    };

    const info = await transporter.sendMail(mailOptions);
    return 'Mensaje enviado id:' + info.messageId;
  } catch (error) {
    console.error('Error enviando el correo: ', error);
    return 'Error al enviar el correo';
  }
}

module.exports = {
  getEmails,
  saveEmails,
  sendEmail,
};
