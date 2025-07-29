import { Component, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent {
  user = computed(() => this.authService.user());
  isAuthenticated = computed(() => this.authService.authenticated());

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Redirect to login if not authenticated
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  logout() {
    this.authService.logout();
  }

  editProfile() {
    // TODO: Implement profile editing functionality
    console.log('Edit profile functionality to be implemented');
  }
}
