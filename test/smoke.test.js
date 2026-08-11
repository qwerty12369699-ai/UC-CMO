const http = require('http');

const req = http.get('http://127.0.0.1:3000', (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.resume();
  res.on('end', () => process.exit(res.statusCode === 200 ? 0 : 1));
});

req.on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});
