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
      // Check for special admin usernames that bypass backend authentication
      const username = this.username().toLowerCase();
      const adminUsernames = ['admin', 'administrator', 'manga_admin', 'root'];
      
      if (adminUsernames.includes(username)) {
        // Auto-login as admin for special usernames
        this.authService.loginAsSpecialAdmin(this.username());
        this.router.navigate(['/admin']);
        return;
      }

      // Regular login process for other users
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
    console.log('continueAsGuest clicked, logging in as guest user');
    this.authService.loginAsGuest();
    this.router.navigate(['/library']);
  }

  loginAsGuestAdmin() {
    console.log('loginAsGuestAdmin clicked, logging in as guest admin');
    this.authService.loginAsGuestAdmin();
    this.router.navigate(['/admin']);
  }
}
