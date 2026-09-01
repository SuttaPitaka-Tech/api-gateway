"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let GatewayController = class GatewayController {
    configService;
    serviceUrls;
    constructor(configService) {
        this.configService = configService;
        this.serviceUrls = new Map([
            [
                'role-allocation',
                this.configService.get('ROLE_ALLOCATION_SERVICE_URL', 'http://localhost:7002'),
            ],
        ]);
    }
    async getHealth() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                gateway: 'healthy'
            }
        };
    }
    async handleApiRequest(request, res) {
        const originalUrl = request.url;
        const method = request.method;
        const serviceName = 'role-allocation';
        const targetUrl = this.serviceUrls.get(serviceName);
        if (!targetUrl) {
            return res.status(502).json({
                statusCode: 502,
                message: `Service configuration missing for ${serviceName}`,
                error: 'Bad Gateway',
            });
        }
        const url = `${targetUrl}${originalUrl}`;
        try {
            const config = {
                method,
                url,
                headers: { ...request.headers },
                responseType: 'arraybuffer',
                validateStatus: () => true,
            };
            delete config.headers['host'];
            delete config.headers['connection'];
            if (['POST', 'PUT', 'PATCH'].includes(method)) {
                if (request.body && Object.keys(request.body).length > 0) {
                    config.data = request.body;
                }
            }
            const response = await (0, axios_1.default)(config);
            const headersToOmit = ['transfer-encoding', 'connection'];
            for (const [key, value] of Object.entries(response.headers)) {
                if (!headersToOmit.includes(key.toLowerCase()) && value !== undefined) {
                    res.setHeader(key, value);
                }
            }
            res.status(response.status).send(response.data);
        }
        catch (error) {
            console.error(`[Gateway] Error proxying request to ${url}:`, error.message);
            res.status(503).json({
                statusCode: 503,
                message: 'Service Unavailable',
                error: error.message,
            });
        }
    }
};
exports.GatewayController = GatewayController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "getHealth", null);
__decorate([
    (0, common_1.All)('api/*'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "handleApiRequest", null);
exports.GatewayController = GatewayController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GatewayController);
//# sourceMappingURL=gateway.controller.js.map