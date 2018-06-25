import * as Shell from 'node-powershell';
import { promisify } from 'util';
import { observable, action } from 'mobx';
import { exec } from 'child_process';
import { PersistedState } from './PersistedState';
import { timeout } from '../../core/utils';
// For test purposes
let trackError = (e: Error) => {};
if (typeof localStorage !== 'undefined') {
  trackError = require('../../core/raven').default;
}

let ps: Shell;
async function initPs(setEncoding = true): Promise<boolean> {
  ps = new Shell({
    noProfile: true,
  });

  if (!setEncoding) {
    return true;
  }
  const result = await Promise.race([
    timeout(500),
    ps
      .addCommand(
        'echo 123 | out-null;$OutputEncoding = [console]::InputEncoding = [console]::OutputEncoding = New-Object System.Text.UTF8Encoding'
      )
      .then(() => ps.invoke()),
  ]);

  if (result === false) {
    await ps.dispose();
    return initPs(false);
  }

  return true;
}
// Command which returns name of AV software.
export const avCheckCommand =
  'wmic /node:localhost /namespace:\\\\root\\SecurityCenter2 path AntiVirusProduct Get DisplayName | findstr /V /B /C:displayName || echo NULL';
export const undefinedCondition = 'NULL';
// String which checked in substring to determine if Windows Defender installed.
export const isDefender = 'Windows Defender';
// Google prefix to send to google
export const searchPrefix = 'https://www.google.com/search?q=';

// Removes trash from avCheckCommand result
export function sanitizeName(str: string) {
  return str.replace(/\r?\n|\r/g, '').replace(/[ \t]+$/, '');
}

const promisedExec = promisify(exec);
const debug = require('debug')('app:antivirusState');

export class AntivirusState extends PersistedState {
  // Is result has been checked
  @observable checked: boolean = false;
  // Are we adding folder to exceptions currently
  @observable running: boolean = false;
  // Does PC have any anti-virus software
  @observable haveAny: boolean = false;
  // Is it windows Defender, where we can add to exceptions through PowerShell
  @observable isKnown: boolean = false;
  // Is it already whitelisted and everything is fine. Can be checked only on Defender. Toggled on other anti-viruses, for instance, when miner is deleted.
  @observable whitelisted: boolean = false;
  // What's name of anti-virus
  @observable name: string = '';
  // What's error, if exists.
  @observable error?: string;

  constructor() {
    super(
      ['checked', 'haveAny', 'isKnown', 'name', 'whitelisted'],
      'AntivirusState'
    );
  }

  get appName() {
    return typeof __DEV__ !== 'undefined' && __DEV__
      ? 'Electron'
      : 'Hash to Cash';
  }

  get showAfter() {
    return this.error || (!this.running && (this.isKnown && this.whitelisted));
  }

  @action
  async check() {
    const result = await Promise.race([timeout(1500), this._check()]);

    if (result === false) {
      this.error = 'Timeout error.';
    }

    return result;
  }

  @action
  async _check() {
    try {
      await initPs();

      this.checked = false;
      const command = avCheckCommand;
      debug('Command is: ', command);
      const result = await promisedExec(command);

      debug('Received result: ', result);
      if (result) {
        const name = sanitizeName(result as any);
        this.name = name;
        this.checked = true;
        this.haveAny = !name.includes(undefinedCondition);
        if (this.haveAny) {
          this.isKnown = name.includes(isDefender);
          if (this.isKnown) {
            await this.checkIfWhitelisted();
          }
        }

        // Destroy powershell
        ps.dispose();
        return true;
      } else {
        this.checked = true;

        ps.dispose();
        return true;
      }
    } catch (e) {
      trackError(e);
      this.error = e.message;

      ps.dispose();
      return true;
    }
  }

  @action
  async checkIfWhitelisted() {
    await ps.addCommand('$WDAVprefs = Get-MpPreference');
    await ps.addCommand(
      `if ($WDAVprefs.ExclusionPath -contains $env:APPDATA + "\\${
        this.appName
      }") { echo "true" } else { echo "false" }`
    );

    const result = await ps.invoke();

    this.whitelisted = result.includes('true');
  }

  runSearch() {
    const electron = require('electron');
    const shell = electron.shell || electron.remote.shell;

    shell.openExternal(
      searchPrefix +
        encodeURIComponent('Как добавить папку в исключения ' + this.name)
    );
  }

  @action
  async addToExceptions() {
    try {
      await initPs();
      this.running = true;
      await ps.addCommand(
        `Start-Process powershell -Verb runAs -Wait -WindowStyle hidden -ArgumentList "Add-MpPreference -ExclusionPath \'$env:APPDATA\\${
          this.appName
        }\'"`
      );
      await ps.invoke();

      ps.dispose();

      this.whitelisted = true;
      this.running = false;
    } catch (e) {
      this.running = false;
      let formatted = 'Unknown error.';
      ps.dispose();
      try {
        formatted = e.split('\n')[0].split('Start-Process : ')[1];
      } catch (e) {
        console.error(e);
        trackError(new Error(e));
      }
      this.error = formatted;
      throw new Error(formatted);
    }
  }
}

const antivirusState = new AntivirusState();

export default antivirusState;
