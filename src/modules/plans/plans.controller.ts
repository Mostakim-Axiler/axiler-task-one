import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Put,
    Delete,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto } from './plans.dto';
import { Auth, Public } from 'src/decorators';

@Controller('plans')
export class PlansController {
    constructor(private readonly plansService: PlansService) { }

    // 🔹 Create
    @Auth('admin')
    @Post()
    create(@Body() body: CreatePlanDto) {
        return this.plansService.create(body);
    }

    // 🔹 Get all
    @Auth('admin')
    @Get()
    findAll() {
        return this.plansService.findAll();
    }

    // 🔹 Get active plans
    @Public()
    @Get('active')
    findActive() {
        return this.plansService.findActive();
    }

    // 🔹 Get one
    @Public()
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.plansService.findById(id);
    }

    // 🔹 Update
    @Auth('admin')
    @Put(':id')
    update(@Param('id') id: string, @Body() body: UpdatePlanDto) {
        return this.plansService.update(id, body);
    }

    // 🔹 Delete
    @Auth('admin')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.plansService.delete(id);
    }
}