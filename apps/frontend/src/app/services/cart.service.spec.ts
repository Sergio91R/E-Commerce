import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { Product } from '../models/shared';

const laptop: Product = { id: 'p1', name: 'Laptop', price: 650, category: 'Tecnologia', stock: 2 };
const mouse: Product = { id: 'p2', name: 'Mouse', price: 18, category: 'Tecnologia', stock: 1 };
const sinStock: Product = { id: 'p3', name: 'Agotado', price: 10, category: 'Hogar', stock: 0 };

describe('CartService', () => {
  let service: CartService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartService);
  });

  it('inicia vacío', () => {
    expect(service.isEmpty()).toBe(true);
    expect(service.lines()).toEqual([]);
    expect(service.subtotal()).toBe(0);
    expect(service.itemCount()).toBe(0);
  });

  it('agrega un producto nuevo con cantidad 1', () => {
    const added = service.addItem(laptop);
    expect(added).toBe(true);
    expect(service.lines()).toEqual([{ product: laptop, quantity: 1 }]);
    expect(service.subtotal()).toBe(650);
  });

  it('incrementa la cantidad si el producto ya está en el carrito y hay stock', () => {
    service.addItem(laptop);
    const addedAgain = service.addItem(laptop);
    expect(addedAgain).toBe(true);
    expect(service.lines()[0].quantity).toBe(2);
    expect(service.subtotal()).toBe(1300);
  });

  it('no permite superar el stock disponible (edge case)', () => {
    service.addItem(mouse); // stock 1, queda en 1
    const secondAttempt = service.addItem(mouse); // debería fallar
    expect(secondAttempt).toBe(false);
    expect(service.lines()[0].quantity).toBe(1);
  });

  it('no agrega un producto sin stock inicial (edge case)', () => {
    const added = service.addItem(sinStock);
    expect(added).toBe(false);
    expect(service.isEmpty()).toBe(true);
  });

  it('decrementa la cantidad y elimina la línea al llegar a 0', () => {
    service.addItem(laptop);
    service.addItem(laptop); // qty 2
    service.decrementItem('p1');
    expect(service.lines()[0].quantity).toBe(1);

    service.decrementItem('p1');
    expect(service.isEmpty()).toBe(true);
  });

  it('decrementar un producto que no existe no lanza error', () => {
    expect(() => service.decrementItem('inexistente')).not.toThrow();
  });

  it('elimina una línea explícitamente con removeItem', () => {
    service.addItem(laptop);
    service.addItem(mouse);
    service.removeItem('p1');
    expect(service.lines().map((l) => l.product.id)).toEqual(['p2']);
  });

  it('calcula subtotal e itemCount correctamente con varias líneas', () => {
    service.addItem(laptop); // 650
    service.addItem(mouse); // 18
    expect(service.subtotal()).toBe(668);
    expect(service.itemCount()).toBe(2);
  });

  it('clear() vacía completamente el carrito', () => {
    service.addItem(laptop);
    service.addItem(mouse);
    service.clear();
    expect(service.isEmpty()).toBe(true);
    expect(service.subtotal()).toBe(0);
  });

  it('toCartItemDTOs() convierte el estado a DTOs planos para el backend', () => {
    service.addItem(laptop);
    service.addItem(laptop);
    expect(service.toCartItemDTOs()).toEqual([{ productId: 'p1', quantity: 2 }]);
  });

  it('toCartItemDTOs() de un carrito vacío devuelve un arreglo vacío (edge case)', () => {
    expect(service.toCartItemDTOs()).toEqual([]);
  });
});
