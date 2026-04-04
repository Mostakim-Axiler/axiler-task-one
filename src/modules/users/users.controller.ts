import {
  Controller,
  Get,
  Req,
  Patch,
  Param,
  Body,
  forwardRef,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

import { Auth } from 'src/decorators';
import { UsersService } from './users.service';
import { UpdateUserDto } from './users.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    @Inject(forwardRef(() => UsersService)) private usersService: UsersService,
  ) {}

  // 🔹 Get all users (Admin only)
  @Auth('admin')
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllUsers() {
    return this.usersService.findAllUsers();
  }

  // 🔹 Get current user
  @Auth()
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@Req() req) {
    return this.usersService.findById(req.user.sub);
  }

  // 🔹 Get current user's subscription
  @Auth()
  @ApiBearerAuth()
  @Get('me/subscription')
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiResponse({ status: 200, description: 'User subscription details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMySubscription(@Req() req) {
    return this.usersService.getUserSubscription(req.user.sub);
  }

  // 🔹 Update current user info (self only)
  @Auth()
  @ApiBearerAuth()
  @Patch('me')
  @ApiOperation({ summary: 'Update current user info' })
  @ApiBody({ type: UpdateUserDto })
  async updateMe(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(req.user.sub, updateUserDto);
  }

  // 🔹 Toggle active status (Admin only)
  @Auth('admin')
  @ApiBearerAuth()
  @Patch(':id/active')
  @ApiOperation({ summary: 'Toggle user active status (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({
    schema: {
      properties: {
        isActive: { type: 'boolean' },
      },
    },
  })
  async toggleActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.usersService.setActive(id, isActive);
  }
}
