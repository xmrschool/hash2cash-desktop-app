import * as React from 'react';
import * as electron from 'electron';
import * as path from 'path';

const app = electron.app || electron.remote.app;

export const librariesPath = path.join(app.getPath('userData'));

export function selectCopy(event: any) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(event.target as any);
  selection.removeAllRanges();
  selection.addRange(range);
}

export default function PathToLibraries() {
  const prefix = __WIN32__ ? '\\' : '/'; // Backslash in Win32

  return (
    <code onClick={selectCopy} onContextMenu={selectCopy}>
      {librariesPath.replace(/\//g, prefix)}
      {prefix}
    </code>
  );
}