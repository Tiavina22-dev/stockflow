import 'reflect-metadata';
import 'dotenv/config';
import { BadRequestException, Catch, ExceptionFilter, ArgumentsHost, HttpException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { AppModule } from './module';

@Catch()
class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const prismaCode = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
    const status = error instanceof HttpException ? error.getStatus()
      : prismaCode === 'P2002' || prismaCode === 'P2003' ? 409
      : prismaCode === 'P2025' ? 404
      : error instanceof Prisma.PrismaClientValidationError ? 400 : 500;
    const raw = error instanceof HttpException ? error.getResponse() : null;
    response.status(status).json({ code: status === 409 ? 'CONFLICT' : status === 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR',
      message: status === 500 ? 'Erreur interne.' : typeof raw === 'string' ? raw : (raw as { message?: string })?.message ?? (status === 400 ? 'Paramètres invalides.' : status === 404 ? 'Objet introuvable.' : 'Conflit de données.'),
      details: typeof raw === 'object' && raw !== null ? (raw as { message?: unknown }).message : undefined });
  }
}

async function bootstrap() {
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('DATABASE_URL et JWT_SECRET (32 caractères minimum) requis.');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? false });
  const messages=(errors:ValidationError[]):string[]=>errors.flatMap(e=>[...Object.values(e.constraints??{}),...messages(e.children??[])]);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, exceptionFactory: errors => new BadRequestException(messages(errors)) }));
  app.useGlobalFilters(new ApiExceptionFilter());
  const config = new DocumentBuilder().setTitle('StockFlow API').setVersion('0.1.0').addBearerAuth().build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  if (process.env.LOCAL_DEV_AUTH === 'true' && process.env.NODE_ENV === 'production') throw new Error('Authentification locale interdite en production.');
  await app.listen(Number(process.env.PORT ?? '3001'), process.env.LOCAL_DEV_AUTH === 'true' ? '127.0.0.1' : (process.env.HOST ?? '127.0.0.1'));
}
void bootstrap();
