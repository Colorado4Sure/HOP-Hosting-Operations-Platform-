import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('products')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ─── Product Groups ────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List product groups' })
  @Permissions('products:read')
  @Get('groups')
  listGroups() {
    return this.productsService.listProductGroups();
  }

  @ApiOperation({ summary: 'Create a product group' })
  @Permissions('products:create')
  @Post('groups')
  createGroup(
    @Body()
    body: {
      name: string;
      headline?: string;
      description?: string;
      isVisible?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.productsService.createProductGroup(body);
  }

  @ApiOperation({ summary: 'Update a product group' })
  @Permissions('products:update')
  @Put('groups/:id')
  updateGroup(@Param('id') id: string, @Body() body: any) {
    return this.productsService.updateProductGroup(id, body);
  }

  // ─── Addons ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List addons' })
  @Permissions('products:read')
  @Get('addons')
  listAddons(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.productsService.listAddons({ page, perPage });
  }

  @ApiOperation({ summary: 'Create an addon' })
  @Permissions('products:create')
  @Post('addons')
  createAddon(
    @Body()
    body: {
      productId?: string;
      name: string;
      description?: string;
      isRecurring?: boolean;
      pricing?: any[];
    },
  ) {
    return this.productsService.createAddon(body);
  }

  // ─── Pricing ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Add pricing to a product' })
  @Permissions('products:update')
  @Post(':id/pricing')
  addPricing(
    @Param('id') id: string,
    @Body()
    body: {
      billingCycle: string;
      currency: string;
      price: number;
      setupFee?: number;
    },
  ) {
    return this.productsService.addPricing(id, body);
  }

  @ApiOperation({ summary: 'Update a pricing entry' })
  @Permissions('products:update')
  @Put('pricing/:id')
  updatePricing(@Param('id') id: string, @Body() body: any) {
    return this.productsService.updatePricing(id, body);
  }

  @ApiOperation({ summary: 'Remove a pricing entry' })
  @Permissions('products:delete')
  @Delete('pricing/:id')
  removePricing(@Param('id') id: string) {
    return this.productsService.removePricing(id);
  }

  // ─── Products ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List products' })
  @Permissions('products:read')
  @Get()
  listProducts(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('status') status?: string,
    @Query('groupId') groupId?: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.listProducts({ page, perPage, status, groupId, search });
  }

  @ApiOperation({ summary: 'Create a product' })
  @Permissions('products:create')
  @Post()
  createProduct(@Body() body: any) {
    return this.productsService.createProduct(body);
  }

  @ApiOperation({ summary: 'Get product by ID' })
  @Permissions('products:read')
  @Get(':id')
  getProduct(@Param('id') id: string) {
    return this.productsService.getProduct(id);
  }

  @ApiOperation({ summary: 'Update a product' })
  @Permissions('products:update')
  @Put(':id')
  updateProduct(@Param('id') id: string, @Body() body: any) {
    return this.productsService.updateProduct(id, body);
  }

  @ApiOperation({ summary: 'Delete (deactivate) a product' })
  @Permissions('products:delete')
  @Delete(':id')
  deleteProduct(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }
}
