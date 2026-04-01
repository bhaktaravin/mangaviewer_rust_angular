import { Component, Input, signal, Output, EventEmitter } from '@angular/core';
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
  @Output() pageChanged = new EventEmitter<{ page: number; total: number }>();

  mode = signal<'vertical' | 'horizontal' | 'single' | 'double'>('vertical');
  currentPage = signal(0);

  setMode(newMode: 'vertical' | 'horizontal' | 'single' | 'double') {
    this.mode.set(newMode);
    this.currentPage.set(0);
  }

  prevPage() {
    const step = this.mode() === 'double' ? 2 : 1;
    const next = Math.max(0, this.currentPage() - step);
    this.currentPage.set(next);
    this.pageChanged.emit({ page: next + 1, total: this.images.length });
  }

  nextPage() {
    const step = this.mode() === 'double' ? 2 : 1;
    const next = Math.min(this.images.length - step, this.currentPage() + step);
    this.currentPage.set(next);
    this.pageChanged.emit({ page: next + 1, total: this.images.length });
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
