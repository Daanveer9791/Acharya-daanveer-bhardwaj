// Netlify Function: Kundli PDF Generator via astrologyapi.com
// Uses Basic Auth with User ID + API Key

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
  console.log('Looking up city:', placeKey);

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

  console.log('City found:', placeFull, 'coordinates:', lat, lon);

  // Get credentials from environment
  const USER_ID = process.env.ASTRO_USER_ID;
  const API_KEY = process.env.ASTRO_API_KEY;

  if (!USER_ID || !API_KEY) {
    console.error('Missing credentials - USER_ID:', !!USER_ID, 'API_KEY:', !!API_KEY);
    return { statusCode: 500, body: JSON.stringify({ 
      error: 'Server configuration error (missing credentials)' 
    })};
  }

  console.log('Credentials present. USER_ID length:', String(USER_ID).length, 'API_KEY length:', String(API_KEY).length);

  const lang = (language === 'en') ? 'en' : 'hi';

  const payload = {
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
    logo_url: '',
    company_name: 'Acharya Daanveer Bhardwaj',
    company_info: 'Third-generation Vedic astrologer, Gurgaon. Kundli • Matchmaking • Vastu • Puja • Dosha Nivaran. Consultation: +91 98109 69791',
    domain_url: 'https://acharyadaanveer.netlify.app',
    company_email: 'daanveerbhardwaj@gmail.com',
    company_landline: '+91-981-096-9791',
    company_mobile: '+91-981-096-9791'
  };

  console.log('Payload ready. Calling astrologyapi with Basic Auth');

  try {
    // Build Basic Auth header: Base64(USER_ID:API_KEY)
    const credentials = Buffer.from(USER_ID + ':' + API_KEY).toString('base64');
    const authHeader = 'Basic ' + credentials;

    console.log('Auth header created. Calling endpoint...');

    const response = await fetch('https://pdf.astrologyapi.com/v1/basic_horoscope_pdf', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('API Response Status:', response.status);
    console.log('API Response Body:', responseText.slice(0, 600));

    let responseData = {};
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
    }

    // Check for success
    if (response.ok && responseData.pdf_url) {
      console.log('✅ Success! PDF URL:', responseData.pdf_url);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pdf_url: responseData.pdf_url,
          place: placeFull 
        })
      };
    }

    // Handle error
    const errorMsg = responseData.message || responseData.msg || responseData.error || responseText;
    console.error('API Error:', errorMsg);
    return {
      statusCode: response.status || 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: String(errorMsg).slice(0, 400)
      })
    };

  } catch (error) {
    console.error('Fetch Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Request failed: ' + String(error).slice(0, 200)
      })
    };
  }
};
