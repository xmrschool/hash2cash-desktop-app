import path from 'path';
import when from 'when';
import * as u from './util';

/**
 * Add content to an archive.
 * @promise Add
 * @param archive {string} Path to the archive.
 * @param files {string|array} Files to add.
 * @param options {Object} An object of acceptable options to 7za bin.
 * @resolve {array} Arguments passed to the child-process.
 * @progress {array} Listed files and directories.
 * @reject {Error} The error as issued by 7-Zip.
 */
export default function(archive, files, { exePath, ...options } = {}) {
  return when.promise(function(resolve, reject, progress) {
    // Convert array of files into a string if needed.
    files = u.files(files);

    // Create a string that can be parsed by `run`.
    let command = exePath ? exePath : /(rar)$/i.test(archive) ? '7z' : '7za';
    command += ' a "' + archive + '" ' + files;

    // Start the command
    u.run(command, options)

      // When a stdout is emitted, parse each line and search for a pattern. When
      // the pattern is found, extract the file (or directory) name from it and
      // pass it to an array. Finally returns this array in the progress function.
      .progress(function(data) {
        const entries = [];
        data.split('\n').forEach(function(line) {
          if (line.substr(0, 13) === 'Compressing  ') {
            entries.push(line.substr(13, line.length).replace(path.sep, '/'));
          }
        });
        return progress(entries);
      })

      // When all is done resolve the Promise.
      .then(function(args) {
        return resolve(args);
      })

      // Catch the error and pass it to the reject function of the Promise.
      .catch(function(err) {
        return reject(err);
      });
  });
}
