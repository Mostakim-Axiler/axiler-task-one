import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto, SetActiveDto, UpdatePlanDto } from './plans.dto';
import { Auth, Public } from 'src/decorators';

import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  // 🔹 Create
  @Auth('admin')
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new plan (Admin only)' })
  @ApiBody({ type: CreatePlanDto })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  create(@Body() body: CreatePlanDto) {
    return this.plansService.create(body);
  }

  // 🔹 Get all
  @Auth('admin')
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all plans (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all plans' })
  findAll() {
    return this.plansService.findAll();
  }

  // 🔹 Get active plans
  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Get active plans (Public)' })
  @ApiResponse({ status: 200, description: 'List of active plans' })
  findActive() {
    return this.plansService.findActive();
  }

  // 🔹 Get one
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiParam({
    name: 'id',
    example: '64f1a2b3c4d5e6f7g8h9i0j',
    description: 'Plan ID',
  })
  @ApiResponse({ status: 200, description: 'Plan details' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  findOne(@Param('id') id: string) {
    return this.plansService.findById(id);
  }

  // 🔹 Update
  @Auth('admin')
  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ summary: 'Update a plan (Admin only)' })
  @ApiParam({
    name: 'id',
    example: '64f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiBody({ type: UpdatePlanDto })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  update(@Param('id') id: string, @Body() body: UpdatePlanDto) {
    return this.plansService.update(id, body);
  }

  // 🔹 Set Active
  @Auth('admin')
  @ApiBearerAuth()
  @Patch(':id/active')
  @ApiOperation({ summary: 'Set active status of a plan (Admin only)' })
  @ApiParam({
    name: 'id',
    example: '64f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiBody({ type: SetActiveDto })
  @ApiResponse({ status: 200, description: 'Plan status updated successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  setActive(@Param('id') id: string, @Body() body: SetActiveDto) {
    return this.plansService.setActive(id, body.isActive);
  }

  // 🔹 Delete
  @Auth('admin')
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a plan (Admin only)' })
  @ApiParam({
    name: 'id',
    example: '64f1a2b3c4d5e6f7g8h9i0j',
  })
  @ApiResponse({ status: 200, description: 'Plan deleted successfully' })
  remove(@Param('id') id: string) {
    return this.plansService.delete(id);
  }
}
