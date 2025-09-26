const { google } = require('googleapis');

// Securely access environment variables set in the Netlify UI
const {
  GOOGLE_SHEETS_CLIENT_EMAIL,
  GOOGLE_SHEETS_PRIVATE_KEY,
  SPREADSHEET_ID,
  SHEET_NAME
} = process.env;

const auth = new google.auth.JWT({
  email: GOOGLE_SHEETS_CLIENT_EMAIL,
  key: GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle newline characters properly
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

exports.handler = async (event) => {
  // Set CORS headers to allow your website to call this function
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  // Handle pre-flight requests for CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  
  try {
    switch (event.httpMethod) {
      case 'GET': {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:C`,
        });
        const rows = response.data.values || [];
        const headers = rows.shift() || []; // Get and remove header row
        const data = rows.map(row => ({
          [headers[0]]: row[0],
          [headers[1]]: row[1],
          [headers[2]]: row[2],
        }));
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }
      default:
        // Simplified for this version, only GET is needed
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }
  } catch (error) {
    console.error('Error with Google Sheets API:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};