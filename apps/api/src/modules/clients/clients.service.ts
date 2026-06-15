import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateClientDto, UpdateClientDto, CreateClientNoteDto, ListClientsDto } from './dto/client.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(query: ListClientsDto) {
    const { page = 1, perPage = 25, search, status, groupId } = query;
    const skip = (page - 1) * perPage;

    const where: Prisma.ClientWhereInput = {
      ...(status ? { status: status as any } : {}),
      ...(groupId ? { groupId } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { companyName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: { group: true, addresses: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        group: true,
        addresses: true,
        contacts: true,
        notes: { orderBy: [{ isSticky: 'desc' }, { createdAt: 'desc' }] },
        activity: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return client;
  }

  async create(dto: CreateClientDto, actorId: string) {
    const existing = await this.prisma.client.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A client with this email already exists');

    const { addresses, ...clientData } = dto;

    const client = await this.prisma.client.create({
      data: {
        ...clientData,
        user: {
          create: {
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            passwordHash: '', // Set separately if needed
            role: 'Client',
          },
        },
        addresses: addresses
          ? { create: addresses }
          : undefined,
      } as any,
      include: { addresses: true },
    });

    await this.auditService.log({
      userId: actorId,
      action: 'create',
      resource: 'client',
      resourceId: client.id,
    });

    return client;
  }

  async update(id: string, dto: UpdateClientDto, actorId: string) {
    const before = await this.findOne(id);
    const { addresses, ...clientData } = dto;

    const client = await this.prisma.client.update({
      where: { id },
      data: clientData,
    });

    await this.auditService.log({
      userId: actorId,
      action: 'update',
      resource: 'client',
      resourceId: id,
      before: before as any,
      after: client as any,
    });

    return client;
  }

  async suspend(id: string, actorId: string) {
    const client = await this.prisma.client.update({
      where: { id },
      data: { status: 'Suspended' },
    });
    await this.auditService.log({ userId: actorId, action: 'suspend', resource: 'client', resourceId: id });
    return client;
  }

  async activate(id: string, actorId: string) {
    const client = await this.prisma.client.update({
      where: { id },
      data: { status: 'Active' },
    });
    await this.auditService.log({ userId: actorId, action: 'activate', resource: 'client', resourceId: id });
    return client;
  }

  async addNote(clientId: string, dto: CreateClientNoteDto, authorId: string, authorName: string) {
    await this.findOne(clientId); // ensure exists
    return this.prisma.clientNote.create({
      data: {
        clientId,
        authorId,
        authorName,
        content: dto.content,
        isSticky: dto.isSticky ?? false,
      },
    });
  }

  async getActivity(clientId: string, page = 1, perPage = 25) {
    const skip = (page - 1) * perPage;
    const [data, total] = await Promise.all([
      this.prisma.clientActivity.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.clientActivity.count({ where: { clientId } }),
    ]);
    return { data, meta: { total, page, perPage, totalPages: Math.ceil(total / perPage), hasPreviousPage: page > 1, hasNextPage: page < Math.ceil(total / perPage) } };
  }

  async adjustCredit(clientId: string, amount: number, actorId: string) {
    const client = await this.prisma.client.update({
      where: { id: clientId },
      data: { creditBalance: { increment: amount } },
    });
    await this.auditService.log({ userId: actorId, action: 'adjust-credit', resource: 'client', resourceId: clientId, metadata: { amount } });
    return { creditBalance: client.creditBalance };
  }

  async getGroups() {
    return this.prisma.clientGroup.findMany({ orderBy: { name: 'asc' } });
  }

  async createGroup(data: { name: string; description?: string; color?: string; discountPercent?: number }) {
    return this.prisma.clientGroup.create({ data });
  }
}
