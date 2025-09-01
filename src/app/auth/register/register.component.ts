import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';

interface PasswordRequirement {
  id: string;
  text: string;
  fulfilled: boolean;
  regex: RegExp;
}

interface RegistrationForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  // Form data
  formData = signal<RegistrationForm>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Password requirements
  passwordRequirements = signal<PasswordRequirement[]>([
    {
      id: 'length',
      text: 'At least 8 characters long',
      fulfilled: false,
      regex: /.{8,}/
    },
    {
      id: 'uppercase',
      text: 'Contains at least one uppercase letter',
      fulfilled: false,
      regex: /[A-Z]/
    },
    {
      id: 'lowercase',
      text: 'Contains at least one lowercase letter',
      fulfilled: false,
      regex: /[a-z]/
    },
    {
      id: 'number',
      text: 'Contains at least one number',
      fulfilled: false,
      regex: /\d/
    },
    {
      id: 'special',
      text: 'Contains at least one special character (!@#$%^&*)',
      fulfilled: false,
      regex: /[!@#$%^&*(),.?":{}|<>]/
    }
  ]);

  // Additional validations
  emailValid = computed(() => {
    const email = this.formData().email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email.length === 0 || emailRegex.test(email);
  });

  usernameValid = computed(() => {
    const username = this.formData().username;
    return username.length === 0 || (username.length >= 3 && username.length <= 20);
  });

  passwordsMatch = computed(() => {
    const { password, confirmPassword } = this.formData();
    return confirmPassword.length === 0 || password === confirmPassword;
  });

  allPasswordRequirementsMet = computed(() => {
    return this.passwordRequirements().every(req => req.fulfilled);
  });

  formValid = computed(() => {
    const { username, email, password, confirmPassword } = this.formData();
    return username.length >= 3 &&
           this.emailValid() &&
           email.length > 0 &&
           this.allPasswordRequirementsMet() &&
           this.passwordsMatch() &&
           confirmPassword.length > 0;
  });

  // Loading and error states
  loading = signal(false);
  error = signal('');
  showGuidelines = signal(false);

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  updateFormField(field: keyof RegistrationForm, value: string) {
    this.formData.set({
      ...this.formData(),
      [field]: value
    });

    // Update password requirements when password changes
    if (field === 'password') {
      this.updatePasswordRequirements(value);
    }

    // Show guidelines when user starts typing password
    if (field === 'password' && value.length > 0) {
      this.showGuidelines.set(true);
    }
  }

  private updatePasswordRequirements(password: string) {
    const requirements = this.passwordRequirements().map(req => ({
      ...req,
      fulfilled: req.regex.test(password)
    }));
    this.passwordRequirements.set(requirements);
  }

  onPasswordFocus() {
    this.showGuidelines.set(true);
  }

  async onSubmit() {
    if (!this.formValid()) {
      this.error.set('Please fill in all fields correctly');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const { username } = this.formData();
      
      // Check for special admin usernames
      const adminUsernames = ['admin', 'administrator', 'manga_admin', 'root'];
      if (adminUsernames.includes(username.toLowerCase())) {
        // Auto-login as admin for special usernames
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay for UX
        this.authService.loginAsSpecialAdmin(username);
        this.router.navigate(['/admin']);
        return;
      }

      // Simulate regular registration API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real app, make actual registration API call here
      console.log('Registration data:', this.formData());
      
      // Redirect to login for regular users
      this.router.navigate(['/login']);
      
    } catch (error) {
      console.error('Registration error:', error);
      this.error.set('Registration failed. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
