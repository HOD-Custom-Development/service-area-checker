const { google } = require('googleapis');
const fetch = require('node-fetch');

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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  const zipCode = event.queryStringParameters.zip;

  if (!zipCode) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'ZIP code is required.' }) };
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`, // Read the first four columns
    });

    const rows = response.data.values || [];
    rows.shift(); // Remove the header row

    // Find the row where the first column matches the zip code
    const foundRow = rows.find(row => row[0] === zipCode);

    if (foundRow) {
      // Build the data object based on a fixed column order
      const serviceData = {
        zip: foundRow[0],
        city: foundRow[1],
        turnaround: foundRow[2],
        charge: foundRow[3],
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(serviceData),
      };
    } else {
      // If the ZIP is not found
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