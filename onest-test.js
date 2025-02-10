const express = require('express'); // Express framework for handling HTTP requests
const bodyParser = require('body-parser'); // Middleware for parsing request bodies
const crypto = require('crypto'); // Node.js crypto module for encryption and decryption
const _sodium = require('libsodium-wrappers');
const { v4: uuidv4 } = require("uuid");
const { createAuthorizationHeader, isHeaderValid } = require("ondc-crypto-sdk-nodejs");
const axios = require("axios");

const port = 3011; // Port on which the server will listen
const ENCRYPTION_PRIVATE_KEY =
    'MC4CAQAwBQYDK2VuBCIEIIiVyv4TELuZx/B3gZOAoCj2nXvT/JR637pSij3agx9p';
const ONDC_PUBLIC_KEY =
    'MCowBQYDK2VuAyEAduMuZgmtpjdCuxv+Nc49K0cB6tL/Dj3HZetvVN7ZekM=';
const REQUEST_ID = '0b060b48-2b6c-4220-8a51-c6e1269cf1e5';
const SIGNING_PRIVATE_KEY =
    'So/8/tLVnbW2x65TaWIhhpa2zxt/Z+uW3td0V+vtv3Jmwg1sgezuItgcPl3pkInGtezZpuFN9OY20jAgYuLjiA==';
const SIGNING_PUBLIC_KEY = 'ZsINbIHs7iLYHD5d6ZCJxrXs2abhTfTmNtIwIGLi44g=';
const UNIQUE_KEY_ID = 'e5a42094-0cf4-4dfa-aac2-63c6d9896d9d';
const SUBSCRIBER_ID = 'dev-onest.sunstone.in';

// Create an Express application
const app = express();
app.use(bodyParser.json()); // Middleware to parse JSON request bodies

app.post("/search", async (req, res) => {
    try {
        // Generate UUIDs and timestamp
        const transaction_id = uuidv4();
        const message_id = uuidv4();
        const timestamp = new Date().toISOString();

        // Construct the request body
        const requestBody = {
            "context": {
              "domain": "ONDC:ONEST10",
              "action": "search",
              "version": "2.0.0",
              "bap_id": "worker-hub.bap.io",
              "bap_uri": "https://worker-hub.bap.io/",
              "transaction_id": "a9aaecca-10b7-4d19-b640-b047a7c62195",
              "message_id": "$89bdae17-9942-40c8-869a-5bd413356407",
              "location": {
                "city": {
                  "code": "std:080"
                },
                "country": {
                  "code": "IND"
                }
              },
              "timestamp": "2022-10-11T09:55:41.161Z",
              "ttl": "PT30S"
            },
            "message": {
              "intent": {
                "payment": {
                  "descriptor": {
                    "code": "NP_FEES"
                  },
                  "list": [
                    {
                      "code": "ID",
                      "value": "1"
                    }
                  ]
                },
                "provider": {
                  "locations": [
                    {
                      "city": {
                        "code": "std:080"
                      },
                      "state": {
                        "code": "IN-KA"
                      },
                      "country": {
                        "code": "IN"
                      }
                    }
                  ]
                },
                "tags": [
                  {
                    "descriptor": {
                      "code": "BAP_TERMS"
                    },
                    "list": [
                      {
                        "descriptor": {
                          "code": "STATIC_TERMS"
                        },
                        "value": "static_terms_value"
                      },
                      {
                        "descriptor": {
                          "code": "STATIC_TERMS_NEW"
                        },
                        "value": "static_terms_new_value"
                      },
                      {
                        "descriptor": {
                          "code": "EFFECTIVE_DATE"
                        },
                        "value": "2023-02-22T11:20:10.122Z"
                      }
                    ]
                  }
                ]
              }
            }
          };

        let authHeader;
        try {
            // Generate Authorization Header
            authHeader = await createAuthorizationHeader({
                body: JSON.stringify(requestBody),
                privateKey: SIGNING_PRIVATE_KEY,
                subscriberId: SUBSCRIBER_ID,
                subscriberUniqueKeyId: UNIQUE_KEY_ID,
                created: 1737361494,
                expires: 1768897494
            });
        } catch (authError) {
            console.error("Authorization Header Error:", authError.message);
            return res.status(500).json({
                sent_request: requestBody,
                error: "Failed to generate authorization header",
                details: authError.message,
            });
        }

        console.log(`Generated auth header: ${authHeader}`);
        console.log(`stringified body: ${JSON.stringify(requestBody)}`);

        try {
            // Send request to ONDC Gateway
            const response = await axios.post(
                "https://staging.gateway.proteantech.in/search",
                requestBody,
                {
                    headers: {
                        Authorization: authHeader,
                        "Content-Type": "application/json",
                    },
                }
            );

            // Return both sent request and received response
            res.status(response.status).json({
                sent_request: requestBody,
                send_auth_header: authHeader,
                received_response: response.data,
            });
        } catch (axiosError) {
            console.error("Request Error:", axiosError.response?.data || axiosError.message);
            res.status(axiosError.response?.status || 500).json({
                sent_request: requestBody,
                send_auth_header: authHeader,
                error: "Failed to send request to ONDC Gateway",
                details: axiosError.response?.data || axiosError.message,
            });
        }
    } catch (unexpectedError) {
        console.error("Unexpected Error:", unexpectedError.message);
        res.status(500).json({
            error: "Unexpected server error",
            send_auth_header: authHeader,
            details: unexpectedError.message,
        });
    }
});


const htmlFile = `
<!--Contents of ondc-site-verification.html. -->
<!--Please replace SIGNED_UNIQUE_REQ_ID with an actual value-->
<html>
  <head>
    <meta
      name="ondc-site-verification"
      content="SIGNED_UNIQUE_REQ_ID"
    />
  </head>
  <body>
    ONDC Site Verification Page
  </body>
</html>
`;
// Pre-defined public and private keys
const privateKey = crypto.createPrivateKey({
    key: Buffer.from(ENCRYPTION_PRIVATE_KEY, 'base64'), // Decode private key from base64
    format: 'der', // Specify the key format as DER
    type: 'pkcs8', // Specify the key type as PKCS#8
});
const publicKey = crypto.createPublicKey({
    key: Buffer.from(ONDC_PUBLIC_KEY, 'base64'), // Decode public key from base64
    format: 'der', // Specify the key format as DER
    type: 'spki', // Specify the key type as SubjectPublicKeyInfo (SPKI)
});

// Calculate the shared secret key using Diffie-Hellman
const sharedKey = crypto.diffieHellman({
    privateKey: privateKey,
    publicKey: publicKey,
});

// Route for handling subscription requests
app.post('/callback/on_subscribe', function (req, res) {
    const { challenge } = req.body; // Extract the 'challenge' property from the request body
    const answer = decryptAES256ECB(sharedKey, challenge); // Decrypt the challenge using AES-256-ECB
    const resp = { answer: answer };
    res.status(200).json(resp); // Send a JSON response with the answer
});

app.post('/callback/on_search', function (req, res) {
    console.log('Headers:', req.headers);
    console.log('Query Parameters:', req.query);
    console.log('Body:', req.body);
    console.log('URL:', req.url);
    console.log('Method:', req.method);

    res.send('Request logged!');
});

app.post('/callback', function (req, res) {
    console.log('Headers:', req.headers);
    console.log('Query Parameters:', req.query);
    console.log('Body:', req.body);
    console.log('URL:', req.url);
    console.log('Method:', req.method);

    res.send('Request logged!');
});

app.post('/on_search', function (req, res) {
    // Log the headers
    console.log('Headers:', JSON.stringify(req.headers, null, 2));

    // Log the query parameters
    console.log('Query Parameters:', JSON.stringify(req.query, null, 2));

    // Log the request body (assuming it's JSON)
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Log the URL and method
    console.log('URL:', req.url);
    console.log('Method:', req.method);

    // Send response
    res.send('Request logged!');
});

// Route for serving a verification file
app.get('/ondc-site-verification.html', async (req, res) => {
    const signedContent = await signMessage(REQUEST_ID, SIGNING_PRIVATE_KEY);
    // Replace the placeholder with the actual value
    const modifiedHTML = htmlFile.replace(/SIGNED_UNIQUE_REQ_ID/g, signedContent);
    // Send the modified HTML as the response
    res.send(modifiedHTML);
});

// Default route
app.get('/', (req, res) => res.send('Hello World!'));

// Health check route
app.get('/health', (req, res) => res.send('Health OK!!'));

app.get('/signAndReturn', async (req, res) => {
    try {
        const signature = await signMessage(req.body.message, SIGNING_PRIVATE_KEY);
        res.send(signature);  // Send the signature back in the response
    } catch (error) {
        res.status(500).send('Error signing message: ' + error.message);
    }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

// Decrypt using AES-256-ECB
function decryptAES256ECB(key, encrypted) {
    const iv = Buffer.alloc(0); // ECB doesn't use IV
    const decipher = crypto.createDecipheriv('aes-256-ecb', key, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

async function signMessage(signingString, privateKey) {
    await _sodium.ready;
    const sodium = _sodium;
    const signedMessage = sodium.crypto_sign_detached(
        signingString,
        sodium.from_base64(privateKey, _sodium.base64_variants.ORIGINAL)
    );
    const signature = sodium.to_base64(
        signedMessage,
        _sodium.base64_variants.ORIGINAL
    );
    return signature;
}