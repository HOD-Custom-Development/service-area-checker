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
    // 1. Fetch all service area data from your Google Sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      // Read a wider range to accommodate any column order
      range: `${SHEET_NAME}!A:Z`, 
    });

    const rows = response.data.values || [];
    const headerRow = rows.shift() || []; // Get the first row as headers

    // **This is the new, smarter part**
    // Find the column index for each required header
    const zipIndex = headerRow.findIndex(h => h.toLowerCase() === 'zip');
    const cityIndex = headerRow.findIndex(h => h.toLowerCase() === 'city');
    const turnaroundIndex = headerRow.findIndex(h => h.toLowerCase() === 'turnaround');
    const chargeIndex = headerRow.findIndex(h => h.toLowerCase() === 'charge');

    // 2. Check if the provided ZIP code is in your service list
    const foundRow = rows.find(row => row[zipIndex] === zipCode);

    if (foundRow) {
      // 3. Build the data object from the found row
      const foundArea = {
        zip: foundRow[zipIndex],
        city: foundRow[cityIndex],
        turnaround: foundRow[turnaroundIndex],
        charge: foundRow[chargeIndex],
      };

      // If the city is missing in the sheet, fetch it from the external API as a fallback
      if (!foundArea.city) {
        try {
            const cityResponse = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
            if (cityResponse.ok) {
                const cityData = await cityResponse.json();
                foundArea.city = cityData.places[0]['place name'];
            }
        } catch (e) {
            console.log("Could not fetch city from external API.");
        }
      }
      
      // 4. Return the combined data
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(foundArea),
      };
    } else {
      // 5. If the ZIP code is not in the service area, return a not found error
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