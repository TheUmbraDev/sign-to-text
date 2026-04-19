import { createServer } from 'https';
import { readFileSync } from 'fs';
import next from 'next';

// Adjust host/IP if needed
const hostname = '0.0.0.0';
const port = 3000;
const dev = process.env.NODE_ENV !== 'production';

// Expect cert files generated via mkcert: cert.pem & cert-key.pem in project root
const certPath = './cert.pem';
const keyPath = './cert-key.pem';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  let httpsOptions;
  try {
    httpsOptions = {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath)
    };
  } catch (e) {
    console.error('\nMissing HTTPS certificate files. Generate them with mkcert before running dev:https.');
    console.error('Example: mkcert 192.168.26.30 localhost 127.0.0.1 ::1');
    process.exit(1);
  }

  createServer(httpsOptions, (req, res) => {
    handle(req, res);
  }).listen(port, hostname, () => {
    console.log(`> HTTPS ready on https://192.168.26.30:${port}`);
    console.log('If certificate is untrusted, install mkcert root CA or accept the warning once.');
  });
});
