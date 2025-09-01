import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-admin-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="demo-container">
      <h2>🧪 Admin Demo</h2>
      <p>Click the button below to login as an admin user and access the admin panel:</p>
      
      <div class="demo-actions">
        <button class="btn btn-admin" (click)="loginAsAdmin()">
          🛡️ Login as Admin
        </button>
        
        <button class="btn btn-mod" (click)="loginAsModerator()">
          🔧 Login as Moderator  
        </button>
        
        <button class="btn btn-user" (click)="loginAsUser()">
          👤 Login as Regular User
        </button>
      </div>
      
      <div class="demo-info">
        <h3>Demo Accounts:</h3>
        <ul>
          <li><strong>Admin:</strong> Full access to all admin features</li>
          <li><strong>Moderator:</strong> Content management and user moderation</li>
          <li><strong>User:</strong> Standard user access</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .demo-container {
      max-width: 600px;
      margin: 50px auto;
      padding: 30px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    
    .demo-container h2 {
      color: #333;
      margin-bottom: 20px;
    }
    
    .demo-actions {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin: 30px 0;
    }
    
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .btn-admin {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      color: white;
    }
    
    .btn-mod {
      background: linear-gradient(135deg, #fd7e14 0%, #e55100 100%);
      color: white;
    }
    
    .btn-user {
      background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
      color: white;
    }
    
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }
    
    .demo-info {
      margin-top: 30px;
      text-align: left;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
    }
    
    .demo-info h3 {
      margin-bottom: 15px;
      color: #333;
    }
    
    .demo-info ul {
      list-style: none;
      padding: 0;
    }
    
    .demo-info li {
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }
    
    .demo-info li:last-child {
      border-bottom: none;
    }
  `]
})
export class AdminDemoComponent {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async loginAsAdmin() {
    await this.simulateLogin('admin', 'admin', 'admin');
  }

  async loginAsModerator() {
    await this.simulateLogin('moderator', 'moderator', 'moderator');
  }

  async loginAsUser() {
    await this.simulateLogin('user', 'user', 'user');
  }

  private async simulateLogin(username: string, email: string, role: 'admin' | 'moderator' | 'user') {
    // Simulate successful login by directly setting user data
    const user = {
      id: Date.now().toString(),
      username: username,
      email: `${email}@demo.com`,
      role: role
    };

    // Set the user in AuthService
    (this.authService as any).currentUser.set(user);
    (this.authService as any).isAuthenticated.set(true);
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('authToken', 'demo-token-' + role);

    // Navigate to appropriate page
    if (role === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}
