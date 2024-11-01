import { Test, TestingModule } from '@nestjs/testing';
import { ListosoftController } from './listosoft.controller';

describe('ListosoftController', () => {
  let controller: ListosoftController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListosoftController],
    }).compile();

    controller = module.get<ListosoftController>(ListosoftController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
