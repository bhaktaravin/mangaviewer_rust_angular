import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="empty-state" [ngClass]="type">
      <div class="empty-state-icon">{{ icon }}</div>
      <h3 class="empty-state-title">{{ title }}</h3>
      <p class="empty-state-message">{{ message }}</p>
      @if (actionText && actionLink) {
        <a [routerLink]="actionLink" class="empty-state-action">
          {{ actionText }}
        </a>
      }
      @if (actionText && actionCallback) {
        <button class="empty-state-action" (click)="actionCallback()">
          {{ actionText }}
        </button>
      }
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
      min-height: 400px;
      animation: fadeIn 0.5s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .empty-state-icon {
      font-size: 5rem;
      margin-bottom: 1.5rem;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .empty-state-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 0.75rem;
    }

    .empty-state-message {
      font-size: 1rem;
      color: var(--text-secondary);
      margin: 0 0 2rem;
      max-width: 500px;
      line-height: 1.6;
    }

    .empty-state-action {
      display: inline-block;
      padding: 0.75rem 2rem;
      background: var(--brand-gradient);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.3s ease;
      border: none;
      cursor: pointer;
      font-size: 1rem;
    }

    .empty-state-action:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px var(--brand-shadow);
    }

    .empty-state-action:active {
      transform: translateY(0);
    }

    /* Type variations */
    .empty-state.search .empty-state-icon {
      color: #667eea;
    }

    .empty-state.library .empty-state-icon {
      color: #764ba2;
    }

    .empty-state.error .empty-state-icon {
      color: var(--danger);
    }

    .empty-state.success .empty-state-icon {
      color: var(--success);
    }

    @media (max-width: 768px) {
      .empty-state {
        padding: 3rem 1.5rem;
        min-height: 300px;
      }

      .empty-state-icon {
        font-size: 4rem;
      }

      .empty-state-title {
        font-size: 1.5rem;
      }

      .empty-state-message {
        font-size: 0.95rem;
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon = '📭';
  @Input() title = 'Nothing here yet';
  @Input() message = 'Start by adding some content';
  @Input() actionText?: string;
  @Input() actionLink?: string;
  @Input() actionCallback?: () => void;
  @Input() type: 'default' | 'search' | 'library' | 'error' | 'success' = 'default';
}
