import { Component } from '@angular/core';


@Component({
  selector: 'app-disclaimer',
  standalone: true,
  imports: [],
  template: `
    <div class="disclaimer-container">
      <div class="disclaimer-content">
        <div class="disclaimer-icon">⚠️</div>
        <div class="disclaimer-text">
          <p><strong>Disclaimer:</strong> This application is for educational and demonstration purposes only. 
          We do not own any manga content displayed here.</p>
          <p>All manga data, including titles, descriptions, and metadata, is sourced from 
          <a href="https://mangadex.org" target="_blank" rel="noopener noreferrer">MangaDex</a> 
          and other public APIs. Please support the original creators and publishers by purchasing official releases.</p>
          <p>Manga covers and content are the property of their respective authors and publishers.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .disclaimer-container {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
      font-size: 0.9rem;
    }

    .disclaimer-content {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .disclaimer-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .disclaimer-text {
      flex: 1;
      line-height: 1.5;
    }

    .disclaimer-text p {
      margin: 0 0 0.5rem 0;
    }

    .disclaimer-text p:last-child {
      margin-bottom: 0;
    }

    .disclaimer-text a {
      color: var(--brand-primary);
      text-decoration: none;
      font-weight: 500;
    }

    .disclaimer-text a:hover {
      text-decoration: underline;
    }

    .disclaimer-text strong {
      color: var(--text-primary);
      font-weight: 600;
    }

    /* Dark theme adjustments */
    [data-theme="dark"] .disclaimer-container {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }

    /* Compact version for smaller spaces */
    .disclaimer-container.compact {
      padding: 0.75rem;
      margin: 0.75rem 0;
      font-size: 0.85rem;
    }

    .disclaimer-container.compact .disclaimer-content {
      gap: 0.5rem;
    }

    .disclaimer-container.compact .disclaimer-icon {
      font-size: 1rem;
    }
  `]
})
export class DisclaimerComponent {
}
