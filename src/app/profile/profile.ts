import { Component, computed, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {
  user = computed(() => this.authService.user());
  isAuthenticated = computed(() => this.authService.authenticated());
  stats: ReadingStats | null = null;

  // Edit profile state
  editing = signal(false);
  editForm = signal({ username: '', email: '', password: '', confirmPassword: '' });
  editError = signal('');
  editSaving = signal(false);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
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
        error: () => {
          this.toastr.error('Failed to load reading statistics', 'Error');
        }
      });
  }

  logout() {
    this.authService.logout();
  }

  editProfile() {
    const u = this.user();
    if (!u) return;
    this.editForm.set({ username: u.username, email: u.email, password: '', confirmPassword: '' });
    this.editError.set('');
    this.editing.set(true);
  }

  cancelEdit() {
    this.editing.set(false);
    this.editError.set('');
  }

  async saveProfile() {
    const form = this.editForm();

    if (!form.username.trim() || !form.email.trim()) {
      this.editError.set('Username and email are required.');
      return;
    }
    if (form.password && form.password !== form.confirmPassword) {
      this.editError.set('Passwords do not match.');
      return;
    }

    this.editSaving.set(true);
    this.editError.set('');

    const payload: { username?: string; email?: string; password?: string } = {
      username: form.username.trim(),
      email: form.email.trim(),
    };
    if (form.password) payload.password = form.password;

    this.http.put<{ success: boolean; message?: string }>('/api/user/profile', payload)
      .subscribe({
        next: (res) => {
          if (res.success) {
            // Update local user state
            const updated = { ...this.user()!, username: payload.username!, email: payload.email! };
            localStorage.setItem('currentUser', JSON.stringify(updated));
            // Force signal update via auth service re-read
            (this.authService as any).currentUser.set(updated);
            this.toastr.success('Profile updated', 'Success');
            this.editing.set(false);
          } else {
            this.editError.set(res.message || 'Update failed.');
          }
          this.editSaving.set(false);
        },
        error: () => {
          this.editError.set('Failed to save changes. Please try again.');
          this.editSaving.set(false);
        }
      });
  }
}
