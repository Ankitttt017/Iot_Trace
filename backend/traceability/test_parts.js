const http = require('http');

http.get('http://localhost:4000/api/parts', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    try {
      console.log('BODY:', JSON.parse(data));
    } catch(e) {
      console.log('BODY:', data.substring(0, 500));
    }
  });
}).on('error', err => {
  console.log('Error:', err.message);
});
