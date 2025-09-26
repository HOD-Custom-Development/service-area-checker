const { google } = require('googleapis');
const fetch = require('node-fetch'); // You may need to add this dependency

const {
  GOOGLE_SHEETS_CLIENT_EMAIL,
  GOOGLE_SHEETS_PRIVATE_KEY,
  SPREADSHEET_ID,
  SHEET_NAME
} = process.env;

const auth = new google.auth.JWT({
  email: GOOGLE_SHEETS_CLIENT_EMAIL,
  key: GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*' };
  const zipCode = event.queryStringParameters.zip;

  if (!zipCode) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'ZIP code is required.' }) };
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`, // Read columns A, B, C, D
    });

    const rows = response.data.values || [];
    const headerRow = rows.shift() || [];
    
    // Find the row where the first column matches the provided zip code
    const foundRow = rows.find(row => row[0] === zipCode);

    if (foundRow) {
      // Build the data object from the found row (zip, city, turnaround, charge)
      const serviceData = {
        zip: foundRow[0],
        city: foundRow[1], 
        turnaround: foundRow[2],
        charge: foundRow[3],
      };

      // If the city column in your sheet is blank, fetch it from the API
      if (!serviceData.city) {
        try {
          const cityResponse = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
          if (cityResponse.ok) {
            const cityData = await cityResponse.json();
            serviceData.city = cityData.places[0]['place name'];
          }
        } catch (e) {
          console.log("Could not fetch city name as a fallback.");
        }
      }
      
      return { statusCode: 200, headers, body: JSON.stringify(serviceData) };
    } else {
      // If the ZIP is not found in your sheet
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Sorry, we don\'t service that area yet.' }),
      };
    }
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};