import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MangaDetail } from './manga-detail';

describe('MangaDetail', () => {
  let component: MangaDetail;
  let fixture: ComponentFixture<MangaDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MangaDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MangaDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
