
import winston from 'winston';
import Transport from 'winston-transport';

export type LogMessage = string;

export class Logging {
  private _logger: winston.Logger;

  constructor() {
    this._logger = this._initializeWinston();
  }

  public logInfo(msg: LogMessage) {
    this._logger.log('error', msg);
  }

  private _initializeWinston() {
    const logger = winston.createLogger({
      transports: Logging._getTransports(),
    });
    return logger;
  }

  private static _getTransports() {
    const transports: Array<Transport> = [
      new winston.transports.Console({}),
      new winston.transports.File({
        filename: '/mnt/data/app.log'
      })
    ];

    return transports;
  }
}

export const logger = new Logging();