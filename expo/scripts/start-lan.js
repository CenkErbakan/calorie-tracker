const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function getLanIp() {
  const lanIpPath = path.join(__dirname, '..', 'lan-ip.txt');
  if (fs.existsSync(lanIpPath)) {
    const ip = fs.readFileSync(lanIpPath, 'utf8').trim();
    if (ip) return ip;
  }
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const { address, family, internal } of iface || []) {
      if (family === 'IPv4' && !internal && address.startsWith('192.168.')) {
        return address;
      }
    }
  }
  return null;
}

const lanIp = getLanIp();
if (lanIp) {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = lanIp;
  console.log('Using LAN IP:', lanIp, '(exp://' + lanIp + ':8081)');
}

const child = spawn('bun', ['x', 'rork', 'start', '-p', 'tha7reg68ka2lobf1vtb9', '--lan'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
child.on('exit', (code) => process.exit(code ?? 0));
