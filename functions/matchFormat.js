const moment = require('moment');

const TypesOr = {
  regexp: 1,
  date: 2,
  number: 3,
  translate: 4,
  page: 5,
};

const TypesAnd = {
  regexp: 1,
  date: 2,
  number: 3,
  boolean: 4,
  page: 5,
};

const set = async (query, ors) => {
  let res = { $or: [] };
  let object = {};
  let translation = {
    verified_null: 'No verificado',
    verified_false: 'No verificado',
    verified_true: 'Verificado',
  };
  for (const item of ors) {
    object = {};
    if (item.typeOr === TypesOr.regexp) {
      object[item.value] = { $regex: query, $options: 'i' };
      res.$or.push(object);
    }
    if (item.typeOr === TypesOr.number) {
      const number = Number(query);
      if (!isNaN(number)) {
        object[item.value] = number;
        res.$or.push(object);
      }
    }
    if (item.typeOr === TypesOr.translate) {
      for (const [key, value] of Object.entries(translation)) {
        if (value.toLowerCase() === query.toLowerCase()) {
          object[item.value] = formatTypeValue(key.replace(item.label, ''));
          res.$or.push(object);
        }
      }
    }

    if (item.typeOr === TypesOr.date) {
      if (!isNaN(Date.parse(query))) {
        let date = new Date(query);
        date = moment(date);
        object[item.value] = {
          $gte: date.startOf('day').toDate(),
          $lt: date.endOf('day').toDate(),
        };
        res.$or.push(object);
      }
    }
  }
  return res;
};

const formatTypeValue = text => {
  if (text === 'true') {
    return true;
  } else if (text === 'false') {
    return false;
  } else if (!isNaN(text)) {
    return Number(text);
  } else {
    return text;
  }
};

module.exports = {
  set,
  TypesAnd,
  TypesOr,
};
