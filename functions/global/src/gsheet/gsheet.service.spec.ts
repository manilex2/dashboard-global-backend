import { Test, TestingModule } from '@nestjs/testing';
import { GsheetService } from './gsheet.service';

describe('GsheetService', () => {
  let service: GsheetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GsheetService],
    }).compile();

    service = module.get<GsheetService>(GsheetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
