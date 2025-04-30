import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ServerService } from '../../services/server.service';
import { CanvasComponent } from './canvas.interface';
import { ColumLeftComponent } from '../colum-left/colum-left.component';
import { ColumRightComponent } from '../colum-right/colum-right.component';
import { ExportAngularComponent } from '../export-angular/export-angular.component';
import { v4 as uuidv4 } from 'uuid';

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
  generatedHTML: string = '';
  isHtmlModalOpen: boolean = false;

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
    private exportarAngular: ExportAngularComponent,
  ) { }

  ngOnInit(): void {
    //obtiene el cod de la sala desde el url
    this.roomCode = this.route.snapshot.paramMap.get('codigo') || '';

    // Unirse al board y conectar servidor
    this.serverService.connect();
    this.serverService.joinBoard(this.roomCode);

    // Cargar el estado inicial desde el servidor
    this.serverService.onInitialCanvasState().subscribe(components => {
      this.components = components;
      this.cdr.detectChanges();
    });
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

    // Escuchar cambios de propiedades de componentes
    this.serverService.onComponentPropertiesUpdated()
      .subscribe(({ componentId, updatedProperties }) => {
        const comp = this.findComponentById(componentId, this.components);
        if (!comp) return;

        // 1) Si llegó contenido, lo aplicamos al componente
        if ((updatedProperties as any).content !== undefined) {
          comp.content = (updatedProperties as any).content;
        }

        // 2) Luego aplicamos sólo los estilos que vengan
        const { content, ...styleUpdates } = updatedProperties as any;
        Object.assign(comp.style, styleUpdates);

        console.log(`Componente ${componentId} actualizado:`, updatedProperties);
        this.cdr.detectChanges();
      });

    // Escuchar cambios de contenido de componentes
    this.serverService.onComponentContentUpdated().subscribe(({ componentId, content }) => {
      const component = this.findComponentById(componentId, this.components);
      if (component) {
        component.content = content; // Actualiza el contenido del componente
        console.log(`Contenido actualizado para el componente ${componentId}:`, content);
        this.cdr.detectChanges();
      }
    });

    // Escuchar cuando se elimina un componente
    this.serverService.onComponentRemoved().subscribe((componentId: string) => {
      this.removeRecursive(this.components, componentId);
      if (this.selectedComponent?.id === componentId) this.selectedComponent = null;
      console.log(`Componente eliminado: ${componentId}`);
      this.cdr.detectChanges();
    });

  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
  }

  initializeCanvas(): void {
  }

  OnAddDiv() {
    this.columLeft.addComponent();
  }

  addChild(parentId: string) {
    const parent = this.findComponentById(parentId, this.components);
    if (!parent) return;

    const child: CanvasComponent = {
      id: uuidv4(),
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
    this.serverService.saveCanvasState(this.components);

  }

  removeComponent(id: string) {
    // Emitir el evento al servidor
    this.serverService.removeCanvasComponent(id);

    this.removeRecursive(this.components, id);
    if (this.selectedComponent?.id === id) this.selectedComponent = null;
    this.contextMenu.visible = false;

    // Guardar el estado en el servidor
    this.serverService.saveCanvasState(this.components);

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

    this.serverService.saveCanvasState(this.components);

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

    // Guardar el estado en el servidor
    this.serverService.saveCanvasState(this.components);
  }

  generateHTML(
    components: CanvasComponent[],
    depth: number = 0
  ): string {

    let html = '';
    const indent = '  '.repeat(depth);

    components.forEach(comp => {
      // 1) serializar estilos
      const style = Object.entries(comp.style || {})
        .map(([k, v]) => `${k}: ${v};`)
        .join(' ');

      // 2) abrir wrapper <div>
      html += `${indent}<div id="${comp.id}" style="${style}">\n`;

      // 3) contenido semántico con indent interior
      const inner = '  '.repeat(depth + 1);
      switch (comp.type) {
        case 'label':
          html += `${inner}<label>${comp.content || ''}</label>\n`;
          break;
        case 'button':
          html += `${inner}<button>${comp.content || ''}</button>\n`;
          break;
        case 'input':
          html += `${inner}<input placeholder="${comp.content || ''}" />\n`;
          break;
        default:
          html += `${inner}${comp.content || ''}\n`;
      }

      // 4) hijos recursivos
      if (comp.children?.length) {
        html += this.generateHTML(comp.children, depth + 1);
      }

      // 5) cerrar wrapper
      html += `${indent}</div>\n`;
    });

    return html;
  }

  showGeneratedHTML(): void {
    const html = this.generateHTML(this.components);
    console.log(html); // Muestra el HTML en la consola

    // Opcional: Mostrar en un modal
    this.generatedHTML = html;
    this.isHtmlModalOpen = true;
  }

  /*exportComponents() {
    const projectData = {
      name: 'MyAngularProject',
      components: this.components.map(comp => ({
        name: this.getComponentName(comp),
        properties: this.getComponentProperties(comp),
        template: this.getComponentTemplate(comp),
        styles: this.getComponentStyles(comp)
      }))
    };
    
    this.exportarAngular.exportToZip(projectData.components, projectData.name);
  }
  
  private getComponentName(component: any): string {
    // Lógica para generar nombres de componentes
    return component.type || 'CustomComponent';
  }*/



  onMouseUp() {
    this.dragState.isDragging = false;
  }
}