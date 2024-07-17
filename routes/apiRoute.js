const express = require('express');
const { fetchData, ridInfo, resend, search, matchReg, getDemoData, updateDemoData} = require('../controllers/apiController');

const router = express.Router();

router.post('/fetchdata', fetchData);
router.post('/ridinfo', ridInfo);
router.post('/resend', resend);
router.post('/search', search);
router.post('/matchreg', matchReg);
router.post('/getdemodata', getDemoData);
router.post('/updatedemodata', updateDemoData);

module.exports = router;
