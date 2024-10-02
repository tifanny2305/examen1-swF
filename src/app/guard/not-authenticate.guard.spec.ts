import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { notAuthenticateGuard } from './not-authenticate.guard';

describe('notAuthenticateGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => notAuthenticateGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
