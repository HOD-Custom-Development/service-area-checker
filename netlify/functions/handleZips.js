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
  key: GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle newline characters
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

exports.handler = async (event) => {
  // Allow requests from any origin (CORS)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

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
        const headers = rows.shift() || [];
        const data = rows.map(row => ({
          [headers[0]]: row[0],
          [headers[1]]: row[1],
          [headers[2]]: row[2],
        }));
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }
      case 'POST': {
        const { zip, turnaround, charge } = JSON.parse(event.body);
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:C`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[zip, turnaround, charge]] },
        });
        return { statusCode: 201, headers, body: JSON.stringify({ message: 'ZIP added.' }) };
      }
      case 'DELETE': {
        const { zip } = JSON.parse(event.body);
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:C`,
        });
        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === zip);
        if (rowIndex === -1) {
          return { statusCode: 404, headers, body: JSON.stringify({ message: 'ZIP not found.' }) };
        }
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: [{
              deleteDimension: {
                range: { sheetId: 0, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 }
              }
            }]
          }
        });
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'ZIP deleted.' }) };
      }
      default:
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }
  } catch (error) {
    console.error(error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};