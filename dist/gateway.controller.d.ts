import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
export declare class GatewayController {
    private readonly configService;
    private readonly serviceUrls;
    constructor(configService: ConfigService);
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        services: {
            gateway: string;
        };
    }>;
    handleApiRequest(request: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
