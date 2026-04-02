import { Controller, Get, Req } from '@nestjs/common';
import { Auth } from 'src/decorators';
import { UsersService } from './users.service';

import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    // 🔹 Get all users (Admin only)
    @Auth('admin')
    @ApiBearerAuth()
    @Get()
    @ApiOperation({ summary: 'Get all users (Admin only)' })
    @ApiResponse({
        status: 200,
        description: 'List of all users',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async getAllUsers() {
        return this.usersService.findAllUsers();
    }

    // 🔹 me
    @Auth()
    @ApiBearerAuth()
    @Get('me')
    @ApiOperation({ summary: 'Get current user' })
    @ApiResponse({
        status: 200,
        description: 'User details',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async me(@Req() req) {
        return this.usersService.findById(req.user.sub);
    }

    // 🔹 Get current user's subscription
    @Auth()
    @ApiBearerAuth()
    @Get('me/subscription')
    @ApiOperation({ summary: 'Get current user subscription' })
    @ApiResponse({
        status: 200,
        description: 'User subscription details',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async getMySubscription(@Req() req) {
        return this.usersService.getUserSubscription(req.user.sub);
    }
}