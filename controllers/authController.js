
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { logger } = require('../middleware/logger');

exports.authenticate = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send("Missing username or password");
  }

  try {
    const tokenResponse = await axios.post(
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
    );

    const accessToken = tokenResponse.data.access_token;
    const decodedToken = jwt.decode(accessToken);
    const grievancePortalRoles = decodedToken.realm_access.roles;

    const userInfoResponse = await axios.post(
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
    );

    const userInfo = userInfoResponse.data;
    const userName = userInfo.preferred_username;
    const fullName = userInfo.name;
    const ID = userInfo.sub;
    const firstName = userInfo.given_name;

    logger.info(`Authenticated User ${userName} information`);
    res.status(200).json({
      token: accessToken,
      userInfo: {
        username: userName,
        fullName: fullName,
        firstName: firstName,
        ID: ID,
        role: grievancePortalRoles,
      },
    });
  } catch (error) {
    logger.error("Error during authentication:", error.message);

    if (error.response) {
      // Log detailed error response
      logger.error("Error response data:", error.response.data);
      logger.error("Error response status:", error.response.status);
      logger.error("Error response headers:", error.response.headers);
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // Log detailed error request
      logger.error("Error request:", error.request);
      res.status(500).json("No response received from Keycloak server.");
    } else {
      // Log other errors
      logger.error("Error message:", error.message);
      res.status(500).json(error.message);
    }
  }
};
