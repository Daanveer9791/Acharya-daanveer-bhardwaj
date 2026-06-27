// Netlify Function: Kundli PDF Generator via Prokerala API
// Correct payload format per Prokerala documentation

const CITIES = {
  'gurgaon': { lat: 28.4595, lon: 77.0266, name: 'Gurgaon, Haryana, India' },
  'delhi': { lat: 28.7041, lon: 77.1025, name: 'Delhi, India' },
  'noida': { lat: 28.5355, lon: 77.3910, name: 'Noida, Uttar Pradesh, India' },
  'lucknow': { lat: 26.8467, lon: 80.9462, name: 'Lucknow, Uttar Pradesh, India' },
  'mumbai': { lat: 19.0760, lon: 72.8777, name: 'Mumbai, Maharashtra, India' },
  'bangalore': { lat: 12.9716, lon: 77.5946, name: 'Bangalore, Karnataka, India' },
  'kolkata': { lat: 22.5726, lon: 88.3639, name: 'Kolkata, West Bengal, India' },
  'hyderabad': { lat: 17.3850, lon: 78.4867, name: 'Hyderabad, Telangana, India' },
  'pune': { lat: 18.5204, lon: 73.8567, name: 'Pune, Maharashtra, India' },
  'jaipur': { lat: 26.9124, lon: 75.7873, name: 'Jaipur, Rajasthan, India' },
  'chandigarh': { lat: 30.7333, lon: 76.7794, name: 'Chandigarh, India' },
  'ahmedabad': { lat: 23.0225, lon: 72.5714, name: 'Ahmedabad, Gujarat, India' },
  'indore': { lat: 22.7196, lon: 75.8577, name: 'Indore, Madhya Pradesh, India' },
  'bhopal': { lat: 23.1815, lon: 79.9864, name: 'Bhopal, Madhya Pradesh, India' },
  'surat': { lat: 21.1458, lon: 72.8354, name: 'Surat, Gujarat, India' },
  'vadodara': { lat: 22.3072, lon: 73.1812, name: 'Vadodara, Gujarat, India' },
  'nashik': { lat: 19.9975, lon: 73.7898, name: 'Nashik, Maharashtra, India' },
  'aurangabad': { lat: 19.8762, lon: 75.3433, name: 'Aurangabad, Maharashtra, India' },
  'nagpur': { lat: 21.1458, lon: 79.0882, name: 'Nagpur, Maharashtra, India' },
  'thane': { lat: 19.2183, lon: 72.9781, name: 'Thane, Maharashtra, India' },
  'navi mumbai': { lat: 19.0330, lon: 73.0297, name: 'Navi Mumbai, Maharashtra, India' },
  'kochi': { lat: 9.9312, lon: 76.2673, name: 'Kochi, Kerala, India' },
  'thiruvananthapuram': { lat: 8.5241, lon: 76.9366, name: 'Thiruvananthapuram, Kerala, India' },
  'coimbatore': { lat: 11.0026, lon: 76.7155, name: 'Coimbatore, Tamil Nadu, India' },
  'chennai': { lat: 13.0827, lon: 80.2707, name: 'Chennai, Tamil Nadu, India' },
  'madurai': { lat: 9.9252, lon: 78.1198, name: 'Madurai, Tamil Nadu, India' },
  'salem': { lat: 11.6643, lon: 78.1460, name: 'Salem, Tamil Nadu, India' },
  'visakhapatnam': { lat: 17.6869, lon: 83.2185, name: 'Visakhapatnam, Andhra Pradesh, India' },
  'vijayawada': { lat: 16.5062, lon: 80.6480, name: 'Vijayawada, Andhra Pradesh, India' },
  'amritsar': { lat: 31.6340, lon: 74.8723, name: 'Amritsar, Punjab, India' },
  'ludhiana': { lat: 30.9010, lon: 75.8573, name: 'Ludhiana, Punjab, India' },
  'jalandhar': { lat: 31.7264, lon: 75.5761, name: 'Jalandhar, Punjab, India' },
  'udaipur': { lat: 24.5854, lon: 73.7125, name: 'Udaipur, Rajasthan, India' },
  'jodhpur': { lat: 26.2389, lon: 73.0243, name: 'Jodhpur, Rajasthan, India' },
  'kota': { lat: 25.2138, lon: 75.8648, name: 'Kota, Rajasthan, India' },
  'agra': { lat: 27.1767, lon: 78.0081, name: 'Agra, Uttar Pradesh, India' },
  'varanasi': { lat: 25.3200, lon: 82.9789, name: 'Varanasi, Uttar Pradesh, India' },
  'kanpur': { lat: 26.4499, lon: 80.3319, name: 'Kanpur, Uttar Pradesh, India' },
  'allahabad': { lat: 25.4358, lon: 81.8463, name: 'Allahabad, Uttar Pradesh, India' },
  'meerut': { lat: 28.9845, lon: 77.7064, name: 'Meerut, Uttar Pradesh, India' },
  'ranchi': { lat: 23.3441, lon: 85.3096, name: 'Ranchi, Jharkhand, India' },
  'patna': { lat: 25.5941, lon: 85.1376, name: 'Patna, Bihar, India' },
  'guwahati': { lat: 26.1445, lon: 91.7362, name: 'Guwahati, Assam, India' },
  'shillong': { lat: 25.5788, lon: 91.8933, name: 'Shillong, Meghalaya, India' },
  'bhubaneswar': { lat: 20.2961, lon: 85.8245, name: 'Bhubaneswar, Odisha, India' },
  'raipur': { lat: 21.2514, lon: 81.6296, name: 'Raipur, Chhattisgarh, India' }
};

function findNearestCities(typed, maxResults = 5) {
  const typed_lower = typed.toLowerCase();
  if (CITIES[typed_lower]) return [typed_lower];
  const matches = Object.keys(CITIES).filter(key => key.includes(typed_lower) || typed_lower.includes(key));
  if (matches.length > 0) return matches.slice(0, maxResults);
  const scored = Object.keys(CITIES).map(key => {
    const dist = levenshteinDistance(typed_lower, key);
    return { key, dist };
  }).sort((a, b) => a.dist - b.dist).slice(0, maxResults);
  return scored.map(s => s.key);
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

// Pad numbers with leading zero
function pad(n) { return n < 10 ? '0' + n : n; }

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) }; }

  const { name, gender, day, month, year, hour, min, place, language } = body;

  if (!name || !place || day === undefined || month === undefined || year === undefined || hour === undefined || min === undefined) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields required' })};
  }

  const placeKey = String(place).toLowerCase().trim().split(',')[0].trim();

  if (!CITIES[placeKey]) {
    const nearest = findNearestCities(placeKey, 5);
    const suggestions = nearest.map(k => CITIES[k].name.split(',')[0]).join(', ');
    return { statusCode: 422, body: JSON.stringify({ error: 'City not found. Did you mean: ' + suggestions + '?' })};
  }

  const city = CITIES[placeKey];
  const lat = city.lat;
  const lon = city.lon;
  const placeFull = city.name;

  const CLIENT_ID = process.env.PROKERALA_CLIENT_ID;
  const CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' })};
  }

  let accessToken = null;
  try {
    console.log('Getting access token...');
    const tokenResponse = await fetch('https://api.prokerala.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&client_id=' + encodeURIComponent(CLIENT_ID) + '&client_secret=' + encodeURIComponent(CLIENT_SECRET)
    });

    const tokenText = await tokenResponse.text();
    const tokenData = JSON.parse(tokenText);

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Token failed:', tokenData);
      return { statusCode: 401, body: JSON.stringify({ error: 'Authentication failed' })};
    }

    accessToken = tokenData.access_token;
    console.log('✅ Token acquired');

  } catch (error) {
    console.error('Token error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Authentication error' })};
  }

  // Build datetime in ISO format: YYYY-MM-DDTHH:mm:ss+05:30
  const dateStr = pad(year) + '-' + pad(month) + '-' + pad(day) + 'T' + pad(hour) + ':' + pad(min) + ':00+05:30';
  const coordinates = lat + ',' + lon;
  const lang = (language === 'en') ? 'en' : 'hi';

  // Correct Prokerala payload format
  const pdfPayload = {
    input: {
      first_name: String(name).trim(),
      gender: String(gender || 'male').toLowerCase(),
      datetime: dateStr,
      coordinates: coordinates,
      place: placeFull
    },
    options: {
      report: {
        brand_name: 'Acharya Daanveer Bhardwaj',
        name: 'Basic Horoscope',
        caption: 'Generated by Acharya Daanveer',
        la: lang
      },
      template: {
        footer: 'acharyadaanveer.netlify.app',
        style: 'vedic-astro-green'
      },
      modules: [
        {
          name: 'single-page-horoscope',
          options: { chart_style: 'north-indian' }
        }
      ]
    }
  };

  try {
    console.log('Calling PDF endpoint with correct format...');
    console.log('Payload:', JSON.stringify(pdfPayload));

    const pdfResponse = await fetch('https://api.prokerala.com/v2/report/personal-reading/instant', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pdfPayload)
    });

    console.log('PDF response status:', pdfResponse.status);

    const responseText = await pdfResponse.text();
    console.log('PDF response (first 500 chars):', responseText.slice(0, 500));

    if (!pdfResponse.ok) {
      return { statusCode: pdfResponse.status, body: JSON.stringify({ error: 'Prokerala: ' + responseText.slice(0, 300) })};
    }

    // Response is PDF binary
    if (responseText.slice(0, 4) === '%PDF') {
      console.log('✅ PDF received');
      const pdfBase64 = Buffer.from(responseText, 'binary').toString('base64');
      const pdfDataUrl = 'data:application/pdf;base64,' + pdfBase64;
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf_url: pdfDataUrl, place: placeFull })
      };
    }

    return { statusCode: 502, body: JSON.stringify({ error: 'Unexpected response format' })};

  } catch (error) {
    console.error('Fetch error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error: ' + String(error).slice(0, 200) })};
  }
};
