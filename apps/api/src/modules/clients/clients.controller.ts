import {
  Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, CreateClientNoteDto, ListClientsDto } from './dto/client.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@hop/shared-types';

@ApiTags('clients')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'clients', version: '1' })
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @ApiOperation({ summary: 'List clients' })
  @Permissions('clients:read')
  @Get()
  findAll(@Query() query: ListClientsDto) {
    return this.clientsService.findAll(query);
  }

  @ApiOperation({ summary: 'Get client by ID' })
  @Permissions('clients:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new client' })
  @Permissions('clients:create')
  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser() user: JwtPayload) {
    return this.clientsService.create(dto, user.sub);
  }

  @ApiOperation({ summary: 'Update a client' })
  @Permissions('clients:update')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto, @CurrentUser() user: JwtPayload) {
    return this.clientsService.update(id, dto, user.sub);
  }

  @ApiOperation({ summary: 'Suspend a client' })
  @Permissions('clients:update')
  @Patch(':id/suspend')
  suspend(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.clientsService.suspend(id, user.sub);
  }

  @ApiOperation({ summary: 'Activate a client' })
  @Permissions('clients:update')
  @Patch(':id/activate')
  activate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.clientsService.activate(id, user.sub);
  }

  @ApiOperation({ summary: 'Add a note to a client' })
  @Permissions('clients:update')
  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() dto: CreateClientNoteDto,
    @CurrentUser() user: JwtPayload,
    @Request() req: any,
  ) {
    const authorName = `${req.user.firstName ?? ''} ${req.user.lastName ?? ''}`.trim() || user.email;
    return this.clientsService.addNote(id, dto, user.sub, authorName);
  }

  @ApiOperation({ summary: 'Get client activity' })
  @Permissions('clients:read')
  @Get(':id/activity')
  getActivity(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.clientsService.getActivity(id, page, perPage);
  }

  @ApiOperation({ summary: 'Adjust client credit balance' })
  @Permissions('clients:update')
  @Patch(':id/credit')
  adjustCredit(
    @Param('id') id: string,
    @Body() body: { amount: number },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clientsService.adjustCredit(id, body.amount, user.sub);
  }

  @ApiOperation({ summary: 'List client groups' })
  @Permissions('clients:read')
  @Get('groups/all')
  getGroups() {
    return this.clientsService.getGroups();
  }

  @ApiOperation({ summary: 'Create client group' })
  @Permissions('clients:create')
  @Post('groups')
  createGroup(@Body() body: { name: string; description?: string; color?: string; discountPercent?: number }) {
    return this.clientsService.createGroup(body);
  }
}
