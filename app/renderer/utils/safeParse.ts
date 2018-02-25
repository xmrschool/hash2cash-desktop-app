export default function parseJSON(json: string, defaults: any = null): any | null {
  // We'll try/catch it in case the file doesn't exist yet, which will be the case on the first application run.
  // `fs.readFileSync` will return a JSON string which we then parse into a Javascript object
  try {
    return JSON.parse(json);
  } catch (error) {
    // if there was some kind of error, return the passed in defaults instead.
    return defaults;
  }
}
