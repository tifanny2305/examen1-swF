import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { CanvasComponent } from '../pages/board/canvas.interface';

@Injectable({
  providedIn: 'root'
})
export class ServerService {
  public socket!: Socket;
  public roomCode!: string;
  public roomName!: string;
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

  onInitialCanvasLoad(): Observable<any[]> {
    return new Observable(observer => {
      this.socket.on('initialCanvasLoad', (components) => {
        observer.next(components);
      });
    });
  }

  // Componentes del Canvas
  addCanvasComponent(component: CanvasComponent): void {
    this.socket.emit('addComponent', { 
      roomCode: this.roomCode, 
      component 
    });
  }

  //Actualizar los cambios de un componente
  updateCanvasComponent(componentId: string, newProperties: Partial<CanvasComponent['style']>): void {
    this.socket.emit('updateComponent', {
      roomCode: this.roomCode,
      componentId,
      newProperties,
    });
  }

  //Escucha los cambios
  onComponentUpdated(): Observable<{componentId: string, newProperties: any}> {
    return new Observable(observer => {
      this.socket.on('componentUpdated', (data) => {
        observer.next(data);
      });
    });
  }

  removeCanvasComponent(componentId: string): void {
    this.socket.emit('removeComponent', { 
      roomCode: this.roomCode, 
      componentId 
    });
  }

  // Listeners
  onInitialCanvasState(): Observable<CanvasComponent[]> {
    return new Observable(observer => {
      this.socket.on('initialCanvasState', (components) => {
        observer.next(components);
      });
    });
  }

  onComponentAdded(): Observable<CanvasComponent> {
    return new Observable(observer => {
      this.socket.on('componentAdded', (component) => {
        observer.next(component);
      });
    });
  }

  

  onComponentRemoved(): Observable<string> {
    return new Observable(observer => {
      this.socket.on('componentRemoved', (componentId) => {
        observer.next(componentId);
      });
    });
  }

  //Agregar hijo
  addChildComponent(parentId: string, child: CanvasComponent): void {
    this.socket.emit('addChildComponent', {
      roomCode: this.roomCode,
      parentId,
      child,
    });
  }

  //Escucha al hijo
  onChildComponentAdded(): Observable<{ parentId: string, child: CanvasComponent }> {
    return new Observable(observer => {
      this.socket.on('childComponentAdded', (data) => {
        observer.next(data);
      });
    });
  }
  
  // Desconectar el socket
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

}