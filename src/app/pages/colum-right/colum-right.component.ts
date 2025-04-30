import { Component, Input } from '@angular/core';
import { CanvasComponent } from '../board/canvas.interface';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServerService } from '../../services/server.service';

@Component({
  selector: 'app-colum-right',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './colum-right.component.html',
  styleUrl: './colum-right.component.css'
})
export class ColumRightComponent {
  @Input() selectedComponent: CanvasComponent | null = null;
  @Input() components: CanvasComponent[] = [];    // <— esto faltaba
  @Input() roomCode!: string;

  constructor(private serverService: ServerService) { }

  // Convierte '100px' a número 100
  parsePxValue(value: string | undefined): number {
    if (!value) return 0;
    return parseInt(value.replace('px', ''), 10);
  }

  // Maneja los cambios de propiedades (top, left, width, height, etc.)
  onPropertyChange(value: any, property: keyof CanvasComponent['style']) {
    if (!this.selectedComponent) return;

    let formattedValue = value;

    // Solo agregar 'px' si la propiedad es de tipo pixel
    if (['top', 'left', 'width', 'height', 'borderRadius', 'fontSize', 'lineHeight'].includes(property)) {
      formattedValue = `${value}px`;
    }

    //Actualiza el style localmente
    this.selectedComponent.style[property] = formattedValue;

    // Emitir sólo el parche puntual
    this.serverService.updateComponentProperties(
      this.selectedComponent.id,
      { [property]: formattedValue }
    );

    // Salvar el canvas completo para guardarlo en BD
    ///this.serverService.saveCanvasState(this.components);
  }

  // Maneja los cambios
  onContentChange(newContent: string) {
    if (!this.selectedComponent) return;

    this.selectedComponent.content = newContent;

    // Emitir los cambios al servidor
    this.serverService.updateComponentProperties(this.selectedComponent.id, {
      content: newContent,
    });

    this.serverService.saveCanvasState(this.components);
  }

  getBorderProperty(prop: 'width' | 'style' | 'color'): string | number {
    if (!this.selectedComponent?.style.border) {
      return prop === 'width' ? 0 : prop === 'color' ? '#000000' : 'solid';
    }

    const parts = this.selectedComponent.style.border.split(' ');
    switch (prop) {
      case 'width': return parseInt(parts[0]) || 0;
      case 'color': return parts[2] || '#000000';
      default: return parts[1] || 'solid';
    }
  }

  setBorderProperty(prop: 'width' | 'style' | 'color', value: string | number) {
    if (!this.selectedComponent) return;

    const current = this.selectedComponent.style.border || '0 solid #000000';
    let [width, style, color] = current.split(' ');

    switch (prop) {
      case 'width': width = `${value}px`; break;
      case 'color': color = value as string; break;
      case 'style': style = value as string; break;
    }

    const newBorder = `${width || '0'} ${style || 'solid'} ${color || '#000000'}`;
    this.onPropertyChange(newBorder, 'border');

    // Emitir los cambios al servidor
    this.serverService.updateComponentProperties(this.selectedComponent.id, {
      border: newBorder,
    });
  }



}
