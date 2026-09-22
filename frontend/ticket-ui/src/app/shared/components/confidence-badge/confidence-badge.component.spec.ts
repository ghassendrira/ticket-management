import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfidenceBadgeComponent } from './confidence-badge.component';

describe('ConfidenceBadgeComponent', () => {
  let component: ConfidenceBadgeComponent;
  let fixture: ComponentFixture<ConfidenceBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfidenceBadgeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfidenceBadgeComponent);
    component = fixture.componentInstance;
    component.confidence = 0.82;
    fixture.detectChanges();
  });

  it('affiche le pourcentage arrondi', () => {
    expect(fixture.nativeElement.textContent).toContain('82%');
  });

  it('retourne le ton high pour une confiance elevee', () => {
    expect(component.tone).toBe('high');
  });
});
