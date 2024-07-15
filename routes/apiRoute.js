const express = require('express');
const { fetchData, ridInfo, resend, search } = require('../controllers/apiController');

const router = express.Router();

router.post('/fetchdata', fetchData);
router.post('/ridinfo', ridInfo);
router.post('/resend', resend);
router.post('/search', search);

module.exports = router;
