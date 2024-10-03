import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  username: string = '';
  password: string = '';
  confirmPassword: string = '';  
  errorMessage: string = '';

  constructor(private apiService: ApiService, private router: Router) {}

  onRegister(): void {
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }
  
    this.apiService.register(this.username, this.password).subscribe({
      next: () => {
        // Iniciar sesión automáticamente después del registro exitoso
        this.apiService.login(this.username, this.password).subscribe({
          next: () => this.router.navigate(['/access']),
          error: (err) => {
            console.error('Error en el login después del registro:', err);
            this.errorMessage = 'Error al iniciar sesión después del registro';
          }
        });
      },
      error: (err) => {
        console.error('Error en el registro:', err);
        this.errorMessage = 'Hubo un error en el proceso de registro';
      }
    });
  }
  

  onLogin(): void {
    this.router.navigate(['']); // Redirigir al login
  }
 
}
