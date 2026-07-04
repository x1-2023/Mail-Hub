const { Client } = require('ssh2');

const cmd = process.argv[2] || 'ls -la';

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
