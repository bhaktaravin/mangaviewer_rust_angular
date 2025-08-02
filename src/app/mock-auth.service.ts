import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface User {
  id: string;
  username: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class MockAuthService {
  private currentUser = signal<User | null>(null);
  private isAuthenticated = signal<boolean>(false);

  // Public readonly signals for components to subscribe to
  public readonly user = this.currentUser.asReadonly();
  public readonly authenticated = this.isAuthenticated.asReadonly();

  constructor(private router: Router) {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUser.set(JSON.parse(savedUser));
      this.isAuthenticated.set(true);
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      // Simulate successful login for testing
      if (username && password) {
        const user: User = {
          id: '1',
          username: username,
          email: `${username}@example.com`
        };
        
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async register(username: string, email: string, password: string): Promise<boolean> {
    try {
      // Simulate successful registration for testing
      if (username && email && password) {
        const user: User = {
          id: '1',
          username: username,
          email: email
        };
        
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  }

  logout(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }
}
