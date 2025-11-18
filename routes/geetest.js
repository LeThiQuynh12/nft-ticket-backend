const express = require("express");
const router = express.Router();
const { register } = require("../controllers/geetestController");

router.get("/register", register);

module.exports = router;
