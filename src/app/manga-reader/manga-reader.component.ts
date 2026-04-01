import { Component, Input, signal } from '@angular/core';
import { Chapter } from '../manga-detail/manga-detail.component';

import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-manga-reader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manga-reader.component.html',
  styleUrl: './manga-reader.component.css'
})
export class MangaReaderComponent {
  @Input() chapter: Chapter | null = null;
  @Input() images: string[] = [];
  @Input() show = false;
  @Input() onClose: (() => void) | null = null;
  @Input() loading = false;

  // Reading modes: 'vertical', 'horizontal', 'single', 'double'
  mode = signal<'vertical' | 'horizontal' | 'single' | 'double'>('vertical');
  currentPage = signal(0);

  setMode(newMode: 'vertical' | 'horizontal' | 'single' | 'double') {
    this.mode.set(newMode);
    this.currentPage.set(0);
  }

  prevPage() {
    const step = this.mode() === 'double' ? 2 : 1;
    this.currentPage.set(Math.max(0, this.currentPage() - step));
  }

  nextPage() {
    const step = this.mode() === 'double' ? 2 : 1;
    this.currentPage.set(Math.min(this.images.length - step, this.currentPage() + step));
  }

  get hasPrev() { return this.currentPage() > 0; }
  get hasNext() {
    const step = this.mode() === 'double' ? 2 : 1;
    return this.currentPage() + step < this.images.length;
  }

  close() {
    if (this.onClose) this.onClose();
  }
}
