// Netlify Function: generates a fully-branded Kundli PDF via astrologyapi.com
// API key (Access Token) is read from environment variables — never exposed to browser

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return resp(400, { error: 'Bad request' }); }

  const { name, gender, day, month, year, hour, min, place, language } = body;
  if (!name || !place || !day || !month || !year || hour == null || min == null) {
    return resp(400, { error: 'Please provide name, date, time and place of birth.' });
  }

  // ---- 1) Resolve birthplace -> coordinates (free, no key) ----
  let lat, lon, placeFull = place, tzone = 5.5; // default +5:30 (India)
  try {
    const gr = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=' + encodeURIComponent(place));
    const gj = await gr.json();
    if (gj && gj.results && gj.results[0]) {
      const R = gj.results[0];
      lat = R.latitude; lon = R.longitude;
      placeFull = [R.name, R.admin1, R.country].filter(Boolean).join(', ');
      if (R.country_code && R.country_code !== 'IN') {
        tzone = Math.round((lon / 15) * 2) / 2;
      }
    }
  } catch (e) { /* fall through */ }

  if (lat == null || lon == null) {
    return resp(422, { error: 'Could not find that place. Try "City, State" (e.g. Lucknow, UP).' });
  }

  // ---- 2) Auth: Bearer token (Access Token from astrologyapi) ----
  const API_KEY = process.env.ASTRO_API_KEY;
  if (!API_KEY) return resp(500, { error: 'Server not configured (missing API key).' });

  const lang = (language === 'en') ? 'en' : 'hi';

  // Text-only branding (no logo URL needed)
  const payload = {
    name: String(name),
    gender: gender || 'male',
    day: +day, month: +month, year: +year, hour: +hour, min: +min,
    lat: +lat, lon: +lon, tzone: +tzone,
    place: placeFull,
    language: lang,
    chart_style: 'NORTH_INDIAN',
    footer_link: 'acharyadaanveer.netlify.app',
    company_name: 'Acharya Daanveer Bhardwaj',
    company_info: 'Third-generation Vedic astrologer • Kundli • Matchmaking • Vastu • Puja • Gemstones • Muhurat • Dosha Nivaran. For detailed consultation and booking: +91 98109 69791',
    domain_url: 'https://acharyadaanveer.netlify.app',
    company_email: 'daanveerbhardwaj@gmail.com',
    company_landline: '+91-981-096-9791',
    company_mobile: '+91-981-096-9791'
  };

  // ---- 3) Call astrologyapi.com PDF endpoint with Bearer token ----
  try {
    const r = await fetch('https://pdf.astrologyapi.com/v1/basic_horoscope_pdf', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const text = await r.text();
    let j = null; try { j = JSON.parse(text); } catch (e) {}
    if (!r.ok || !j || !j.pdf_url) {
      return resp(502, { error: 'The report service is busy. Please try again in a moment.',
                         detail: (j && (j.message || j.error)) || text.slice(0, 200) });
    }
    return resp(200, { pdf_url: j.pdf_url, place: placeFull });
  } catch (e) {
    return resp(500, { error: 'Request failed. Please try again.', detail: String(e) });
  }
};

function resp(code, obj) {
  return { statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}
