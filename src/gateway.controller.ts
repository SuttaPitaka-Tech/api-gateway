import { All, Controller, Get, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as http from 'http';
import * as https from 'https';
import type { Request, Response } from 'express';

@Controller()
export class GatewayController {
  private readonly serviceUrls: Map<string, string>;
  private readonly proxyClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.serviceUrls = new Map([
      [
        'role-allocation',
        this.configService.get('ROLE_ALLOCATION_SERVICE_URL', 'http://localhost:7002'),
      ],
      [
        'notification',
        this.configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:7003'),
      ],
    ]);

    // High-performance persistent connection pooling
    this.proxyClient = axios.create({
      httpAgent: new http.Agent({ keepAlive: true, maxSockets: 100, keepAliveMsecs: 10000 }),
      httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 100, keepAliveMsecs: 10000 }),
      timeout: 30000,
      validateStatus: () => true,
      responseType: 'arraybuffer',
    });
  }

  @Get('health')
  async getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        gateway: 'healthy',
        roleAllocation: this.serviceUrls.get('role-allocation'),
        notification: this.serviceUrls.get('notification'),
      },
    };
  }

  @All('*')
  async handleApiRequest(
    @Req() request: Request,
    @Res({ passthrough: false }) res: Response,
  ) {
    const originalUrl = request.url;
    const method = request.method;

    // Direct health check bypass
    if (originalUrl === '/health' || originalUrl === '/health/') {
      return res.json(await this.getHealth());
    }

    // Determine target service
    let serviceName = 'role-allocation';
    if (originalUrl.startsWith('/api/notifications') || originalUrl.startsWith('/notifications')) {
      serviceName = 'notification';
    }
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
      const config: any = {
        method,
        url,
        headers: { ...request.headers },
      };

      // Strip host and connection headers so the proxy client sets the correct ones
      delete config.headers['host'];
      delete config.headers['connection'];

      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const contentType = (request.headers['content-type'] || '').toString();
        if (contentType.includes('multipart/form-data')) {
          config.data = request;
          config.maxBodyLength = Infinity;
          config.maxContentLength = Infinity;
        } else if (request.body !== undefined && request.body !== null) {
          config.data = request.body;
        }
      }

      const response = await this.proxyClient.request(config);

      // Filter out problematic hop-by-hop and downstream CORS headers
      const headersToOmit = [
        'transfer-encoding',
        'connection',
        'access-control-allow-origin',
        'access-control-allow-credentials',
        'access-control-allow-methods',
        'access-control-allow-headers',
        'access-control-expose-headers',
      ];
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
