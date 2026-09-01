import { All, Controller, Get, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Request, Response } from 'express';

@Controller()
export class GatewayController {
  private readonly serviceUrls: Map<string, string>;

  constructor(private readonly configService: ConfigService) {
    this.serviceUrls = new Map([
      [
        'role-allocation',
        this.configService.get('ROLE_ALLOCATION_SERVICE_URL', 'http://localhost:7002'),
      ],
    ]);
  }

  @Get('health')
  async getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        gateway: 'healthy'
      }
    };
  }

  @All('api/*')
  async handleApiRequest(
    @Req() request: Request,
    @Res({ passthrough: false }) res: Response,
  ) {
    const originalUrl = request.url;
    const method = request.method;

    // For EduWeConnect, we route /api/* to the role-allocation service by default
    // In a real environment, you might inspect originalUrl to route to different microservices.
    const serviceName = 'role-allocation';
    const targetUrl = this.serviceUrls.get(serviceName);

    if (!targetUrl) {
      return res.status(502).json({
        statusCode: 502,
        message: `Service configuration missing for ${serviceName}`,
        error: 'Bad Gateway',
      });
    }

    // Determine target path (e.g. forward everything after /api/)
    // Depending on the microservice, you might keep /api or strip it.
    // For now, let's keep the exact path so it proxies exactly.
    const url = `${targetUrl}${originalUrl}`;

    try {
      const config: any = {
        method,
        url,
        headers: { ...request.headers },
        responseType: 'arraybuffer',
        validateStatus: () => true, // resolve all statuses
      };

      // Strip host header so axios sets the correct one
      delete config.headers['host'];
      delete config.headers['connection'];

      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        if (request.body && Object.keys(request.body).length > 0) {
          config.data = request.body;
        }
      }

      const response = await axios(config);
      
      // Filter out problematic headers
      const headersToOmit = ['transfer-encoding', 'connection'];
      for (const [key, value] of Object.entries(response.headers)) {
        if (!headersToOmit.includes(key.toLowerCase()) && value !== undefined) {
          res.setHeader(key, value as string | string[]);
        }
      }

      res.status(response.status).send(response.data);
    } catch (error: any) {
      console.error(`[Gateway] Error proxying request to ${url}:`, error.message);
      res.status(503).json({
        statusCode: 503,
        message: 'Service Unavailable',
        error: error.message,
      });
    }
  }
}
