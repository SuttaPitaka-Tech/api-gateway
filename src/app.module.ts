import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GatewayController } from './gateway.controller.js';
import { MinioModule } from './minio/minio.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'environment/.env.local',
    }),
    MinioModule,
  ],
  controllers: [GatewayController],
  providers: [],
})
export class AppModule {}
