import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Put,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('address')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  // ─── public (still guarded) ───────────────────────────────────────────────

  @Get('society-options')
  getSocietyOptions() {
    return this.addressService.getSocietyOptions();
  }

  // ─── 37A.1 — validate a pin location ─────────────────────────────────────

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validateLocation(
    @Body() body: { lat: number; lng: number; userLat?: number; userLng?: number },
  ) {
    return this.addressService.validateLocation(body.lat, body.lng, body.userLat, body.userLng);
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  @Post()
  create(@Request() req, @Body() createAddressDto: CreateAddressDto) {
    return this.addressService.create(req.user.id, createAddressDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.addressService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.addressService.findOne(id, req.user.id);
  }

  // 36A.3 — full PATCH (all fields editable)
  @Patch(':id')
  updatePatch(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.update(id, req.user.id, dto);
  }

  @Put(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressService.update(id, req.user.id, updateAddressDto);
  }

  // 36A.4 — set-default shortcut; returns full updated list
  @Patch(':id/set-default')
  setDefault(@Request() req, @Param('id') id: string) {
    return this.addressService.setDefault(id, req.user.id);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.addressService.remove(id, req.user.id);
  }
}

// Made with Bob
