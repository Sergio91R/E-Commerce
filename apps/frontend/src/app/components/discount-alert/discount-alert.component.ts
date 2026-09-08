import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente puramente presentacional (HU4). Se testea de forma aislada
 * pasándole distintos valores de `capReached` por @Input(), sin necesidad
 * de HttpClient ni de un checkout real.
 */
@Component({
  selector: 'app-discount-alert',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="discount-alert" role="alert" data-testid="discount-alert" *ngIf="capReached">
      ¡Enhorabuena! Has alcanzado el límite máximo de ahorro permitido (35%).
    </div>
  `,
  styles: [
    `
      .discount-alert {
        background: #ecfdf5;
        border: 2px solid #10b981;
        color: #065f46;
        font-weight: 700;
        padding: 14px 18px;
        border-radius: 8px;
        margin: 16px 0;
      }
    `
  ]
})
export class DiscountAlertComponent {
  @Input() public capReached = false;
}
