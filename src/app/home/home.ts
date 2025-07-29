import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  user = computed(() => this.authService.user());
  isAuthenticated = computed(() => this.authService.authenticated());

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  goToSearch() {
    this.router.navigate(['/search']);
  }

  goToLibrary() {
    this.router.navigate(['/library']);
  }

  logout() {
    this.authService.logout();
  }
}
