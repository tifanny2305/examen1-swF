import { Component, Input } from '@angular/core';
import { CanvasComponent } from '../board/canvas.interface';
import { ActivatedRoute, Router } from '@angular/router';
import { ServerService } from '../../services/server.service';

@Component({
  selector: 'app-colum-left',
  standalone: true,
  imports: [],
  templateUrl: './colum-left.component.html',
  styleUrl: './colum-left.component.css'
})
export class ColumLeftComponent {

  private lastId = 0;

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

  public generateId(): string {
    return `comp-${this.lastId++}`;
  }

  addComponent() {
    const newComponent: CanvasComponent = {
      id: this.generateId(),
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
  }

}
