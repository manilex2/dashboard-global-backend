import { Test, TestingModule } from '@nestjs/testing';
import { GsheetController } from './gsheet.controller';

describe('GsheetController', () => {
  let controller: GsheetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GsheetController],
    }).compile();

    controller = module.get<GsheetController>(GsheetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
