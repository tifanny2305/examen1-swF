import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http'; 
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';


@Component({
  selector: 'app-access',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule ],
  templateUrl: './access.component.html',
  styleUrls: ['./access.component.css']
})
export class AccessComponent {

  roomName: string = '';  // crear sala
  roomCode: string = '';  // unirse a sala
  isLoading: boolean = false; 

  constructor(private router: Router, private http: HttpClient, private apiService: ApiService,) {}

  logout(): void {
    this.apiService.logout();
  }

  onCreateRoom(): void {
    if (this.roomName.trim() === '') {
      alert('El campo de nombre de la sala no puede estar vacío');
      return;
    }
  
    if (!this.apiService.isAuthenticated()) {
      alert('El token no es válido o ha expirado');
      return;
    }
  
    const confirmCreate = confirm('¿Estás seguro de que deseas crear esta sala?');
    if (confirmCreate) {
      this.isLoading = true;
      this.apiService.createRoom(this.roomName).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.router.navigate([`/board/${response.board.codigo}`]);
        },
        error: (error) => {
          console.error('Error al crear la sala:', error);
          alert('Ocurrió un error al crear la sala: ' + error.message);
          this.isLoading = false;
        }
      });
    }
  }


  onJoinRoom(): void {

    if (this.roomCode.trim() === '') {
      alert('El código de la sala no puede estar vacío');
      return;
    }
  
    if (!this.apiService.isAuthenticated()) {
      alert('El token no es válido o ha expirado');
      return;
    }
  
    const confirmJoin = confirm('¿Estás seguro de que deseas unirte a esta sala?');
    if (confirmJoin) {
      this.isLoading = true;
      this.apiService.joinRoom(this.roomCode).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.router.navigate([`/board/${response.board.codigo}`]);
        },
        error: (error) => {
          console.error('Error al unirse a la sala:', error);
          alert('Ocurrió un error al unirse a la sala: ' + error.message);
          this.isLoading = false;
        }
      });
    }
  }
  

}
