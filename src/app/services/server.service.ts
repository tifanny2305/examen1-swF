import { HttpClient } from '@angular/common/http';
import { Injectable, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { CanvasComponent } from '../pages/board/canvas.interface';

@Injectable({
  providedIn: 'root'
})
export class ServerService {
  @Input() selectedComponent: CanvasComponent | null = null;

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
      this.socket = io('https://examen1-swb.onrender.com', {
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

  //Guarda en el servidor el estado del canvas
  saveCanvasState(components: CanvasComponent[]): void {
    this.socket.emit('saveCanvasState', {
      roomCode: this.roomCode,
      components,
    });
  }

  //Muestra para lo que hay al que se unio
  onInitialCanvasState(): Observable<CanvasComponent[]> {
    return new Observable(observer => {
      this.socket.on('initialCanvasState', (components: CanvasComponent[]) => {
        observer.next(components);
      });
    });
  }

  //Eliminar un componente ------------------------

  //Emite
  removeCanvasComponent(componentId: string): void {
    this.socket.emit('removeComponent', {
      roomCode: this.roomCode,
      componentId,
    });
  }

  //Escucha
  onComponentRemoved(): Observable<string> {
    return new Observable(observer => {
      this.socket.on('componentRemoved', (componentId) => {
        observer.next(componentId);
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

  //Cambios de un componente ------------------------------

  //Emite
  updateComponentProperties(
    componentId: string,
    updatedProperties: Partial<CanvasComponent['style']> & Partial<Pick<CanvasComponent, 'content'>>
  ): void {
    this.socket.emit('updateComponentProperties', {
      roomCode: this.roomCode,
      componentId,
      updatedProperties,
    });
  }

  //Escucha
  onComponentPropertiesUpdated(): Observable<{ componentId: string, updatedProperties: Partial<CanvasComponent['style']> }> {
    return new Observable(observer => {
      this.socket.on('componentPropertiesUpdated', (data) => {
        observer.next(data);
      });
    });
  }

  onContentChange(newContent: string) {
    if (!this.selectedComponent) return;
  
    this.selectedComponent.content = newContent;
  
    // Emitir los cambios al servidor
    this.updateComponentProperties(this.selectedComponent.id, {
      content: newContent,
    });
  }

  onComponentContentUpdated(): Observable<{ componentId: string, content: string }> {
    return new Observable(observer => {
      this.socket.on('componentContentUpdated', (data) => {
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