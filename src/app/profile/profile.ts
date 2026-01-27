import { Component, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../auth.service';

interface ReadingStats {
  total_manga: number;
  by_status: {
    PlanToRead: number;
    Reading: number;
    Completed: number;
    OnHold: number;
    Dropped: number;
  };
  total_chapters_read: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent {
  user = computed(() => this.authService.user());
  isAuthenticated = computed(() => this.authService.authenticated());
  stats: ReadingStats | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {
    // Redirect to login if not authenticated
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
    } else {
      this.loadStats();
    }
  }

  loadStats(): void {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.http.get<{ success: boolean; stats: ReadingStats }>(`/api/progress/stats?user_id=${userId}`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.stats = response.stats;
          }
        },
        error: (err) => {
          console.error('Error loading stats:', err);
        }
      });
  }

  logout() {
    this.authService.logout();
  }

  editProfile() {
    // TODO: Implement profile editing functionality
    console.log('Edit profile functionality to be implemented');
  }
}
