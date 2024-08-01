const Imap = require('imap');
const mongoose = require('mongoose');
const moment = require('moment');

const { simpleParser } = require('mailparser');
const Emails = mongoose.model('Emails');
const pineconeController = require('../config/pinecone-client');
const { PINECONE_INDEX_NAME_EMAILS } = process.env;

function getEmails(email, password, startDate, endDate) {
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
      imap.search(
        [
          ['SINCE', startDate],
          ['BEFORE', endDate],
        ],
        (err, results) => {
          if (err) throw err;
          if (results.length === 0) {
            console.log('No unread emails found.');
            imap.end();
            return emailsArray; // Retorna aunque el arreglo esté vacío
          }
          const f = imap.fetch(results, { bodies: '' });

          f.on('message', msg => {
            msg.on('body', stream => {
              simpleParser(stream, (err, mail) => {
                if (err) throw err;
                emailsArray.push({
                  subject: mail.subject,
                  messageId: mail.messageId,
                  from: mail.from.text,
                  body: mail.text,
                  date: mail.date,
                });
              });
            });
          });

          f.once('end', () => {
            console.log('Done fetching all messages!');
            imap.end();
          });
        },
      );
    });
  });

  imap.once('end', () => {
    console.log('Connection ended');
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

Contenido:
${email.body}

------------------------------------
    `;
  }
  return emailsText;
}

module.exports = {
  getEmails,
  saveEmails,
};
