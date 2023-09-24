module.exports = {
  secret: process.env.NODE_ENV === 'production' ? process.env.SECRET : 'secret',
  URL: process.env.NODE_ENV === 'production' ? process.env.URL : 'http://localhost:5000',
  MAIL: process.env.MAIL,
};
