module.exports = function (req, res, next) {
  // Regex phát hiện mọi thẻ HTML: <p>, <h1>, <script>, <img>, ...
  const htmlRegex = /<[^>]*>/g;

  function detectHTML(obj) {
    for (let key in obj) {
      const value = obj[key];

      if (typeof value === "string" && htmlRegex.test(value)) {
        return true;
      }

      if (typeof value === "object" && value !== null) {
        if (detectHTML(value)) return true;
      }
    }
    return false;
  }

  if (detectHTML(req.body) || detectHTML(req.query) || detectHTML(req.params)) {
    res.status(400).send(`
      <html>
      <head>
        <title>Server Error in '/' Application.</title>
        <style>
          body { font-family: Segoe UI, Arial; padding: 40px; }
          .title { font-size: 26px; font-weight: bold; color: #990000; }
          .box { margin-top: 20px; padding: 20px; border: 1px solid #ccc; background: #f9f9f9; }
          .gray { color: #555; }
        </style>
      </head>
      <body>
        <div class="title">Server Error in '/' Application.</div>
        <div class="box">
          <p class="gray">
            <b>Runtime Error</b><br><br>
            Description: Your request was blocked because it contains HTML tags.  
            The server has detected potentially unsafe input (XSS protection).
          </p>
        </div>
      </body>
      </html>
    `);
    return;
  }

  next();
};
