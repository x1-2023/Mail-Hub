const { Client } = require('ssh2');

const cmd = `
export PATH=$PATH:/usr/local/go/bin:/root/.nvm/versions/node/v20.20.0/bin
cd /opt/apps/awf-mail
echo "Pulling latest code..."
git pull origin main
echo "Building backend..."
go build -o mailhub-api cmd/api/main.go
go build -o mailhub-worker cmd/worker/main.go
go build -o mailhub-smtp cmd/smtp/main.go
echo "Building frontend..."
cd web
npm install
npm run deploy
cd ..
echo "Restarting..."
pm2 restart mailhub-api mailhub-worker mailhub-smtp
echo "Done deploy"
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '192.168.1.100',
  port: 22,
  username: 'root',
  password: 'Deobiet1',
  readyTimeout: 20000
});
