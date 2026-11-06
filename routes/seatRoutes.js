
const express = require("express");
const router = express.Router();

const seatController = require("../controllers/seatController");

router.get("/event/:eventId", seatController.getEventSeats);

module.exports = router;