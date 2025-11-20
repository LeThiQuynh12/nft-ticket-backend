const sanitizeHtml = require("sanitize-html");

module.exports = function (req, res, next) {

  const cleanOptions = {
    allowedTags: [],   // 
    allowedAttributes: {} 
  };

  function clean(obj) {
    for (let key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = sanitizeHtml(obj[key], cleanOptions);
      }
      if (typeof obj[key] === "object" && obj[key] !== null) {
        clean(obj[key]);
      }
    }
  }

  if (req.body) clean(req.body);
  if (req.query) clean(req.query);
  if (req.params) clean(req.params);

  next();
};
