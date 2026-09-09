import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DiscountAlertComponent } from './discount-alert.component';

describe('DiscountAlertComponent', () => {
  let fixture: ComponentFixture<DiscountAlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiscountAlertComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DiscountAlertComponent);
  });

  function getAlertElement() {
    return fixture.debugElement.query(By.css('[data-testid="discount-alert"]'));
  }

  it('no muestra la alerta cuando capReached es false (valor por defecto)', () => {
    fixture.detectChanges();
    expect(getAlertElement()).toBeNull();
  });

  it('no muestra la alerta cuando capReached se setea explícitamente en false', () => {
    // Con OnPush, un @Input() se actualiza correctamente en los tests usando
    // fixture.componentRef.setInput(), no asignando la propiedad directo.
    fixture.componentRef.setInput('capReached', false);
    fixture.detectChanges();
    expect(getAlertElement()).toBeNull();
  });

  it('muestra la alerta con el texto exacto requerido cuando capReached es true', () => {
    fixture.componentRef.setInput('capReached', true);
    fixture.detectChanges();

    const alertEl = getAlertElement();
    expect(alertEl).not.toBeNull();
    expect(alertEl.nativeElement.textContent).toContain(
      '¡Enhorabuena! Has alcanzado el límite máximo de ahorro permitido (35%).'
    );
  });

  it('la alerta desaparece de forma reactiva si capReached vuelve a false', () => {
    fixture.componentRef.setInput('capReached', true);
    fixture.detectChanges();
    expect(getAlertElement()).not.toBeNull();

    fixture.componentRef.setInput('capReached', false);
    fixture.detectChanges();
    expect(getAlertElement()).toBeNull();
  });
});
