import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class ServerService {
  private socket!: Socket;

  constructor() { 
    this.connect();
  }

  // Método para conectar el socket
  connect(): void {
    const token = localStorage.getItem('authToken');

    if (token) {
    this.socket = io('http://localhost:3000', {
      autoConnect: false,
      auth: {
        token: token  // Enviar el token en el objeto auth
      },
      transports: ['websocket']
    });
      this.socket.connect();
    }
  }

  // Método para unirse a una pizarra específica (sala)
  joinBoard(roomCode: string): void {
    this.socket.emit('joinBoard', { codigo: roomCode });
  }

  // Escuchar mensajes desde el servidor (actualizaciones del diagrama)
  onDiagramUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('reciveDiagramUpdate', (data) => {
        observer.next(data);
      });
    });
  }
 
  // Enviar actualizaciones del diagrama al servidor
  sendDiagramUpdate(data: any): void {
    this.socket.emit('enviaDiagramUpdate', data);
  }

  // Desconectar el socket
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

}