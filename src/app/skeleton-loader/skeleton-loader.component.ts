import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrapper" [ngClass]="type">
      @if (type === 'card') {
        <div class="skeleton-card">
          <div class="skeleton-image"></div>
          <div class="skeleton-content">
            <div class="skeleton-title"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
          </div>
        </div>
      }
      
      @if (type === 'list') {
        <div class="skeleton-list-item">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-list-content">
            <div class="skeleton-title"></div>
            <div class="skeleton-text"></div>
          </div>
        </div>
      }
      
      @if (type === 'text') {
        <div class="skeleton-text-block">
          <div class="skeleton-text"></div>
          <div class="skeleton-text"></div>
          <div class="skeleton-text short"></div>
        </div>
      }
      
      @if (type === 'grid') {
        <div class="skeleton-grid">
          @for (item of [1,2,3,4,5,6]; track item) {
            <div class="skeleton-card">
              <div class="skeleton-image"></div>
              <div class="skeleton-content">
                <div class="skeleton-title"></div>
                <div class="skeleton-text short"></div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton-wrapper {
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .skeleton-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .skeleton-image {
      width: 100%;
      height: 320px;
      background: linear-gradient(
        90deg,
        var(--bg-secondary) 0%,
        var(--bg-tertiary) 50%,
        var(--bg-secondary) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .skeleton-content {
      padding: 1rem;
    }

    .skeleton-title {
      height: 20px;
      background: linear-gradient(
        90deg,
        var(--bg-secondary) 0%,
        var(--bg-tertiary) 50%,
        var(--bg-secondary) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
      margin-bottom: 0.75rem;
    }

    .skeleton-text {
      height: 14px;
      background: linear-gradient(
        90deg,
        var(--bg-secondary) 0%,
        var(--bg-tertiary) 50%,
        var(--bg-secondary) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .skeleton-text.short {
      width: 60%;
    }

    .skeleton-list-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-bottom: 0.75rem;
    }

    .skeleton-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(
        90deg,
        var(--bg-secondary) 0%,
        var(--bg-tertiary) 50%,
        var(--bg-secondary) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      flex-shrink: 0;
    }

    .skeleton-list-content {
      flex: 1;
    }

    .skeleton-text-block {
      padding: 1rem;
    }

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.5rem;
      padding: 1rem;
    }

    @media (max-width: 768px) {
      .skeleton-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 1rem;
      }
      
      .skeleton-image {
        height: 240px;
      }
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() type: 'card' | 'list' | 'text' | 'grid' = 'card';
}
