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

const expoRoot = path.join(__dirname, '..');
// rork/bunx bazen bozuk cache ile MODULE_NOT_FOUND veriyor; resmi Expo CLI + LAN.
const child = spawn('npx', ['expo', 'start', '--lan'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
  cwd: expoRoot,
});
child.on('exit', (code) => process.exit(code ?? 0));
