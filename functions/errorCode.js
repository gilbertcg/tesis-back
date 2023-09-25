const set = (code, message, error) => {
  return { code, errorCode: message, message, error: error ? JSON.stringify(error) : null };
};

module.exports = {
  set,
};
