const key = 'runningPids';

export function getRunningPids(): number[] {
  try {
    if (localStorage[key]) {
      return JSON.parse(localStorage[key]);
    }

    return [];
  } catch (e) {
    return [];
  }
}

export function addRunningPid(pid: number): void {
  const pids = getRunningPids();
  pids.push(pid);

  localStorage[key] = JSON.stringify(pids);
}

export function shiftRunningPid(pid: number) {
  const pids = getRunningPids();

  localStorage[key] = JSON.stringify(pids.filter(d => d !== pid));
}

export function clearPids() {
  localStorage[key] = '[]';
}
