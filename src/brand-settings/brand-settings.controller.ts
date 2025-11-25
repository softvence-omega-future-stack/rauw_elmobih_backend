import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { BrandSettingsService } from './brand-settings.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileStorage, imageFileFilter } from 'src/utils/file-upload.util';
import { JwtAuthGuard } from 'src/guard/auth.guard';
import { RolesGuard } from 'src/guard/role.guard';
import { Roles } from 'src/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { deleteFileFromUploads } from 'src/utils/file-delete.util';

@Controller('brand-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class BrandSettingsController {
  constructor(private readonly service: BrandSettingsService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post('create')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: fileStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async create(
    @Body() body: any, // raw body containing "data"
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      let dto: CreateBrandDto;

      // Parse JSON from "data"
      if (body.data) {
        try {
          dto = JSON.parse(body.data);
        } catch (err) {
          return {
            success: false,
            message: "Invalid JSON format in 'data'",
            error: err.message,
          };
        }
      } else {
        return {
          success: false,
          message: "'data' JSON payload is required",
          error: "Missing 'data' field",
        };
      }

      // console.log("filename", file)

      // Attach file if uploaded
      if (file) {
        dto.logo = `/uploads/${file.filename}`;
      }

      return await this.service.create(dto);
    } catch (error) {
      console.error('Controller create error', error);
      return {
        success: false,
        message: 'Failed to create brand settings',
        error: error.message,
      };
    }
  }

  @Patch('update/:id')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: fileStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      let dto;

      // Parse JSON from the "data" field
      if (body.data) {
        try {
          dto = JSON.parse(body.data);
        } catch (err) {
          return {
            success: false,
            message: "Invalid JSON format in 'data'",
            error: err.message,
          };
        }
      } else {
        return {
          success: false,
          message: "'data' JSON payload is required",
          error: "Missing 'data' field",
        };
      }

      // Find existing record
      const existing = await this.service.findById(id);
      if (!existing) {
        return {
          success: false,
          message: 'Record not found',
          error: `No brand settings found with id ${id}`,
        };
      }

      // If logo uploaded → delete old one + set new path
      if (file) {
        if (existing.logo) deleteFileFromUploads(existing.logo);
        dto.logo = `/uploads/${file.filename}`;
      }

      // Update record
      return await this.service.update(id, dto);
    } catch (error) {
      console.error('Controller update error', error);
      return {
        success: false,
        message: 'Failed to update brand settings',
        error: error.message,
      };
    }
  }

  @Delete('delete/:id')
  async remove(@Param('id') id: string) {
    try {
      return await this.service.remove(id);
    } catch (error) {
      console.error('Controller delete error', error);
      return {
        success: false,
        message: 'Failed to delete brand settings',
        error: error.message,
      };
    }
  }
}
