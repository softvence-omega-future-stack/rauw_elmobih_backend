import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { deleteFileFromUploads } from 'src/utils/file-delete.util';
import { successResponse, errorResponse } from 'src/utils/response.util';

@Injectable()
export class BrandSettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    try {
      const items = await this.prisma.brandSettings.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return successResponse(items, 'Brand settings fetched successfully');
    } catch (error) {
      console.error('getAll brand settings error', error);
      return errorResponse(
        error.message || 'Something went wrong',
        'Failed to fetch brand settings',
      );
    }
  }

  async getOne(id: string) {
    try {
      const item = await this.prisma.brandSettings.findUnique({
        where: { id },
      });
      if (!item) throw new NotFoundException('Brand settings not found');
      return successResponse(item, 'Brand settings fetched successfully');
    } catch (error) {
      console.error('getOne brand settings error', error);
      return errorResponse(
        error.message || 'Something went wrong',
        'Failed to fetch brand settings',
      );
    }
  }

  async create(dto: CreateBrandDto) {
    try {
      const created = await this.prisma.brandSettings.create({
        data: dto as any,
      });
      return successResponse(created, 'Brand settings created successfully');
    } catch (error) {
      console.error('create brand settings error', error);
      return errorResponse(
        error.message || 'Something went wrong',
        'Failed to create brand settings',
      );
    }
  }

  async findById(id: string) {
    return this.prisma.brandSettings.findUnique({ where: { id } });
  }

  async update(id: string, dto: any) {
    try {
      const updated = await this.prisma.brandSettings.update({
        where: { id },
        data: dto,
      });

      return {
        success: true,
        message: 'Brand settings updated successfully',
        data: updated,
      };
    } catch (error) {
      console.error('update brand settings error', error);
      return {
        success: false,
        message: 'Failed to update brand settings',
        error: error.message,
      };
    }
  }

  async remove(id: string) {
    try {
      const brand = await this.prisma.brandSettings.findUnique({
        where: { id },
      });

      if (!brand) {
        throw new NotFoundException(`Brand settings with ID ${id} not found`);
      }

      await this.prisma.brandSettings.delete({
        where: { id },
      });

      if (brand.logo) {
        await deleteFileFromUploads(brand.logo);
      }

      return {
        success: true,
        message: 'Brand settings deleted successfully',
      };
    } catch (error) {
      console.error('delete brand settings error', error);
      return errorResponse(
        error.message || 'Something went wrong',
        'Failed to delete brand settings',
      );
    }
  }
}
