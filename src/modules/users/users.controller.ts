import { Controller, Get, Req } from '@nestjs/common';
import { Auth } from 'src/decorators';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    // 🔹 Get all users (Admin only)
    @Auth('admin')
    @Get()
    async getAllUsers() {
        return this.usersService.findAllUsers();
    }

    // Get user subscription
    @Auth()
    @Get('me/subscription')
    async getMySubscription(@Req() req) {
        console.log(req.user)
        return this.usersService.getUserSubscription(req.user.sub);
    }
}