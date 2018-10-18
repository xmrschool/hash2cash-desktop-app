import { writeFile } from 'fs-extra';
import { readFileSync } from 'fs';
import * as path from 'path';
import { app } from 'electron';
import * as json5 from 'json5';

export type Config = {
  enableHardwareAcceleration: boolean;
};

export function buildInitialConfig(config: Config) {
  const s = json5.stringify;

  const initialConfig = `// Hash to Cash main settings. Most of settings can be switched using localStorage.   
{
  // Disable hardware acceleration or not.
  enableHardwareAcceleration: ${s(config.enableHardwareAcceleration)}
}`;

  return initialConfig;
}

const initialConfig = {
  enableHardwareAcceleration: true,
};

let outerConfig = initialConfig;

export { outerConfig as config };

const configPath = path.join(app.getPath('userData'), 'config.json');

export function initializeConfig() {
  try {
    const content = readFileSync(configPath);

    const parsed = json5.parse(content.toString());

    outerConfig = parsed;

    return outerConfig;
  } catch (e) {
    writeFile(configPath, buildInitialConfig(initialConfig));
    return initialConfig;
  }
}

export async function updateConfig(newConfig: Config) {
  try {
    const updatedConfig = Object.assign({}, outerConfig, newConfig);
    const updatedConfigRaw = buildInitialConfig(updatedConfig);

    outerConfig = updatedConfig;

    await writeFile(configPath, updatedConfigRaw);

    return true;
  } catch (e) {
    return false;
  }
}
