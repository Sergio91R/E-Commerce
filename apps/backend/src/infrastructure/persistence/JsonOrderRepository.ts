import fs from 'fs';
import path from 'path';
import { Order, OrderRepository } from '../../domain/Order';

/**
 * Persiste órdenes en un archivo JSON en disco. Cumple el requisito de
 * "persistir la orden (en memoria, SQLite o JSON)" eligiendo JSON por
 * simplicidad, sin acoplar el resto de la aplicación al mecanismo de
 * almacenamiento (se inyecta como OrderRepository).
 */
export class JsonOrderRepository implements OrderRepository {
  private readonly filePath: string;

  public constructor(filePath: string = path.join(__dirname, '..', '..', '..', 'orders.json')) {
    this.filePath = filePath;
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  public save(order: Order): void {
    const orders = this.readAll();
    orders.push(order);
    fs.writeFileSync(this.filePath, JSON.stringify(orders, null, 2), 'utf-8');
  }

  public findById(orderId: string): Order | undefined {
    return this.readAll().find((order) => order.orderId === orderId);
  }

  private readAll(): Order[] {
    const raw = fs.readFileSync(this.filePath, 'utf-8');
    return raw.trim().length === 0 ? [] : (JSON.parse(raw) as Order[]);
  }
}
