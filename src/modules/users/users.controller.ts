import { Controller, Get } from '@nestjs/common';
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
}