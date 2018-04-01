declare module 'request-progress' {
  import * as request from 'request';

  import { WriteStream } from 'fs';

  class RequestEmitter {
    pipe(stream: WriteStream): void;
    on(event: 'progress', callback: (stats: any) => void): void;
    on(event: 'error', callback: (error: any) => void): void;
    on(event: 'end', callback: (data: any) => void): void;
    on(event: string, callback: (response: any) => void): void;
  }

  const progress: (request: request.Request, options: any) => RequestEmitter;

  export = progress;
}
