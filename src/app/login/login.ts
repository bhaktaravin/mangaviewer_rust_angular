import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  username = signal('');
  password = signal('');
  loading = signal(false);
  error = signal('');

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly toastr: ToastrService
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
        this.toastr.success(`Welcome back, ${this.username()}!`, 'Login Successful');
        this.router.navigate(['/home']);
      } else {
        this.error.set(result.error || 'Invalid username or password');
        this.toastr.error(result.error || 'Invalid username or password', 'Login Failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.toastr.error('An unexpected error occurred during login', 'Error');
      this.error.set('An unexpected error occurred during login');
    } finally {
      this.loading.set(false);
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  continueAsGuest() {
    this.toastr.info('Browsing in demo mode', 'Guest Mode');
    // Navigate directly to library in demo mode without authentication
    this.router.navigate(['/library']);
  }
}
