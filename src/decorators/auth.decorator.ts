import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { RolesGuard } from '../guards/roles.guard';
import { HasRole } from './roles.decorator';

export function Auth(role?: string) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    role ? HasRole(role) : (target) => target,
  );
}
