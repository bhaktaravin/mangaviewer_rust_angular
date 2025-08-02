import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  username = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  loading = signal(false);
  error = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSubmit() {
    if (!this.username() || !this.email() || !this.password() || !this.confirmPassword()) {
      this.error.set('Please fill in all fields');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.error.set('Passwords do not match');
      return;
    }

    if (this.password().length < 6) {
      this.error.set('Password must be at least 6 characters long');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const result = await this.authService.register(
        this.username(), 
        this.email(), 
        this.password()
      );
      
      if (result.success) {
        this.router.navigate(['/home']);
      } else {
        this.error.set(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Unexpected registration error:', error);
      this.error.set('An unexpected error occurred during registration');
    } finally {
      this.loading.set(false);
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  continueAsGuest() {
    // Navigate directly to library in demo mode without authentication
    this.router.navigate(['/library']);
  }
}
