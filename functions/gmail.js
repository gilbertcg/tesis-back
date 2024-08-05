const Imap = require('imap');
const mongoose = require('mongoose');
const { simpleParser } = require('mailparser');
const Emails = mongoose.model('Emails');
const nodemailer = require('nodemailer');

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
              let type = 'Recibido';
              if (mailbox === 'INBOX') {
                type = 'Recibido';
              } else if (mailbox === 'Sent') {
                type = 'Enviado';
              } else if (mailbox === 'Drafts') {
                type = 'Borrador';
              }
              emailsArray.push({
                subject: mail.subject,
                messageId: mail.messageId,
                from: mail.from.text,
                body: mail.text,
                date: mail.date,
                type,
                url: `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(mail.messageId)}`,
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

async function saveEmails(emails, clientID) {
  const savePromises = emails.map(async email => {
    try {
      const gmailEmail = await Emails.findOne({ gmailID: email.messageId }).exec();
      if (!gmailEmail) {
        const newGmailEmail = new Emails({
          clientID: clientID,
          body: email.body,
          gmailID: email.messageId,
          from: email.from,
          subject: email.subject,
          type: email.type,
          gmailCreationDate: new Date(email.date),
          url: email.url,
          processed: false,
        });
        await newGmailEmail.save();
      }
    } catch (error) {
      console.log(error);
    }
  });

  await Promise.all(savePromises);
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
