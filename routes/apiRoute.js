const express = require('express');
const { fetchData, ridInfo, resend, search, matchReg, getDemoData, updateDemoData, transactionHistory,reproccess} = require('../controllers/apiController');

const router = express.Router();

router.post('/fetchdata', fetchData);
router.post('/ridinfo', ridInfo);
router.post('/resend', resend);
router.post('/search', search);
router.post('/matchreg', matchReg);
router.post('/getdemodata', getDemoData);
router.post('/updatedemodata', updateDemoData);
router.post('/transactionHistory', transactionHistory)
router.post('/reproccess', reproccess)

module.exports = router;
