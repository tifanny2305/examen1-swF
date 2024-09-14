import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import * as go from 'gojs';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.css']
})
export class BoardComponent implements AfterViewInit{
  @ViewChild('diagramDiv', { static: true }) diagramDiv!: ElementRef;
  private diagram!: go.Diagram;

  // Declarar propiedades
  fromClassId: number = 1; // Por defecto, puede empezar desde 1
  toClassId: number = 2; // Por defecto, puede empezar desde 2
  selectedRelation: string = 'association'; // Relación por defecto

  constructor() {}

  ngAfterViewInit(): void {
    this.diagram = new go.Diagram(this.diagramDiv.nativeElement);

    // Plantilla de nodos (clases)
    this.diagram.nodeTemplate = go.GraphObject.make(go.Node, 'Auto',
      go.GraphObject.make(go.Shape, 'Rectangle', { fill: 'white' }),
      go.GraphObject.make(go.Panel, 'Table',
        go.GraphObject.make(go.TextBlock, { row: 0, column: 0, margin: 4, editable: true }, 
          new go.Binding('text', 'name').makeTwoWay()), // Nombre editable de la clase
        go.GraphObject.make(go.Panel, 'Vertical', { row: 1, column: 0 },
          new go.Binding('itemArray', 'attributes'), // Atributos
          {
            itemTemplate: go.GraphObject.make(go.Panel, 'Horizontal',
              go.GraphObject.make(go.TextBlock, { margin: 2, editable: true }, new go.Binding('text', 'name').makeTwoWay()))
          }
        ),
        go.GraphObject.make(go.Panel, 'Vertical', { row: 2, column: 0 },
          new go.Binding('itemArray', 'methods'), // Métodos
          {
            itemTemplate: go.GraphObject.make(go.Panel, 'Horizontal',
              go.GraphObject.make(go.TextBlock, { margin: 2, editable: true }, new go.Binding('text', 'name').makeTwoWay()))
          }
        )
      )
    );

    // Definir la plantilla de enlaces (relaciones entre clases)
    this.diagram.linkTemplateMap.add("association", go.GraphObject.make(go.Link,
      go.GraphObject.make(go.Shape),  // Línea básica para asociación
      go.GraphObject.make(go.Shape, { toArrow: 'OpenTriangle' }) // Flecha para indicar dirección
    ));

    this.diagram.linkTemplateMap.add("composition", go.GraphObject.make(go.Link,
      go.GraphObject.make(go.Shape),  // Línea para composición
      go.GraphObject.make(go.Shape, { fromArrow: 'Diamond', fill: 'black' })  // Diamante sólido para composición
    ));

    this.diagram.linkTemplateMap.add("aggregation", go.GraphObject.make(go.Link,
      go.GraphObject.make(go.Shape),  // Línea para agregación
      go.GraphObject.make(go.Shape, { fromArrow: 'Diamond', fill: 'white' })  // Diamante vacío para agregación
    ));

    // Inicializar el modelo como GraphLinksModel
    this.diagram.model = new go.GraphLinksModel(
      [
        { key: 1, name: 'Clase1', attributes: [{ name: 'atributo1' }], methods: [{ name: 'metodo1' }] },
        { key: 2, name: 'Clase2', attributes: [], methods: [] }
      ],
      [
        { from: 1, to: 2 } // Relación de asociación entre Clase1 y Clase2
      ]
    );
  }

  // Método para agregar una nueva clase
  addClass() {
    const newClass = {
      key: this.diagram.model.nodeDataArray.length + 1,
      name: 'Nueva Clase',
      attributes: [],
      methods: []
    };

    (this.diagram.model as go.GraphLinksModel).addNodeData(newClass); // Usamos GraphLinksModel para agregar un nodo
  }

  // Método para agregar una relación entre dos clases
  addAssociation(fromKey: number, toKey: number) {
    const linkData = { from: fromKey, to: toKey };
    (this.diagram.model as go.GraphLinksModel).addLinkData(linkData); // Usamos GraphLinksModel para agregar un enlace
  }

  // Método para agregar una relación entre dos clases (asociación, composición, etc.)
  addRelation(fromKey: number, toKey: number, relationType: string) {
    const linkData = { from: fromKey, to: toKey, category: relationType };
    (this.diagram.model as go.GraphLinksModel).addLinkData(linkData);
  }
}
