import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ServerService } from '../../services/server.service';
import { CanvasComponent } from './canvas.interface';
import { ColumLeftComponent } from '../colum-left/colum-left.component';
import { ColumRightComponent } from '../colum-right/colum-right.component';

interface DragState {
  isDragging: boolean;
  component: CanvasComponent | null;
  startX: number;
  startY: number;
  initialLeft: number;
  initialTop: number;
}

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule, ColumLeftComponent, ColumRightComponent],
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.css']
})

export class BoardComponent implements AfterViewInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLDivElement>;
  @ViewChild(ColumLeftComponent) columLeft!: ColumLeftComponent;

  roomCode: string = '';
  roomName: string = '';
  roomId: number = 0;
  errorMessage: string = '';
  usersInRoom: any[] = [];
  private lastId = 0;

  // Variables para almacenar las dimensiones temporales
  components: CanvasComponent[] = [];
  selectedComponent: CanvasComponent | null = null;

  //posicion
  dragState: DragState = {
    isDragging: false,
    component: null,
    startX: 0,
    startY: 0,
    initialLeft: 0,
    initialTop: 0,
  };
  contextMenu = {
    visible: false,
    x: 0,
    y: 0,
    targetId: '',
  };

  /**
   * Inicia el proceso de arrastre de un componente
   * @param event Evento del mouse
   * @param comp Componente que se va a arrastrar
   */

  // JSON que representa todos los componentes del canvas
  jsonExport: any[] = [];
  // Controla visibilidad del modal
  isModalOpen: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private serverService: ServerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    //obtiene el cod de la sala desde el url
    this.roomCode = this.route.snapshot.paramMap.get('codigo') || '';

    // Unirse al board y conectar servidor
    this.serverService.connect();
    this.serverService.joinBoard(this.roomCode);

    // Escuchar carga inicial del canvas
    this.serverService.onInitialCanvasLoad().subscribe(components => {
      this.components = components;
      this.cdr.detectChanges();
    });

    // Escuchar componentes nuevos
    this.serverService.onComponentAdded().subscribe((component: CanvasComponent) => {
      this.components.push(component); // Actualiza la lista de componentes con el nuevo componente recibido
      console.log('Nuevo componente añadido desde el servidor:', component);
    });

    // Escuchar actualizaciones de posición de componentes
    this.serverService.onComponentUpdated().subscribe(({ componentId, newProperties }) => {
      const component = this.findComponentById(componentId, this.components);
      if (component) {
        Object.assign(component.style, newProperties); // Actualiza las propiedades del estilo
        this.cdr.detectChanges();
      }
    });

    // Escuchar cuando se añade un hijo
    this.serverService.onChildComponentAdded().subscribe(({ parentId, child }) => {
      const parent = this.findComponentById(parentId, this.components);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(child);
        console.log(`Hijo añadido al componente ${parentId}:`, child);
        this.cdr.detectChanges();
      }
    });

  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
  }

  initializeCanvas(): void {
  }

  /*private generateId(): string {
    return `comp-${this.lastId++}`;
  }*/

  OnAddDiv() {
    this.columLeft.addComponent();
  }

  addChild(parentId: string) {
    const parent = this.findComponentById(parentId, this.components);
    if (!parent) return;

    const child: CanvasComponent = {
      id: this.columLeft.generateId(),
      style: {
        top: '10px',
        left: '10px',
        width: '100px',
        height: '60px',
        backgroundColor: '#d0d0ff',
        color: '#004040',  // Nuevo
        border: '2px', // Nuevo
        borderRadius: '10px', // Nuevo
        position: 'absolute'
      },
      content: ' div hijo',
      children: [],
      parentId: parent.id,
    };
    
    // Emitir el evento al servidor
    this.serverService.addChildComponent(parent.id, child);

    if (!parent.children) parent.children = [];
    parent.children.push(child);
    this.contextMenu.visible = false;

  }

  removeComponent(id: string) {
    this.removeRecursive(this.components, id);
    if (this.selectedComponent?.id === id) this.selectedComponent = null;
    this.contextMenu.visible = false;
  }

  removeRecursive(list: CanvasComponent[], id: string): boolean {
    const index = list.findIndex((c) => c.id === id);
    if (index !== -1) {
      list.splice(index, 1);
      return true;
    }

    for (const comp of list) {
      if (comp.children && this.removeRecursive(comp.children, id)) {
        return true;
      }
    }

    return false;
  }

  findComponentById(id: string, list: CanvasComponent[]): CanvasComponent | null {
    for (const comp of list) {
      if (comp.id === id) return comp;
      if (comp.children) {
        const found = this.findComponentById(id, comp.children);
        if (found) return found;
      }
    }
    return null;
  }

  selectComponent(comp: CanvasComponent, event: MouseEvent) {
    event.stopPropagation(); // Stop event bubbling
    this.selectedComponent = comp;
    this.contextMenu.visible = false;
  }

  onComponentContextMenu(event: MouseEvent, id: string) {
    event.preventDefault();
    event.stopPropagation(); // Stop event bubbling
    this.contextMenu.visible = true;
    this.contextMenu.x = event.clientX;
    this.contextMenu.y = event.clientY;
    this.contextMenu.targetId = id;
  }

  onCanvasContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.contextMenu.visible = false;
  }
  openHtmlModal() {
    this.isModalOpen = true;
  }

  onMouseDown(event: MouseEvent, component: CanvasComponent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.button === 0) { // Left click only
      this.dragState = {
        isDragging: true,
        component: component,
        startX: event.clientX,
        startY: event.clientY,
        initialLeft: parseInt(component.style.left || '0'),
        initialTop: parseInt(component.style.top || '0'),
      };
    }
  }

  onMouseMove(event: MouseEvent) {
    if (!this.dragState.isDragging || !this.dragState.component) return;

    const deltaX = event.clientX - this.dragState.startX;
    const deltaY = event.clientY - this.dragState.startY;

    const newLeft = this.dragState.initialLeft + deltaX;
    const newTop = this.dragState.initialTop + deltaY;

    const component = this.dragState.component;
    const parent = component.parentId ?
      this.findComponentById(component.parentId, this.components) : null;

    let finalLeft = newLeft;
    let finalTop = newTop;

    /*if (parent) {
      const parentWidth = parseInt(parent.style.width);
      const parentHeight = parseInt(parent.style.height);
      const componentWidth = parseInt(component.style.width);
      const componentHeight = parseInt(component.style.height);

      finalLeft = Math.max(0, Math.min(newLeft, parentWidth - componentWidth));
      finalTop = Math.max(0, Math.min(newTop, parentHeight - componentHeight));
    }*/

    // Actualiza localmente
    component.style.left = `${finalLeft}px`;
    component.style.top = `${finalTop}px`;

    // Emite el movimiento a través del socket
    this.serverService.updateCanvasComponent(component.id, {
      left: component.style.left,
      top: component.style.top,
    });
  }

  onMouseUp() {
    this.dragState.isDragging = false;
  }
}