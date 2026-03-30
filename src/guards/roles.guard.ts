import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRole = this.reflector.get<string>(
            'role',
            context.getHandler(),
        );

        if (!requiredRole) return true;

        const req = context.switchToHttp().getRequest();
        const user = req.user;

        if (!user) {
            throw new ForbiddenException('No user found in request');
        }

        if (user.role.name !== requiredRole) {
            throw new ForbiddenException('Access denied');
        }

        return true;
    }
}