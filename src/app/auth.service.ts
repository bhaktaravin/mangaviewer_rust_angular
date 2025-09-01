import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Apiservice, LoginRequest, RegisterRequest } from './apiservice';
import { firstValueFrom } from 'rxjs';

export interface User {
  id: string;  // Changed from number to string to match Rust backend
  username: string;
  email: string;
  role?: 'user' | 'admin' | 'moderator'; // Add role field
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
          email: response.user.email,
          role: this.getDefaultRole(response.user.username) // Add default role based on username
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
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle HTTP error responses
      if (error?.error?.message) {
        return { success: false, error: error.error.message };
      } else if (error?.status === 401) {
        return { success: false, error: 'Invalid username or password.' };
      } else if (error?.status === 500) {
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
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle HTTP error responses
      if (error?.error?.message) {
        return { success: false, error: error.error.message };
      } else if (error?.status === 500) {
        return { success: false, error: 'Server error. The registration service is temporarily unavailable.' };
      } else if (error?.status === 400) {
        return { success: false, error: 'Invalid registration data. Please check your inputs.' };
      } else if (error?.status === 409) {
        return { success: false, error: 'Username or email already exists.' };
      }
      
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  }

  logout(): void {
    try {
      // Only call API logout if not in guest mode
      if (!this.isGuestMode()) {
        this.apiService.logout().subscribe({
          error: (error) => console.warn('Logout API call failed:', error)
        });
      }
    } catch (error) {
      console.warn('Logout error:', error);
    }
    
    // Clear local state regardless of API call result
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('isGuestMode');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin' || user?.username === 'admin' || user?.username === 'manga_admin';
  }

  isModerator(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'moderator' || user?.role === 'admin' || this.isAdmin();
  }

  // Guest Admin Login - bypasses backend authentication
  loginAsGuestAdmin(): void {
    const guestAdminUser: User = {
      id: 'guest-admin-001',
      username: 'guest_admin',
      email: 'admin@demo.local',
      role: 'admin'
    };

    this.currentUser.set(guestAdminUser);
    this.isAuthenticated.set(true);
    localStorage.setItem('currentUser', JSON.stringify(guestAdminUser));
    localStorage.setItem('authToken', 'guest-admin-token');
    localStorage.setItem('isGuestMode', 'true');
  }

  // Regular Guest Login - standard user permissions
  loginAsGuest(): void {
    const guestUser: User = {
      id: 'guest-user-001',
      username: 'guest_user',
      email: 'user@demo.local',
      role: 'user'
    };

    this.currentUser.set(guestUser);
    this.isAuthenticated.set(true);
    localStorage.setItem('currentUser', JSON.stringify(guestUser));
    localStorage.setItem('authToken', 'guest-user-token');
    localStorage.setItem('isGuestMode', 'true');
  }

  // Special Admin Login - for admin usernames that bypass authentication
  loginAsSpecialAdmin(username: string): void {
    const adminUser: User = {
      id: `admin-${Date.now()}`,
      username: username,
      email: `${username}@admin.local`,
      role: 'admin'
    };

    this.currentUser.set(adminUser);
    this.isAuthenticated.set(true);
    localStorage.setItem('currentUser', JSON.stringify(adminUser));
    localStorage.setItem('authToken', `admin-token-${Date.now()}`);
    localStorage.setItem('isGuestMode', 'true'); // Mark as demo mode
  }

  // Check if current session is guest mode
  isGuestMode(): boolean {
    return localStorage.getItem('isGuestMode') === 'true';
  }

  private getDefaultRole(username: string): 'user' | 'admin' | 'moderator' {
    // Define admin usernames
    const adminUsernames = ['admin', 'manga_admin', 'administrator', 'root'];
    const moderatorUsernames = ['moderator', 'mod', 'content_mod'];
    
    if (adminUsernames.includes(username.toLowerCase())) {
      return 'admin';
    } else if (moderatorUsernames.includes(username.toLowerCase())) {
      return 'moderator';
    }
    
    return 'user';
  }
}
