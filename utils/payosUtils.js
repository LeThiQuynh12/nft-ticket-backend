const crypto = require("crypto");


function sortObjDataByKey(object = {}) {
  if (
    !object ||
    typeof object !== "object" ||
    Array.isArray(object)
  ) {
    return {};
  }

  return Object.keys(object)
    .sort()
    .reduce((result, key) => {
      result[key] = object[key];
      return result;
    }, {});
}

function convertObjToQueryStr(object = {}) {
  const sortedObject = sortObjDataByKey(object);

  return Object.keys(sortedObject)
    .filter((key) => sortedObject[key] !== undefined)
    .map((key) => {
      let value = sortedObject[key];

      // Xử lý mảng
      if (Array.isArray(value)) {
        value = JSON.stringify(
          value.map((item) =>
            typeof item === "object" && item !== null
              ? sortObjDataByKey(item)
              : item
          )
        );
      }

      // Null và các giá trị đặc biệt chuyển thành chuỗi rỗng
      if (
        value === null ||
        value === undefined ||
        value === "undefined" ||
        value === "null"
      ) {
        value = "";
      }

      return `${key}=${value}`;
    })
    .join("&");
}

function generateSignature(data = {}, checksumKey) {
  if (!checksumKey || typeof checksumKey !== "string") {
    throw new Error("PAYOS_CHECKSUM_KEY không hợp lệ");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Dữ liệu tạo chữ ký PayOS không hợp lệ");
  }

  const sortedData = sortObjDataByKey(data);
  const queryString = convertObjToQueryStr(sortedData);

  return crypto
    .createHmac("sha256", checksumKey)
    .update(queryString)
    .digest("hex");
}


module.exports = {
  sortObjDataByKey,
  convertObjToQueryStr,
  generateSignature,
};
