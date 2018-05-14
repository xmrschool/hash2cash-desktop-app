const AutoLaunch = require('auto-launch');
const autoLauncher = new AutoLaunch({
  name: 'Hash to Cash',
  isHidden: true,
});

export async function enable() {
  return autoLauncher.enable().catch(console.error);
}

export async function disable() {
  return autoLauncher.disable().catch(console.error);
}

export async function isEnabled(): Promise<boolean> {
  return autoLauncher.isEnabled();
}
