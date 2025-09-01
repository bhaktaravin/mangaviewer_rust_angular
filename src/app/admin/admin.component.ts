import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../auth.service';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalManga: number;
  totalChapters: number;
  dailyDownloads: number;
  systemStatus: 'healthy' | 'warning' | 'error';
}

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'suspended' | 'banned';
  joinDate: Date;
  lastActive: Date;
  downloadCount: number;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  activeTab = signal<'dashboard' | 'users' | 'content' | 'settings'>('dashboard');
  
  // Dashboard data
  stats = signal<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalManga: 0,
    totalChapters: 0,
    dailyDownloads: 0,
    systemStatus: 'healthy'
  });

  // User management
  users = signal<User[]>([]);
  selectedUsers = signal<Set<string>>(new Set());
  userSearchTerm = signal('');
  userFilterRole = signal<string>('all');
  userFilterStatus = signal<string>('all');

  // Computed properties
  filteredUsers = computed(() => {
    const users = this.users();
    const searchTerm = this.userSearchTerm().toLowerCase();
    const roleFilter = this.userFilterRole();
    const statusFilter = this.userFilterStatus();

    return users.filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(searchTerm) ||
                           user.email.toLowerCase().includes(searchTerm);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  });

  loading = signal(false);
  error = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAdminData();
  }

  async loadAdminData() {
    this.loading.set(true);
    this.error.set('');

    try {
      // Check if user has admin privileges
      if (!this.authService.isAdmin()) {
        this.router.navigate(['/home']);
        return;
      }

      // Load dashboard stats
      await this.loadDashboardStats();
      
      // Load users for user management
      await this.loadUsers();

    } catch (error) {
      console.error('Error loading admin data:', error);
      this.error.set('Failed to load admin data');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDashboardStats() {
    // Mock data - replace with actual API calls
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.stats.set({
      totalUsers: 1247,
      activeUsers: 892,
      totalManga: 3456,
      totalChapters: 45789,
      dailyDownloads: 2341,
      systemStatus: 'healthy'
    });
  }

  private async loadUsers() {
    // Mock data - replace with actual API calls
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const mockUsers: User[] = [
      {
        id: '1',
        username: 'john_doe',
        email: 'john@example.com',
        role: 'user',
        status: 'active',
        joinDate: new Date('2024-01-15'),
        lastActive: new Date('2024-12-01'),
        downloadCount: 45
      },
      {
        id: '2',
        username: 'manga_admin',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
        joinDate: new Date('2023-11-01'),
        lastActive: new Date('2024-12-01'),
        downloadCount: 12
      },
      {
        id: '3',
        username: 'content_mod',
        email: 'mod@example.com',
        role: 'moderator',
        status: 'active',
        joinDate: new Date('2024-03-20'),
        lastActive: new Date('2024-11-30'),
        downloadCount: 78
      },
      {
        id: '4',
        username: 'suspended_user',
        email: 'suspended@example.com',
        role: 'user',
        status: 'suspended',
        joinDate: new Date('2024-06-10'),
        lastActive: new Date('2024-11-25'),
        downloadCount: 156
      }
    ];

    this.users.set(mockUsers);
  }

  // Tab navigation
  setActiveTab(tab: 'dashboard' | 'users' | 'content' | 'settings') {
    this.activeTab.set(tab);
  }

  // User management actions
  toggleUserSelection(userId: string) {
    const selected = new Set(this.selectedUsers());
    if (selected.has(userId)) {
      selected.delete(userId);
    } else {
      selected.add(userId);
    }
    this.selectedUsers.set(selected);
  }

  selectAllUsers() {
    const allUserIds = this.filteredUsers().map(user => user.id);
    this.selectedUsers.set(new Set(allUserIds));
  }

  clearUserSelection() {
    this.selectedUsers.set(new Set());
  }

  async updateUserStatus(userId: string, newStatus: 'active' | 'suspended' | 'banned') {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const users = this.users().map(user =>
        user.id === userId ? { ...user, status: newStatus } : user
      );
      this.users.set(users);
      
      console.log(`User ${userId} status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating user status:', error);
      this.error.set('Failed to update user status');
    }
  }

  async updateUserRole(userId: string, newRole: 'user' | 'admin' | 'moderator') {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const users = this.users().map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      );
      this.users.set(users);
      
      console.log(`User ${userId} role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      this.error.set('Failed to update user role');
    }
  }

  async bulkUpdateUserStatus(newStatus: 'active' | 'suspended' | 'banned') {
    const selectedIds = Array.from(this.selectedUsers());
    if (selectedIds.length === 0) return;

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const users = this.users().map(user =>
        selectedIds.includes(user.id) ? { ...user, status: newStatus } : user
      );
      this.users.set(users);
      this.clearUserSelection();
      
      console.log(`${selectedIds.length} users updated to ${newStatus}`);
    } catch (error) {
      console.error('Error bulk updating users:', error);
      this.error.set('Failed to bulk update users');
    }
  }

  // Search and filter
  updateUserSearch(term: string) {
    this.userSearchTerm.set(term);
  }

  updateUserRoleFilter(role: string) {
    this.userFilterRole.set(role);
  }

  updateUserStatusFilter(status: string) {
    this.userFilterStatus.set(status);
  }

  // Export functionality
  exportUserData() {
    const data = this.filteredUsers().map(user => ({
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      joinDate: user.joinDate.toISOString().split('T')[0],
      lastActive: user.lastActive.toISOString().split('T')[0],
      downloadCount: user.downloadCount
    }));

    const csv = this.convertToCSV(data);
    this.downloadCSV(csv, 'users_export.csv');
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }

  private downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Utility methods
  formatDate(date: Date): string {
    return date.toLocaleDateString();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return '#28a745';
      case 'suspended': return '#ffc107';
      case 'banned': return '#dc3545';
      default: return '#6c757d';
    }
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'admin': return '#dc3545';
      case 'moderator': return '#fd7e14';
      case 'user': return '#6c757d';
      default: return '#6c757d';
    }
  }
}
