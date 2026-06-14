import { Module } from "@nestjs/common";
import { AffiliatesController } from "./affiliates.controller";
import { AffiliatesService } from "./affiliates.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [AffiliatesController],
  providers: [AffiliatesService],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}
