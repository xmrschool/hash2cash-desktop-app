const { ipcRenderer } = require('electron');

ipcRenderer.on('execute', async (sender, data) => {
  let result;
  let error;

  try {
    result = await eval(data);
  } catch (e) {
    error = e.message;
  }

  ipcRenderer.send('execution-result', { result, error, command: data });
});
