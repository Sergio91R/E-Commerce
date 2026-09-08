import { TestBed } from '@angular/core/testing';
import { CartDrawerService } from './cart-drawer.service';

describe('CartDrawerService', () => {
  let service: CartDrawerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartDrawerService);
  });

  it('inicia cerrado', () => {
    expect(service.isOpen()).toBe(false);
  });

  it('open() lo abre', () => {
    service.open();
    expect(service.isOpen()).toBe(true);
  });

  it('close() lo cierra', () => {
    service.open();
    service.close();
    expect(service.isOpen()).toBe(false);
  });

  it('toggle() invierte el estado cada vez que se llama', () => {
    service.toggle();
    expect(service.isOpen()).toBe(true);
    service.toggle();
    expect(service.isOpen()).toBe(false);
  });
});
