// Netlify Function: Kundli PDF Generator via astrologyapi.com
// This function resolves city names to coordinates and calls astrologyapi

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
  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Parse request body
  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const { name, gender, day, month, year, hour, min, place, language } = body;

  // Validate all fields present
  if (!name || !place || day === undefined || month === undefined || year === undefined || 
      hour === undefined || min === undefined) {
    return { statusCode: 400, body: JSON.stringify({ 
      error: 'Missing fields: name, date, time, place required' 
    })};
  }

  // Convert place to lowercase and get first word
  const placeKey = String(place).toLowerCase().trim().split(',')[0].trim();
  console.log('Looking up city:', placeKey);

  // Check if city is in our list
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
  const tzone = 5.5; // India standard time

  console.log('City found:', placeFull, 'coordinates:', lat, lon);

  // Get API key from environment
  const API_KEY = process.env.ASTRO_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ 
      error: 'Server configuration error' 
    })};
  }

  const lang = (language === 'en') ? 'en' : 'hi';

  // Build payload for astrologyapi
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
    company_info: 'Third-generation Vedic astrologer, Gurgaon. Kundli • Matchmaking • Vastu • Puja • Gemstones • Dosha Nivaran. Consultation: +91 98109 69791',
    domain_url: 'https://acharyadaanveer.netlify.app',
    company_email: 'daanveerbhardwaj@gmail.com',
    company_landline: '+91-981-096-9791',
    company_mobile: '+91-981-096-9791'
  };

  console.log('Payload:', JSON.stringify(payload));

  // Call astrologyapi
  try {
    const response = await fetch('https://pdf.astrologyapi.com/v1/basic_horoscope_pdf', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('API Response Status:', response.status);
    console.log('API Response Body:', responseText.slice(0, 500));

    let responseData = {};
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
    }

    // Check for success
    if (response.ok && responseData.pdf_url) {
      console.log('Success! PDF URL:', responseData.pdf_url);
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
    const errorMsg = responseData.message || responseData.error || responseText;
    console.error('API Error:', errorMsg);
    return {
      statusCode: response.status || 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: String(errorMsg).slice(0, 300)
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
