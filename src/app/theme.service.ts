import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentTheme = signal<Theme>(this.getInitialTheme());
  
  // Public readonly signal for components to subscribe to
  public readonly theme = this.currentTheme.asReadonly();

  constructor() {
    // Apply theme changes to document
    effect(() => {
      this.applyTheme(this.currentTheme());
    });
  }

  private getInitialTheme(): Theme {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      return savedTheme;
    }
    
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Default to light
    return 'light';
  }

  private applyTheme(theme: Theme): void {
    if (typeof document !== 'undefined') {
      console.log(`Applying theme: ${theme}`);
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      console.log(`Theme applied. HTML element classes:`, document.documentElement.className);
      console.log(`Theme applied. HTML element data-theme:`, document.documentElement.getAttribute('data-theme'));
    }
  }

  toggleTheme(): void {
    const newTheme: Theme = this.currentTheme() === 'light' ? 'dark' : 'light';
    console.log(`Toggling theme from ${this.currentTheme()} to ${newTheme}`);
    this.setTheme(newTheme);
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    localStorage.setItem('theme', theme);
  }

  isDark(): boolean {
    return this.currentTheme() === 'dark';
  }

  isLight(): boolean {
    return this.currentTheme() === 'light';
  }
}
