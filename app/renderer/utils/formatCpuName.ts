export default function formatCpuName(brand: string) {
  return brand
    .replace('(R)', '®')
    .replace('(TM)', '™')
    .replace('CPU', '')
    .split('@')[0];
}
