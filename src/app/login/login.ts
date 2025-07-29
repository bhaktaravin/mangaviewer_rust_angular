import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  username = signal('');
  password = signal('');
  loading = signal(false);
  error = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSubmit() {
    if (!this.username() || !this.password()) {
      this.error.set('Please fill in all fields');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const result = await this.authService.login(this.username(), this.password());
      
      if (result.success) {
        this.router.navigate(['/home']);
      } else {
        this.error.set(result.error || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      this.error.set('An unexpected error occurred during login');
    } finally {
      this.loading.set(false);
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  continueAsGuest() {
    console.log('continueAsGuest clicked, navigating to /library');
    // Navigate directly to library in demo mode without authentication
    this.router.navigate(['/library']);
  }
}
