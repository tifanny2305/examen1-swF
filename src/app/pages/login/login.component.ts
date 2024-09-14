import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private apiService: ApiService, private router: Router) {}

  onLogin(): void {
    this.apiService.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/access']),
      error: (err) => {
        console.error('Error en el login:', err);
        this.errorMessage = 'Nombre de usuario o contraseña incorrectos';
      }
    });
  }
}
