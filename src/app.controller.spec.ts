import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app/controllers/app.controller';
import { AppService } from './app/services/app.service';

describe('Simple Mock Demo', () => {
  it('should return a mocked value', () => {
    // 1. Create a simple mock function
    const mockGetHello = jest.fn().mockReturnValue('Hello from Mock!');

    // 2. Call it
    const result = mockGetHello();

    // 3. Assertions
    expect(result).toBe('Hello from Mock!');
    expect(mockGetHello).toHaveBeenCalledTimes(1);
  });

  it('should mock an object with a method', () => {
    // Simulating a service object
    const mockService = {
      getData: jest.fn().mockReturnValue({ id: 1, name: 'Test' })
    };

    const data = mockService.getData();

    expect(data.name).toBe('Test');
    expect(mockService.getData).toHaveBeenCalled();
  });
});