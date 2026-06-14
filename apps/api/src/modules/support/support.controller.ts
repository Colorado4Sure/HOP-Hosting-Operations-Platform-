import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@hop/shared-types';

@ApiTags('support')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'support', version: '1' })
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ─── Tickets ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List support tickets' })
  @Permissions('support:read')
  @Get('tickets')
  listTickets(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('clientId') clientId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('search') search?: string,
  ) {
    return this.supportService.listTickets({
      page, perPage, clientId, departmentId, status, priority, assignedToId, search,
    });
  }

  @ApiOperation({ summary: 'Create a support ticket' })
  @Permissions('support:read')
  @Post('tickets')
  createTicket(
    @Body()
    body: {
      clientId: string;
      departmentId: string;
      subject: string;
      priority?: string;
      serviceId?: string;
      message: string;
    },
    @CurrentUser() user: JwtPayload,
    @Request() req: any,
  ) {
    const authorName = `${req.user?.firstName ?? ''} ${req.user?.lastName ?? ''}`.trim() || user.email;
    return this.supportService.createTicket(body, user.sub, authorName);
  }

  @ApiOperation({ summary: 'Get ticket by ID' })
  @Permissions('support:read')
  @Get('tickets/:id')
  getTicket(@Param('id') id: string) {
    return this.supportService.getTicket(id);
  }

  @ApiOperation({ summary: 'Add a reply to a ticket' })
  @Permissions('support:reply')
  @Post('tickets/:id/replies')
  addReply(
    @Param('id') id: string,
    @Body() body: { message: string; isInternal?: boolean },
    @CurrentUser() user: JwtPayload,
    @Request() req: any,
  ) {
    const authorName = `${req.user?.firstName ?? ''} ${req.user?.lastName ?? ''}`.trim() || user.email;
    return this.supportService.addReply(id, body, user.sub, authorName, 'Staff');
  }

  @ApiOperation({ summary: 'Update ticket status' })
  @Permissions('support:close')
  @Patch('tickets/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.supportService.updateTicketStatus(id, body.status, user.sub);
  }

  @ApiOperation({ summary: 'Assign a ticket to a staff member' })
  @Permissions('support:assign')
  @Patch('tickets/:id/assign')
  assignTicket(
    @Param('id') id: string,
    @Body() body: { assignedToId: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.supportService.assignTicket(id, body.assignedToId, user.sub);
  }

  @ApiOperation({ summary: 'Close a ticket' })
  @Permissions('support:close')
  @Patch('tickets/:id/close')
  closeTicket(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.supportService.closeTicket(id, user.sub);
  }

  // ─── Departments ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List support departments' })
  @Get('departments')
  listDepartments() {
    return this.supportService.listDepartments();
  }

  @ApiOperation({ summary: 'Create a department' })
  @Permissions('settings:update')
  @Post('departments')
  createDepartment(
    @Body()
    body: {
      name: string;
      description?: string;
      email?: string;
      isHidden?: boolean;
      slaHours?: number;
    },
  ) {
    return this.supportService.createDepartment(body);
  }

  @ApiOperation({ summary: 'Update a department' })
  @Permissions('settings:update')
  @Put('departments/:id')
  updateDepartment(@Param('id') id: string, @Body() body: any) {
    return this.supportService.updateDepartment(id, body);
  }

  // ─── Knowledge Base ────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List KB categories' })
  @Get('kb/categories')
  listKbCategories() {
    return this.supportService.listKbCategories();
  }

  @ApiOperation({ summary: 'Create a KB category' })
  @Permissions('settings:update')
  @Post('kb/categories')
  createKbCategory(
    @Body()
    body: {
      name: string;
      description?: string;
      parentId?: string;
      sortOrder?: number;
    },
  ) {
    return this.supportService.createKbCategory(body);
  }

  @ApiOperation({ summary: 'List KB articles' })
  @Get('kb/articles')
  listKbArticles(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.supportService.listKbArticles({ categoryId, search, status });
  }

  @ApiOperation({ summary: 'Create a KB article' })
  @Permissions('settings:update')
  @Post('kb/articles')
  createKbArticle(
    @Body()
    body: {
      categoryId: string;
      title: string;
      content: string;
      status?: string;
      tags?: string[];
    },
  ) {
    return this.supportService.createKbArticle(body);
  }

  @ApiOperation({ summary: 'Update a KB article' })
  @Permissions('settings:update')
  @Put('kb/articles/:id')
  updateKbArticle(@Param('id') id: string, @Body() body: any) {
    return this.supportService.updateKbArticle(id, body);
  }

  // ─── Canned Responses ──────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List canned responses' })
  @Get('canned-responses')
  listCannedResponses(@Query('departmentId') departmentId?: string) {
    return this.supportService.listCannedResponses(departmentId);
  }

  @ApiOperation({ summary: 'Create a canned response' })
  @Permissions('settings:update')
  @Post('canned-responses')
  createCannedResponse(
    @Body() body: { title: string; content: string; departmentId?: string },
  ) {
    return this.supportService.createCannedResponse(body);
  }
}
