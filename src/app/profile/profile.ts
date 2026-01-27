import { Component, computed, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

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
export class ProfileComponent implements OnInit {
  user = computed(() => this.authService.user());
  isAuthenticated = computed(() => this.authService.authenticated());
  stats: ReadingStats | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Redirect to login if not authenticated
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadStats();
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
          this.toastr.error('Failed to load reading statistics', 'Error');
        }
      });
  }

  logout() {
    this.authService.logout();
  }

  editProfile() {
    // TODO: Implement profile editing functionality
    this.toastr.info('Profile editing coming soon!', 'Feature Not Available');
  }
}
