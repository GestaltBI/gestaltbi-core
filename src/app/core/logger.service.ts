import { Injectable } from '@angular/core';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  LOG = 'log',
}

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  constructor() {}

  debug(message: string, ...params: any[]): void {
    this.writeToLog(message, LogLevel.DEBUG, params);
  }

  info(message: string, ...params: any[]): void {
    this.writeToLog(message, LogLevel.INFO, params);
  }

  warn(message: string, ...params: any[]): void {
    this.writeToLog(message, LogLevel.WARN, params);
  }

  error(message: string, ...params: any[]): void {
    this.writeToLog(message, LogLevel.ERROR, params);
  }

  log(message: string, ...params: any[]): void {
    this.writeToLog(message, LogLevel.LOG, params);
  }

  private writeToLog(message: string, level: LogLevel, ...params: any[]): void {
    let value = new Date().toISOString() + ' - ';
    value += 'Level: ' + level;
    value += ' - Message: ' + message;
    console.log(value, params);
  }
}
