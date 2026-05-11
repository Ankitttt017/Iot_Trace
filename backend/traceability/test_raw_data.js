const http = require('http');

function get(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data.substring(0, 300) }); }
      });
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function main() {
  const r1 = await get('http://localhost:4000/api/lines/raw-master-data?plant=1002&type=machines&division=1.%20HPDC');
  console.log('Machines 1002 HPDC:', r1.status, 'count:', r1.body?.data?.length);

  const r2 = await get('http://localhost:4000/api/lines/raw-master-data?plant=1002&type=parts');
  console.log('Parts 1002:', r2.status, 'count:', r2.body?.data?.length);
}
main();
