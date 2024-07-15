const axios = require('axios');
const { logger } = require('../middleware/logger');

exports.fetchData = async (req, res) => {
    const { beginDate, endDate, operationType } = req.body;
  
    logger.info(beginDate);
  
    try {
      const response = await axios.post(`${process.env.API_BASE_URL}/filterDataByDate`, {
        userId: "admin",
        type: operationType,
        successful: true,
        beginDate: beginDate,
        endDate: endDate,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      req.apiData = response.data; // Attach the data to the request object
      res.json(req.apiData); // Send the data back to the client
    } catch (error) {
      logger.error(error); // Log the error
      res.status(500).json({ success: false, error: 'Internal Server Error' }); // Send error response
    }
  };

exports.ridInfo = async (req, res) => {
    const { userId, regId } = req.body;
  
    const requestBody = {
      userId,
      regId,
    };
  
    try {
      const packetStatusResponse = await axios.post(`${process.env.API_BASE_URL}/packetStatus`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const packetStatusData = packetStatusResponse.data;
  
      if (packetStatusData.error === 'RID Not Found') {
        return res.json({ success: false, error: 'RID Not Found' });
      }
  
      const transactionHistoryResponse = await axios.post(`${process.env.API_BASE_URL}/transactionHistory`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const transactionHistoryData = transactionHistoryResponse.data;
  
      if (transactionHistoryData.error === 'RID Not Found') {
        return res.json({ success: false, error: 'RID Not Found' });
      }
  
      const smsHistoryResponse = await axios.post(`${process.env.API_BASE_URL}/smsHistory`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const smsHistoryData = smsHistoryResponse.data;
  
      if (smsHistoryData.error === 'RID Not Found') {
        return res.json({ success: false, error: 'RID Not Found' });
      }
  
      res.json({
        success: true,
        packetStatus: packetStatusData.statusCode,
        transactions: transactionHistoryData.transactions,
        status: smsHistoryData.status,
        phone: smsHistoryData.phone,
        createdAt: smsHistoryData.createdAt,
      });
  
    } catch (error) {
      logger.error("Error fetching RID info:", error.message);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  };

exports.resend = async (req, res) => {
    const requestBody = req.body;
  
    try {
      const response = await axios.post(`${process.env.API_BASE_URL}/resendSms`, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      const data = response.data;
  
      if (data.status === "200") {
        logger.info(data);
        res.status(200).json({ message: 'SMS sent successfully' });
      } else {
        logger.info(data);
        res.status(400).json({ error: data.error });
      }
    } catch (error) {
      logger.error("Error resending SMS:", error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.search = async (req, res) => {
    const { userId, searchBy, data } = req.body;
  
    if (!searchBy) {
      return res.status(400).json({ error: "Please select search type" });
    }
  
    if (!data) {
      return res.status(400).json({ error: "Please input data to search with" });
    }
  
    try {
      let response;
  
      if (searchBy.phone) {
        logger.info("Making request to search by phone", { data });
  
        response = await axios.post("http://172.18.7.234:8081/search", data, {
          headers: { "Content-Type": "text/plain" },
        });
      } else {
        const requestBody = { userId, searchBy, data };
        logger.info("Making request to search with lostUin", { data });
  
        response = await axios.post(
          `${process.env.API_BASE_URL}/lostUin`,
          requestBody,
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }
  
      if (response.status === 200) {
        return res.status(200).json(response.data);
      } else {
        return res.status(response.status).json({ error: "Failed to fetch" });
      }
    } catch (error) {
      logger.error("Error during search request", { error });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };