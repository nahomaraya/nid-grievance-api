const axios = require('axios');
const jwt = require('jsonwebtoken');
const { logger } = require('../middleware/logger');


exports.authenticate = async (req, res) =>{
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send("Missing username or password");
  }



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
      // 10 seconds timeout
    }
  )
  .then(tokenResponse => {
    logger.info(username+password);
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


}


 

