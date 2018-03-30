import * as React from 'react';
import { shell } from 'electron';
import { FormattedMessage } from 'react-intl';
import * as os from 'os';
import { Response } from 'opencl-detector';
import { observable } from 'mobx';
import { ITip } from './';
import { Driver, PossibleArches } from '../../renderer/api/Api';
import { LocalStorage } from '../../renderer/utils/LocalStorage';

const compare = require('compare-versions');
const debug = require('debug')('app:tips:driverVersion');

export default class DriverVersionTip implements ITip {
  name = 'Обновить драйвер';
  @observable
  workaround: any = <FormattedMessage id="TIPS_DRIVER_VERSION_POSSIBLY_OLD" />;
  @observable couldBeFixed = true;
  @observable defined = true;
  @observable isOk = true;
  @observable level = 2;
  @observable buttonDisabled = false;
  downloadLink: string = '';
  @observable fixError = '';

  async checkOut() {
    if (__WIN32__ === false) {
      this.defined = false;
      return;
    }

    const parsedReport = JSON.parse(localStorage._rawCollectedReport);
    const compatibleDevice = (parsedReport.openCl as Response).devices.find(
      d => d.vendor === 'NVIDIA'
    );

    if (!compatibleDevice) {
      debug(`Didn't found any compatible NVIDIA devices`);
      this.defined = false;

      return;
    }

    const cudaDevice = parsedReport.cuda && parsedReport.cuda.devices[0];
    // Two reasons of why cuda device doesn't exist
    // 1. device too old
    // 2. drivers too old
    // To determine which of, we parse device name
    if (!cudaDevice) {
      const parsed = /(\d+)/.exec(compatibleDevice.name);

      debug(`Didn't fount any CUDA devices.`);
      if (!parsed) {
        // Fine, didn't work...
        debug(
          'Failed to extract GPU series from its name\n',
          compatibleDevice.name
        );
        this.defined = false;

        return;
      }

      debug('GPU series is %d', +parsed[0]);
      // Older are cuda less than 2, we don't need 'em
      if (+parsed[0] < 430) {
        this.defined = false;

        return;
      }
    }

    const drivers: Driver[] = LocalStorage.appInfo!.drivers;
    // ToDo probly better use regex that this, does nvidia uses M in product names except laptops?
    const isMobile = compatibleDevice.name.includes('M');
    const major = +os.release().split('.')[0];
    const arch = os.arch();

    if (arch !== 'ia32' && arch !== 'x64') {
      debug('Architecture is %s, expected: [ia32, x64]', arch);
      this.defined = false;

      return;
    }

    const driver = drivers.find(
      d =>
        d.isMobile === isMobile &&
        d.major === major &&
        d.arch === PossibleArches[arch]
    );

    if (!driver) {
      this.defined = false;

      return;
    }

    debug.enabled &&
      debug(
        'Determined driver for %j is \n%O',
        { isMobile, major, arch },
        driver
      );

    const compareResult = compare(
      driver.version,
      compatibleDevice.driverVersion
    ); // driver.version > compatibleDevice.driverVersion

    if (compareResult === 1) {
      this.isOk = false;
      this.workaround = (
        <FormattedMessage
          id="TIPS_DRIVER_VERSION_UPDATE_AVAILABLE"
          values={{
            oldVersion: compatibleDevice.driverVersion,
            newVersion: driver.version,
          }}
        />
      );
      this.downloadLink = driver.downloadLink;
    } else {
      this.workaround = (
        <FormattedMessage
          id="TIPS_DRIVER_VERSION_UPDATE_UNAVAILABLE"
          values={{
            version: compatibleDevice.driverVersion,
          }}
        />
      );
    }

    debug(
      'Compare result [%s > %s] is %s',
      driver.version,
      compatibleDevice.driverVersion,
      compareResult
    );
  }

  async fixIt() {
    shell.openExternal(this.downloadLink);

    return false;
  }
}
