import { Component, Input } from '@angular/core';
import { CanvasComponent } from '../board/canvas.interface';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ServerService } from '../../services/server.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-colum-left',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './colum-left.component.html',
  styleUrl: './colum-left.component.css'
})
export class ColumLeftComponent {

  @Input() components: CanvasComponent[] = [];
  @Input() roomCode: string = '';
  @Input() contextMenu: any;
  @Input() isModalOpen: boolean = false;

  get formattedComponentsJson(): string {
    return JSON.stringify(this.components, null, 2);
  }

  constructor(
    private route: ActivatedRoute,
    public serverService: ServerService,
    private router: Router
  ) { }

  showParticipants: boolean = false;

  addComponent() {
    const newComponent: CanvasComponent = {
      id: uuidv4(),
      type: 'div',
      style: {
        top: '50px',
        left: '50px',
        width: '200px',
        height: '100px',
        backgroundColor: '#f0f0f0',
        color: '#000000', // Color de texto negro por defecto
        border: '1px solid #cccccc', // Borde más sutil
        borderRadius: '4px',
        position: 'absolute',
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: '40px',
      },
      content: 'Nuevo Div', // Texto por defecto más descriptivo
      children: [],
      parentId: null,
    };

    this.serverService.addCanvasComponent(newComponent);
    this.components.push(newComponent);
    this.contextMenu.visible = false;

    this.serverService.saveCanvasState(this.components);
  }

  addLabel() {
    const lbl: CanvasComponent = {
      id: uuidv4(),
      type: 'label',
      style: {
        top: '60px', left: '60px',
        color: '#333',
        fontSize: '14px',
        position: 'absolute'
      },
      content: 'Etiqueta',
      children: [], parentId: null
    };
    this.pushComponent(lbl);

  }

  addButton() {
    const btn: CanvasComponent = {
      id: uuidv4(),
      type: 'button',
      style: {
        top: '70px', left: '70px',
        width: '100px', height: '40px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        position: 'absolute',
        cursor: 'pointer',
        textAlign: 'center', lineHeight: '40px'
      },
      content: 'Click Me',
      children: [], parentId: null
    };
    this.pushComponent(btn);

  }

  addInput() {
    const inp: CanvasComponent = {
      id: uuidv4(),
      type: 'input',
      style: {
        top: '80px', left: '80px',
        width: '150px', height: '30px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        position: 'absolute',
        padding: '4px'
      },
      content: '',              // Puedes usar content como placeholder
      children: [], parentId: null
    };
    this.pushComponent(inp);

  }

  addTable() {
    const tbl: CanvasComponent = {
      id: uuidv4(),
      type: 'table',
      style: {
        top: '80px',
        left: '80px',
        width: '300px',
        height: '150px',
        border: '1px solid #cccccc',
        borderRadius: '4px',
        position: 'absolute',
        backgroundColor: '#ffffff'
      },
      content: '',     // puede quedarse vacío; luego agregas filas
      children: [],    
      parentId: null,
    };
    this.pushComponent(tbl);
  }

  addCheckbox() {
    const cb: CanvasComponent = {
      id: uuidv4(),
      type: 'checkbox',
      style: {
        top: '100px',
        left: '100px',
        width: '16px',
        height: '16px',
        position: 'absolute'
      },
      content: '',      // el checkbox no usa texto aquí
      children: [],
      parentId: null,
    };
    this.pushComponent(cb);
  }

  addSelect() {
    const sel: CanvasComponent = {
      id: uuidv4(),
      type: 'select',
      style: {
        top: '120px',
        left: '120px',
        width: '150px',
        height: '30px',
        border: '1px solid #cccccc',
        borderRadius: '4px',
        position: 'absolute',
        padding: '4px'
      },
      content: 'Seleccione..',      // puedes usar content para placeholder
      children: [],    
      parentId: null,
    };
    this.pushComponent(sel);
  }

  private pushComponent(comp: CanvasComponent) {
    this.serverService.addCanvasComponent(comp);
    this.components.push(comp);
    this.contextMenu.visible = false;
    this.serverService.saveCanvasState(this.components);
  }

}
