import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { LoanController } from './loan.controller';

@Controller('v0.1/loans')
@ApiTags('v0.1')
export class LoanV01Controller extends LoanController {}
