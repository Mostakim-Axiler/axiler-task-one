import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class AppLogger implements LoggerService {
    private logger: winston.Logger;

    constructor() {
        const logType = process.env.LOG_TYPE || 'stack'; // daily | stack

        const transports: winston.transport[] = [];

        // 🔥 JSON format
        const jsonFormat = winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
        );

        if (logType === 'daily') {
            // ✅ Daily rotation
            transports.push(
                new winston.transports.DailyRotateFile({
                    dirname: 'logs',
                    filename: '%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '30d', // keep 30 days
                    format: jsonFormat,
                }),
            );
        } else {
            // ✅ Single file (stack)
            transports.push(
                new winston.transports.File({
                    filename: 'logs/app.log',
                    format: jsonFormat,
                }),
            );
        }

        // Optional console log (dev)
        if (process.env.NODE_ENV !== 'production') {
            transports.push(
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple(),
                    ),
                }),
            );
        }

        this.logger = winston.createLogger({
            level: 'info',
            transports,
        });
    }

    log(message: string) {
        this.logger.info(message);
    }

    error(message: string, trace?: string) {
        this.logger.error(message, { trace });
    }

    warn(message: string) {
        this.logger.warn(message);
    }

    debug(message: string) {
        this.logger.debug(message);
    }

    verbose(message: string) {
        this.logger.verbose(message);
    }
}