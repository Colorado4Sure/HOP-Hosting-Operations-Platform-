import {
  IsString, IsEmail, IsOptional, IsEnum, IsBoolean, IsNumber, ValidateNested, IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateClientAddressDto {
  @ApiProperty() @IsString() line1: string;
  @ApiPropertyOptional() @IsString() @IsOptional() line2?: string;
  @ApiProperty() @IsString() city: string;
  @ApiPropertyOptional() @IsString() @IsOptional() state?: string;
  @ApiProperty() @IsString() postcode: string;
  @ApiProperty() @IsString() country: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isPrimary?: boolean;
}

export class CreateClientDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiPropertyOptional() @IsString() @IsOptional() companyName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() currencyCode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() language?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() groupId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() taxId?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() taxExempt?: boolean;
  @ApiPropertyOptional({ type: [CreateClientAddressDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateClientAddressDto) @IsOptional()
  addresses?: CreateClientAddressDto[];
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class CreateClientNoteDto {
  @ApiProperty() @IsString() content: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isSticky?: boolean;
}

export class ListClientsDto {
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Type(() => Number) perPage?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() search?: string;
  @ApiPropertyOptional({ enum: ['Active', 'Inactive', 'Suspended', 'Closed'] })
  @IsEnum(['Active', 'Inactive', 'Suspended', 'Closed']) @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() groupId?: string;
}
