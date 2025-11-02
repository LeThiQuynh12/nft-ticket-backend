// backend/routes/location.js
const express = require('express');
const router = express.Router();
const { getProvinces, getDistricts, getWards } = require('../controllers/locationController');

router.get('/provinces', getProvinces);
router.get('/provinces/:provinceCode/districts', getDistricts);
router.get('/districts/:districtCode/wards', getWards);

module.exports = router;