const Imap = require('imap');
const mongoose = require('mongoose');

const { simpleParser } = require('mailparser');
const Emails = mongoose.model('Emails');

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

module.exports = {
  getEmails,
  saveEmails,
};
