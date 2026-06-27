// Netlify Function: Kundli PDF Generator via Prokerala API

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
  'bhopal': { lat: 23.1815, lon: 79.9864, name: 'Bhopal, Madhya Pradesh, India' }
};

exports.handler = async (event) => {
  console.log('=== Kundli Function Start ===');
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const { name, gender, day, month, year, hour, min, place, language } = body;

  if (!name || !place || day === undefined || month === undefined || year === undefined || 
      hour === undefined || min === undefined) {
    return { statusCode: 400, body: JSON.stringify({ 
      error: 'Missing fields: name, date, time, place required' 
    })};
  }

  const placeKey = String(place).toLowerCase().trim().split(',')[0].trim();
  console.log('City lookup:', placeKey);

  if (!CITIES[placeKey]) {
    const availableCities = Object.keys(CITIES).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ');
    return { statusCode: 422, body: JSON.stringify({ 
      error: 'City not found. Available: ' + availableCities
    })};
  }

  const city = CITIES[placeKey];
  const lat = city.lat;
  const lon = city.lon;
  const placeFull = city.name;
  const tzone = 5.5;

  console.log('City found:', placeFull);

  const CLIENT_ID = process.env.PROKERALA_CLIENT_ID;
  const CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET;

  console.log('Checking credentials...');
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Missing credentials');
    return { statusCode: 500, body: JSON.stringify({ 
      error: 'Server configuration error'
    })};
  }

  console.log('✅ Credentials present. Getting token...');

  // Try different token endpoints
  const tokenEndpoints = [
    'https://oauth.prokerala.com/oauth/token',
    'https://api.prokerala.com/v2/oauth/token',
    'https://api.prokerala.com/oauth/token'
  ];

  let accessToken = null;

  for (const tokenUrl of tokenEndpoints) {
    try {
      console.log('Trying:', tokenUrl);
      
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials&client_id=' + encodeURIComponent(CLIENT_ID) + 
              '&client_secret=' + encodeURIComponent(CLIENT_SECRET)
      });

      console.log('Status:', tokenResponse.status);
      const text = await tokenResponse.text();
      console.log('Response:', text.slice(0, 200));

      let tokenData = {};
      try {
        tokenData = JSON.parse(text);
      } catch (e) {
        console.log('Not JSON, trying next endpoint...');
        continue;
      }

      if (tokenResponse.ok && tokenData.access_token) {
        accessToken = tokenData.access_token;
        console.log('✅ Token acquired from', tokenUrl);
        break;
      }
    } catch (e) {
      console.log('Endpoint error:', String(e).slice(0, 100));
      continue;
    }
  }

  if (!accessToken) {
    console.error('❌ Could not get token from any endpoint');
    return { statusCode: 401, body: JSON.stringify({ 
      error: 'Authentication failed - could not get access token'
    })};
  }

  // Generate PDF
  const lang = (language === 'en') ? 'en' : 'hi';
  const pdfPayload = {
    name: String(name).trim(),
    gender: String(gender || 'male').toLowerCase(),
    day: parseInt(day),
    month: parseInt(month),
    year: parseInt(year),
    hour: parseInt(hour),
    min: parseInt(min),
    lat: lat,
    lon: lon,
    tzone: tzone,
    place: placeFull,
    language: lang,
    chart_style: 'NORTH_INDIAN',
    footer_link: 'acharyadaanveer.netlify.app',
    company_name: 'Acharya Daanveer Bhardwaj',
    company_info: 'Third-generation Vedic astrologer. Consultation: +91 98109 69791',
    domain_url: 'https://acharyadaanveer.netlify.app',
    company_email: 'daanveerbhardwaj@gmail.com',
    company_landline: '+91-981-096-9791',
    company_mobile: '+91-981-096-9791'
  };

  console.log('Calling PDF endpoint...');
  try {
    const pdfResponse = await fetch('https://api.prokerala.com/v2/report/personal-reading/instant', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pdfPayload)
    });

    console.log('PDF response status:', pdfResponse.status);

    if (!pdfResponse.ok) {
      const errText = await pdfResponse.text();
      console.error('PDF failed:', errText.slice(0, 300));
      return { statusCode: pdfResponse.status, body: JSON.stringify({ 
        error: 'PDF error: ' + errText.slice(0, 200)
      })};
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('✅ PDF generated');

    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    const pdfDataUrl = 'data:application/pdf;base64,' + pdfBase64;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        pdf_url: pdfDataUrl,
        place: placeFull
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error: ' + String(error).slice(0, 200)
      })
    };
  }
};
