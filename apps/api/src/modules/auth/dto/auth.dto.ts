import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Password must contain uppercase, lowercase and a number",
  })
  password: string;

  @ApiProperty({ example: "John" })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiPropertyOptional({ example: "Acme Corp" })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ example: "+1234567890" })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class VerifyTwoFactorDto {
  @ApiProperty({ example: "123456" })
  @IsString()
  @MinLength(6)
  code: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Password must contain uppercase, lowercase and a number",
  })
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Password must contain uppercase, lowercase and a number",
  })
  password: string;
}
