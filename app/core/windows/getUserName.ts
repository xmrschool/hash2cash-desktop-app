import * as path from 'path';

export default function getUserName() {
  try {
    return process.env['USERPROFILE']!.split(path.sep)[2];
  } catch (e) {
    return null;
  }
}
