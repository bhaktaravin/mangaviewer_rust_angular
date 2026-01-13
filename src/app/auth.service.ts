
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Apiservice, LoginRequest, RegisterRequest } from './apiservice';
import { firstValueFrom } from 'rxjs';

// Utility type guards for error handling
function isApiError(error: unknown): error is { error: { message: string } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as { error?: { message?: unknown } }).error?.message === 'string'
  );
}

function isStatusError(error: unknown, status: number): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (typeof (error as { status?: unknown }).status === 'number' && (error as { status: number }).status === status)
  );
}

export interface User {
  id: string;  // Changed from number to string to match Rust backend
  username: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  private isAuthenticated = signal<boolean>(false);

  // Public readonly signals for components to subscribe to
  public readonly user = this.currentUser.asReadonly();
  public readonly authenticated = this.isAuthenticated.asReadonly();

  constructor(
    private router: Router,
    private apiService: Apiservice
  ) {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('currentUser');
    const authToken = localStorage.getItem('authToken');
    
    if (savedUser && authToken) {
      this.currentUser.set(JSON.parse(savedUser));
      this.isAuthenticated.set(true);
    }
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const loginRequest: LoginRequest = { username, password };
      const response = await firstValueFrom(this.apiService.login(loginRequest));
      
      if (response.success && response.user && response.token) {
        const user: User = {
          id: response.user.id,
          username: response.user.username,
          email: response.user.email
        };
        
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('authToken', response.token);
        
        return { success: true };
      }
      
      // Backend returned an error response
      return { 
        success: false, 
        error: response.message || 'Login failed. Please check your credentials.' 
      };
    } catch (error: unknown) {
      console.error('Login error:', error);
      // Handle HTTP error responses
      if (isApiError(error)) {
        return { success: false, error: error.error.message };
      } else if (isStatusError(error, 401)) {
        return { success: false, error: 'Invalid username or password.' };
      } else if (isStatusError(error, 500)) {
        return { success: false, error: 'Server error. The login service is temporarily unavailable.' };
      }
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  }

  async register(username: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const registerRequest: RegisterRequest = { username, email, password };
      const response = await firstValueFrom(this.apiService.register(registerRequest));
      
      if (response.success && response.user && response.token) {
        const user: User = {
          id: response.user.id,
          username: response.user.username,
          email: response.user.email
        };
        
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('authToken', response.token);
        
        return { success: true };
      }
      
      // Backend returned an error response
      return { 
        success: false, 
        error: response.message || 'Registration failed. Please try again.' 
      };
    } catch (error: unknown) {
      console.error('Registration error:', error);
      // Handle HTTP error responses
      if (isApiError(error)) {
        return { success: false, error: error.error.message };
      } else if (isStatusError(error, 500)) {
        return { success: false, error: 'Server error. The registration service is temporarily unavailable.' };
      } else if (isStatusError(error, 400)) {
        return { success: false, error: 'Invalid registration data. Please check your inputs.' };
      } else if (isStatusError(error, 409)) {
        return { success: false, error: 'Username or email already exists.' };
      }
      function isApiError(error: unknown): error is { error: { message: string } } {
        return (
          typeof error === 'object' &&
          error !== null &&
          'error' in error &&
          typeof (error as { error?: { message?: unknown } }).error?.message === 'string'
        );
      }

      function isStatusError(error: unknown, status: number): error is { status: number } {
        return (
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          (typeof (error as { status?: unknown }).status === 'number' && (error as { status: number }).status === status)
        );
      }
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  }

  logout(): void {
    try {
      // Call API logout endpoint (fire and forget)
      this.apiService.logout().subscribe({
        error: (error) => console.warn('Logout API call failed:', error)
      });
    } catch (error) {
      console.warn('Logout error:', error);
    }
    
    // Clear local state regardless of API call result
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }
}
