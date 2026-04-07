import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="image-loader-wrapper" [class.loaded]="imageLoaded()">
      <!-- Placeholder/Skeleton -->
      @if (!imageLoaded()) {
        <div class="image-placeholder">
          <div class="placeholder-shimmer"></div>
          <div class="placeholder-icon">{{ placeholderIcon }}</div>
        </div>
      }
      
      <!-- Actual Image -->
      <img
        [src]="src"
        [alt]="alt"
        [class.image-loaded]="imageLoaded()"
        (load)="onImageLoad()"
        (error)="onImageError()"
        loading="lazy"
      />
      
      <!-- Error State -->
      @if (hasError()) {
        <div class="image-error">
          <div class="error-icon">{{ errorIcon }}</div>
          <p class="error-text">{{ errorText }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .image-loader-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--bg-secondary);
      border-radius: 4px;
    }

    .image-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-secondary);
    }

    .placeholder-shimmer {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.1) 50%,
        transparent 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .placeholder-icon {
      font-size: 3rem;
      opacity: 0.3;
      z-index: 1;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.5; }
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
    }

    img.image-loaded {
      opacity: 1;
    }

    .image-loader-wrapper.loaded .image-placeholder {
      opacity: 0;
      pointer-events: none;
    }

    .image-error {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--bg-secondary);
      color: var(--text-secondary);
      padding: 1rem;
      text-align: center;
    }

    .error-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      opacity: 0.5;
    }

    .error-text {
      font-size: 0.85rem;
      margin: 0;
      opacity: 0.7;
    }

    /* Aspect ratio variants */
    .image-loader-wrapper.cover {
      aspect-ratio: 2/3;
    }

    .image-loader-wrapper.square {
      aspect-ratio: 1/1;
    }

    .image-loader-wrapper.wide {
      aspect-ratio: 16/9;
    }
  `]
})
export class ImageLoaderComponent {
  @Input() src = '';
  @Input() alt = '';
  @Input() placeholderIcon = '📚';
  @Input() errorIcon = '🖼️';
  @Input() errorText = 'Image unavailable';
  
  imageLoaded = signal(false);
  hasError = signal(false);

  onImageLoad() {
    this.imageLoaded.set(true);
    this.hasError.set(false);
  }

  onImageError() {
    this.imageLoaded.set(false);
    this.hasError.set(true);
  }
}
