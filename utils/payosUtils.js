// utils/payosUtils.js
const crypto = require('crypto');

function sortObjDataByKey(object = {}) {
  const orderedObject = Object.keys(object)
    .sort()
    .reduce((obj, key) => {
      obj[key] = object[key];
      return obj;
    }, {});
  return orderedObject;
}

function convertObjToQueryStr(object = {}) {
  return Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .map((key) => {
      let value = object[key];

      // Nếu là mảng, JSON stringify từng phần đã sort
      if (value && Array.isArray(value)) {
        value = JSON.stringify(value.map((val) => sortObjDataByKey(val)));
      }

      // Null/undefined -> empty string
      if (value === null || value === undefined || value === 'undefined' || value === 'null') {
        value = '';
      }

      return `${key}=${value}`;
    })
    .join('&');
}

function generateSignature(data = {}, checksumKey) {
  const sortedData = sortObjDataByKey(data);
  const queryStr = convertObjToQueryStr(sortedData);
  const signature = crypto.createHmac('sha256', checksumKey).update(queryStr).digest('hex');
  return signature;
}

module.exports = {
  sortObjDataByKey,
  convertObjToQueryStr,
  generateSignature,
};
