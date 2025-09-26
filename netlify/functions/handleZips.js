// --- TEST FUNCTION ---
// This code does NOT connect to Google Sheets. It's for debugging purposes.

exports.handler = async (event) => {
  // A hardcoded list of service areas for testing
  const testZips = [
    { zip: '12345', turnaround: 'Test Day', charge: '100' },
    { zip: '67890', turnaround: 'Another Day', charge: '200' },
  ];

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  // Log to Netlify's function console to show it's running
  console.log('Test function was called successfully!');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(testZips),
  };
};