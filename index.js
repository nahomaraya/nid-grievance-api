const express = require("express");
const axios = require("axios");
const expressWinston = require("express-winston");
const jwt = require('jsonwebtoken');
const cors = require("cors");
const bodyParser = require('body-parser');
const winston = require("winston");
const dotenv = require('dotenv');

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

dotenv.config();


const API_BASE_URL = 'http://172.18.7.230:8006';

// Create a winston logger instance
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Set up express-winston logger middleware
app.use(
  expressWinston.logger({
    winstonInstance: logger,
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: true,
    colorize: false,
    ignoreRoute: function (req, res) {
      return false;
    },
  })
);


app.post("/api/authenticate", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send("Missing username or password");
  }

  logger.info("requesting authentication");

  axios.post(
    `${process.env.KEYCLOAK_HOST}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
    new URLSearchParams({
      client_id: process.env.KEYCLOAK_CLIENT_ID,
      client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
      username: username,
      password: password,
      grant_type: "password",
      scope: "openid"
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000, // 10 seconds timeout
    }
  )
  .then(tokenResponse => {
    const accessToken = tokenResponse.data.access_token;
  
    const decodedToken = jwt.decode(accessToken);
    const grievancePortalRoles = decodedToken.realm_access.roles;
    
    return axios.post(
      `${process.env.KEYCLOAK_HOST}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
      new URLSearchParams({
        client_id: process.env.KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        scope: "email profile"
      }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 10000, // 10 seconds timeout
      }
    )
    .then(userInfoResponse => {
      logger.info(userInfoResponse)
      const userInfo = userInfoResponse.data;
      const userName = userInfo.preferred_username;
      const fullName = userInfo.name;
      const ID = userInfo.sub;
      const firstName = userInfo.given_name;
      
      // ... extract data from userInfo
      logger.info(`Authenticated User ${userName} information`);
      res.status(200).json({
        token: accessToken,
        userInfo: {
          username: userName,
          fullName: fullName,
          firstName: firstName,
          ID: ID,
          role: grievancePortalRoles, //   realmRoles: userRoles,  //   clientRoles: clientRoles,
        },
      });
    })
    .catch(error => {
      logger.error("Error fetching user info:", error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json(error.message);
      }
    });
  })
  .catch(error => {
    logger.error("Error during authentication:", error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json(error.message);
    }
  });
});
app.post("/api/search", async (req, res) => {
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
        "http://172.18.7.230:8006/lostUin",
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
});

app.post('/api/fetchdata', async (req, res) => {
  const { beginDate, endDate, operationType } = req.body;

  logger.info(beginDate);

  try {
    const response = await axios.post(`${API_BASE_URL}/filterDataByDate`, {
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
});

app.post('/api/ridinfo', async (req, res) => {
  const { userId, regId } = req.body;

  const requestBody = {
    userId,
    regId,
  };

  try {
    const packetStatusResponse = await axios.post(`${API_BASE_URL}/packetStatus`, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const packetStatusData = packetStatusResponse.data;

    if (packetStatusData.error === 'RID Not Found') {
      return res.json({ success: false, error: 'RID Not Found' });
    }

    const transactionHistoryResponse = await axios.post(`${API_BASE_URL}/transactionHistory`, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const transactionHistoryData = transactionHistoryResponse.data;

    if (transactionHistoryData.error === 'RID Not Found') {
      return res.json({ success: false, error: 'RID Not Found' });
    }

    const smsHistoryResponse = await axios.post(`${API_BASE_URL}/smsHistory`, requestBody, {
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
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.post('/api/resend', async (req, res) => {
  const requestBody = req.body;

  try {
    const response = await axios.post('http://172.18.7.230:8006/resendSms', requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;

    if (data.status === "200") {
      console.log(data);
      res.status(200).json({ message: 'SMS sent successfully' });
    } else {
      console.log(data);
      res.status(400).json({ error: data.error });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Error logging
app.use(
  expressWinston.errorLogger({
    winstonInstance: logger,
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.json()
    ),
  })
);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
