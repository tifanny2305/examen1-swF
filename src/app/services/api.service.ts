import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ServerService } from './server.service';

interface LoginResponse {
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  apiUrl: string = 'https://examen1-swb-production.up.railway.app/api';

  tokenKey = 'authToken';

  constructor(private http: HttpClient, private router: Router, private serverService: ServerService) {}

  //login
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap((response) => {
          if (response.token) {
            console.log('Token recibido:',response.token);
            this.setToken(response.token); // Guarda el token en el sistema
            localStorage.setItem('authToken', response.token);  // Guarda el token en localStorage
            
            // Ahora conecta el socket después de que el token esté en localStorage
            this.serverService.disconnect();  
            this.serverService.connect(); 
          }
        }),
        catchError((err: HttpErrorResponse) => {  // Tipo correcto para errores HTTP
          console.error('Error en el login:', err);
          throw err;
        })
      );
  }

  // Método para registrar un nuevo usuario
  register(username: string, password: string): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/register`, { username, password })
      .pipe(
        tap((response) => {
          console.log('Registro exitoso:', response);
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('Error en el registro:', err);
          return throwError(err);  // Lanza el error para manejarlo en el componente
        })
      );
  }

  // todas las salas como admin
  getAdminBoards(): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get<any>(`${this.apiUrl}/access/findAll`, { headers })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error al obtener las salas:', error);
          return throwError('Error al obtener las salas');
        })
      );
  }

  getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));  // Convierte la expiración a milisegundos
    const exp = payload.exp * 1000; // Convierte la expiración a milisegundos
    return Date.now() < exp;  // Comprueba si el token ha expirad
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.router.navigate(['']);
  }

  // Crear una sala
  createRoom(roomName: string): Observable<any> {

    if (!this.isAuthenticated()) {
      return throwError('Token no es valido o expiro');
    }

    const token = this.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`  // Incluye el token en el encabezado si es necesario
    });

    return this.http
      .post<any>(`${this.apiUrl}/board`, { name: roomName }, { headers })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          let errorMessage = 'Error desconocido al crear la sala';
          if (error.error instanceof ErrorEvent) {
            errorMessage = `Error del cliente: ${error.error.message}`;
          } else {
            errorMessage = `Error del servidor: ${error.status} - ${error.message}`;
          }
          console.error('Error completo:', errorMessage);
          return throwError(errorMessage);
        })
      );
  }

  // Unirse a una sala
  joinRoom(roomCode: string): Observable<any> {
    if (!this.isAuthenticated()) {
      return throwError('Token no es valido o expiro');
    }

    const token = this.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`  // Incluye el token en el encabezado si es necesario
    });

    return this.http
      .post<any>(`${this.apiUrl}/board/join`, { codigo: roomCode }, { headers })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          let errorMessage = 'Error desconocido al unirse a la sala';
          if (error.error instanceof ErrorEvent) {
            errorMessage = `Error del cliente: ${error.error.message}`;
          } else {
            errorMessage = `Error del servidor: ${error.status} - ${error.message}`;
          }
          console.error('Error completo:', errorMessage);
          return throwError(errorMessage);
        })
      );
  }

}
