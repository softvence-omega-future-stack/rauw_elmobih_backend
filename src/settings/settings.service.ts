import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateSettingsDto } from './dto/create-settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { successResponse, errorResponse } from 'src/utils/response.util';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // Get all settings as ARRAY
  async getSettings() {
    try {
      const settings = await this.prisma.organizationSettings.findMany();

      return successResponse(settings, 'Settings fetched successfully');
    } catch (error) {
      console.error('Error in getSettings:', error);
      return errorResponse(
        error.message,
        'Failed to fetch settings',
      );
    }
  }

  // Get single settings
  async getSingle(id: string) {
    try {
      const setting = await this.prisma.organizationSettings.findUnique({
        where: { id },
      });

      if (!setting) throw new NotFoundException('Settings not found');

      return successResponse(setting, 'Settings fetched successfully');
    } catch (error) {
      console.error('Error in getSingle:', error);

      return errorResponse(
        error.message,
        'Failed to fetch setting',
      );
    }
  }

  // Create settings (only one allowed)
async createSettings(dto: CreateSettingsDto) {
  try {
    const exists = await this.prisma.organizationSettings.findFirst({
      where: {
        organizationType: dto.organizationType,   
      },
    });

    if (exists) {
      return errorResponse(
        'Settings for this organization type already exists',
        `${dto.organizationType} already has a settings profile`
      );
    }

    const created = await this.prisma.organizationSettings.create({
      data: dto,
    });

    return successResponse(created, 'Settings created successfully');
  } catch (error) {
    return errorResponse(
      error.message,
      'Failed to create settings',
    );
  }
}


  // Update existing
  async updateSettings(id: string, dto: UpdateSettingsDto) {
    try {
      const exists = await this.prisma.organizationSettings.findUnique({
        where: { id },
      });

      if (!exists) throw new NotFoundException('Settings not found');

      const updated = await this.prisma.organizationSettings.update({
        where: { id },
        data: dto,
      });

      return successResponse(updated, 'Settings updated successfully');
    } catch (error) {
      console.error('Error in updateSettings:', error);

      return errorResponse(
        error.message,
        'Failed to update settings',
      );
    }
  }

  // Delete
  async deleteSettings(id: string) {
    try {
      const exists = await this.prisma.organizationSettings.findUnique({
        where: { id },
      });

      if (!exists) throw new NotFoundException('Settings not found');

      await this.prisma.organizationSettings.delete({
        where: { id },
      });

      return successResponse(null, 'Settings deleted successfully');
    } catch (error) {
      console.error('Error in deleteSettings:', error);

      return errorResponse(
        error.message,
        'Failed to delete settings',
      );
    }
}
}
