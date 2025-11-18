import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateSettingsDto } from './dto/create-settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from 'src/guard/auth.guard';
import { RolesGuard } from 'src/guard/role.guard';
import { Roles } from 'src/decorator/roles.decorator';
import { Role } from '@prisma/client';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  // Get all profiles 
  @Get('get-platform-profiles')
  async getSettings() {
    try {
      return await this.settingsService.getSettings();
    } catch (err) {
      return {
        success: false,
        message: 'Failed to fetch settings',
        error: err.message,
      };
    }
  }

  // Get single profile by id
  @Get('get-platform-profiles/:id')
  async getSingle(@Param('id') id: string) {
    try {
      return await this.settingsService.getSingle(id);
    } catch (err) {
      return {
        success: false,
        message: 'Failed to fetch profile',
        error: err.message,
      };
    }
  }

  // Create profile
  @Post('create-platform-profile')
  async createSettings(@Body() dto: CreateSettingsDto) {
    try {
      return await this.settingsService.createSettings(dto);
    } catch (err) {
      return {
        success: false,
        message: 'Failed to create settings',
        error: err.message,
      };
    }
  }

  // Update profile
  @Patch('update-platform-profile/:id')
  async updateSettings(
    @Param('id') id: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    try {
      return await this.settingsService.updateSettings(id, dto);
    } catch (err) {
      return {
        success: false,
        message: 'Failed to update settings',
        error: err.message,
      };
    }
  }

  // Delete
  @Delete('delete-platform-profile/:id')
  async deleteSettings(@Param('id') id: string) {
    try {
      return await this.settingsService.deleteSettings(id);
    } catch (err) {
      return {
        success: false,
        message: 'Failed to delete settings',
        error: err.message,
      };
    }
  }
}
