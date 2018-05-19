import * as React from 'react';
import { sortBy } from 'lodash';
import { shell } from 'electron';
import { FormattedMessage } from 'react-intl';
import * as os from 'os';
import { Response } from 'opencl-detector';
import { observable } from 'mobx';
import { ITip } from './';
import { Driver, SeriesFilter } from '../../renderer/api/Api';
import { LocalStorage } from '../../renderer/utils/LocalStorage';
import { intl } from '../../renderer/intl';

const compare = require('compare-versions');
const debug = require('debug')('app:tips:driverVersion');

export function seriesMatch(series: SeriesFilter[], name: string) {
  const filteredName = name.includes('GB')
    ? name.replace(/ (\d+)GB/, '')
    : name;
  const lowercasedFiltered = filteredName.toLowerCase();
  const serieNumber = /(\d+)/.exec(filteredName);
  const parsedSerieNumber = serieNumber ? +serieNumber[0] : 0;

  debug({ filteredName, serieNumber, parsedSerieNumber, series });

  const matchedFilters = series.filter(filter => {
    if (filter.type && parsedSerieNumber) {
      return (
        lowercasedFiltered.includes(filter.type.toLowerCase()) &&
        (filter as any).minimalSupported <= parsedSerieNumber &&
        (filter as any).maximalSupported >= parsedSerieNumber
      );
    } else if (filter.seriesList) {
      const matchedSerie = filter.seriesList.find(d => d === filteredName);

      return !!matchedSerie;
    }

    debug('Faled to check condition ', filter);
    // Condition is strange.
    return false;
  });

  return matchedFilters.length > 0;
}
export default class DriverVersionTip implements ITip {
  id = 'driverVersion';
  name = 'Update GPU drivers';
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
    if (__WIN32__ === false || process.arch === 'ia32') {
      this.defined = false;
      return;
    }

    this.name = intl.formatMessage({ id: 'TIPS_UPDATE_DRIVER_LABEL' });

    const parsedReport = JSON.parse(localStorage._rawCollectedReport);

    if (!parsedReport || !parsedReport.openCl) return;
    const compatibleDevice = (parsedReport.openCl as Response).devices.find(d =>
      d.vendor.startsWith('NVIDIA')
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
        debug('GPU is too old: ', parsed);
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

    if (!drivers) {
      this.workaround = (
        <FormattedMessage
          id="TIPS_DRIVER_VERSION_UPDATE_UNAVAILABLE"
          values={{
            version: compatibleDevice.driverVersion,
          }}
        />
      );

      return;
    }

    debug('Tryna find GPU that matches condition: %o', {
      isMobile,
      major,
      arch,
    });
    const matchedDrivers = drivers.filter(
      d =>
        d.isMobile === isMobile &&
        d.major === major &&
        d.arch === (arch as any) &&
        seriesMatch(d.series, compatibleDevice.name)
    );

    const driver = sortBy(matchedDrivers, 'priority')[0];

    debug('Driver is: ', driver);

    if (!driver) {
      debug('No matched driver');
      this.defined = false;

      return;
    }

    if (debug.enabled)
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

    this.buttonDisabled = false;
    return true;
  }
}
