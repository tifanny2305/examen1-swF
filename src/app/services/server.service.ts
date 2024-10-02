import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class ServerService {
  public socket!: Socket;
  public roomCode!: string;
  private isConnected: boolean = false;

  constructor(private httpClient: HttpClient) { 
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
    this.roomCode = roomCode;
    this.socket.emit('joinBoard', { codigo: roomCode });

    
  }

  // Emite actualizaciones del diagrama
  onDiagramUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('reciveDiagramUpdate', (data) => {
        observer.next(data);  // Emitir la actualización a los componentes
      });

      // Limpiar el observable cuando ya no se necesita
      return () => {
        this.socket.off('reciveDiagramUpdate');
      };
    });
  }

  // Método para obtener los datos del diagrama desde el servidor
  getDiagramData(roomCode: string): Observable<any> {
    return new Observable((observer) => {
      // Solicita los datos del diagrama al backend
      this.socket.emit('requestDiagramData', { roomCode });

      // Escucha los datos del diagrama que llegan del backend
      this.socket.on('diagramData', (data: any) => {
        observer.next(data);
      });

      // Limpiar la suscripción cuando se complete
      return () => {
        this.socket.off('diagramData');
      };
    });
  }
 
  // Escucha actualizaciones del diagrama al servidor
  sendDiagramUpdate(update: { roomCode: string, updateType: string, data: any }): void {
    console.log('Enviando actualización del diagrama:', update);
    this.socket.emit('sendDiagramUpdate', update);
  }
  
  // Desconectar el socket
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

}