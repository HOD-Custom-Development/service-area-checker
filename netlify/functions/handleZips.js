const { google } = require('googleapis');

exports.handler = async (event) => {
  const {
    GOOGLE_SHEETS_CLIENT_EMAIL,
    GOOGLE_SHEETS_PRIVATE_KEY,
    SPREADSHEET_ID,
    SHEET_NAME
  } = process.env;

  // --- START DEBUGGING LOGS ---
  console.log('--- Checking Environment Variables ---');
  console.log('SPREADSHEET_ID:', SPREADSHEET_ID ? 'Loaded' : 'MISSING!');
  console.log('SHEET_NAME:', SHEET_NAME ? 'Loaded' : 'MISSING!');
  console.log('GOOGLE_SHEETS_CLIENT_EMAIL:', GOOGLE_SHEETS_CLIENT_EMAIL ? `Loaded (starts with: ${GOOGLE_SHEETS_CLIENT_EMAIL.substring(0, 15)}...)` : 'MISSING!');
  console.log('GOOGLE_SHEETS_PRIVATE_KEY:', GOOGLE_SHEETS_PRIVATE_KEY ? 'Loaded' : 'MISSING!');
  // --- END DEBUGGING LOGS ---

  // If any key variable is missing, return an error immediately.
  if (!GOOGLE_SHEETS_CLIENT_EMAIL || !GOOGLE_SHEETS_PRIVATE_KEY || !SPREADSHEET_ID || !SHEET_NAME) {
    console.error('One or more required environment variables are missing.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: Missing credentials.' })
    };
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_SHEETS_CLIENT_EMAIL,
    key: GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
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
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) };
  } catch (error) {
    console.error('Error with Google Sheets API:', error);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};