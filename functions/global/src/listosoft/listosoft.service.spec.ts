import { Test, TestingModule } from '@nestjs/testing';
import { ListosoftService } from './listosoft.service';

describe('ListosoftService', () => {
  let service: ListosoftService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListosoftService],
    }).compile();

    service = module.get<ListosoftService>(ListosoftService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
