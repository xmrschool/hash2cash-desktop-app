import { CpuInfo } from 'cpuid-detector';
import { Systeminformation } from 'systeminformation';

export default function isCpuIdReport(
  arg: CpuInfo | Systeminformation.CpuData
): arg is CpuInfo {
  return typeof (arg as CpuInfo).extModel !== undefined;
}
