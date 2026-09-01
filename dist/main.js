"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const app_module_js_1 = require("./app.module.js");
const express = __importStar(require("express"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_js_1.AppModule, {
        bodyParser: false,
    });
    const configService = app.get(config_1.ConfigService);
    app.use((req, res, next) => {
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('multipart/form-data')) {
            return next();
        }
        express.json({ limit: '50mb' })(req, res, () => {
            express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
        });
    });
    common_1.Logger.log('Environment configuration loaded', 'Bootstrap');
    common_1.Logger.log(`Node Environment: ${process.env.NODE_ENV}`, 'Bootstrap');
    const corsOrigin = configService.get('CORS_ORIGIN', '*');
    const allowedOrigins = corsOrigin === '*'
        ? '*'
        : corsOrigin.split(',').map((origin) => origin.trim());
    common_1.Logger.log(`Enabling CORS with origin: ${JSON.stringify(allowedOrigins)}`, 'Bootstrap');
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin',
            'X-User-Id',
        ],
        exposedHeaders: ['Content-Type', 'Authorization'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });
    const port = configService.get('PORT', 7001);
    await app.listen(port);
    common_1.Logger.log(`🚀 EduWeConnect API Gateway is running on: http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map