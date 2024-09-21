import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
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
export class BoardComponent implements AfterViewInit {
  @ViewChild('diagramDiv', { static: true }) diagramDiv!: ElementRef;
  public  diagram!: go.Diagram;

  attributeName: string = ''; // Nombre del atributo
  methodName: string = ''; // Nombre del método
  methodReturnType: string = 'void'; // Tipo de retorno por defecto para métodos
  attributeReturnType: string = 'void'; 
  selectedRelationType: string = 'association'; // Tipo de relación seleccionado

  fromClassId: number | null = null; // Clase de origen seleccionada
  toClassId: number | null = null;   // Clase de destino seleccionada

  classList: any[] = [];  // Lista de clases (nodos) disponibles para seleccionar


  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.diagram = new go.Diagram(this.diagramDiv.nativeElement);
    this.initializeDiagram();

    // Actualizar la lista de clases después de inicializar el diagrama
    this.classList = this.diagram.model.nodeDataArray;

    // Forzar la detección de cambios después de actualizar la lista
    this.cdr.detectChanges();
  }

  initializeDiagram() {
    // Configuración de nodos (clases)
    this.diagram.nodeTemplate = go.GraphObject.make(go.Node, 'Auto',
      go.GraphObject.make(go.Shape, 'Rectangle', 
        { fill: 'white', stroke: 'black', strokeWidth: 2, portId: "", fromLinkable: true, toLinkable: true }), // Habilitar enlaces en todos los lados
      go.GraphObject.make(go.Panel, 'Vertical', { margin: 6 },  // Panel vertical para organizar el contenido
        go.GraphObject.make(go.TextBlock,  // Nombre de la clase
          {
            font: 'bold 12pt sans-serif',
            margin: new go.Margin(10, 0, 10, 0),  // Espaciado adicional
            editable: true
          },
          new go.Binding('text', 'name').makeTwoWay()),
    
        go.GraphObject.make(go.Shape, "LineH", { strokeWidth: 2 }),  // Línea horizontal
    
        go.GraphObject.make(go.Panel, 'Vertical',  // Panel para los atributos
          new go.Binding('itemArray', 'attributes'),
          {
            itemTemplate: go.GraphObject.make(go.Panel, 'Horizontal',
              go.GraphObject.make(go.TextBlock, { margin: new go.Margin(5, 0, 5, 0), editable: true },
                new go.Binding('text', 'name').makeTwoWay())
            )
          }
        ),
    
        go.GraphObject.make(go.Shape, "LineH", { strokeWidth: 2 }),  // Otra línea horizontal
    
        go.GraphObject.make(go.Panel, 'Vertical',  // Panel para los métodos
          new go.Binding('itemArray', 'methods'),
          {
            itemTemplate: go.GraphObject.make(go.Panel, 'Horizontal',
              go.GraphObject.make(go.TextBlock, { margin: new go.Margin(5, 0, 5, 0), editable: true },
                new go.Binding('text', 'name').makeTwoWay())
            )
          }
        )
      )
    );

    this.diagram.toolManager.linkingTool.isEnabled = false;
    this.diagram.toolManager.relinkingTool.isEnabled = false;

    // Plantilla para Asociación
    this.diagram.linkTemplateMap.add("association", go.GraphObject.make(go.Link,
      {
        routing: go.Link.Orthogonal,
        corner: 10,
        relinkableFrom: true,
        relinkableTo: true,
        reshapable: true,
        resegmentable: true
      },
      go.GraphObject.make(go.Shape, { strokeWidth: 2 }),  // Línea básica
      go.GraphObject.make(go.Shape, { toArrow: 'OpenTriangle' }),  // Flecha de Asociación
    
      // Multiplicidad en el extremo 'from'
      go.GraphObject.make(go.Panel, "Auto",
        go.GraphObject.make(go.Shape, { fill: 'transparent' }),  // Agregar un shape invisible para evitar el error
        go.GraphObject.make(go.TextBlock, { margin: 3, editable: true },  // Etiqueta editable de multiplicidad
          new go.Binding("text", "fromMultiplicity").makeTwoWay())
      ),
    
      // Multiplicidad en el extremo 'to'
      go.GraphObject.make(go.Panel, "Auto",
        go.GraphObject.make(go.Shape, { fill: 'transparent' }),  // Agregar un shape invisible para evitar el error
        go.GraphObject.make(go.TextBlock, { margin: 3, editable: true },  // Etiqueta editable de multiplicidad
          new go.Binding("text", "toMultiplicity").makeTwoWay())
      ),
    
      go.GraphObject.make(go.Panel, 'Auto',  // Panel para la etiqueta de relación
        go.GraphObject.make(go.Shape, { fill: '#F8F8F8', stroke: 'black' }),  // Forma básica
        go.GraphObject.make(go.TextBlock, { margin: 3, editable: true },
          new go.Binding('text', 'relation').makeTwoWay())  // Etiqueta editable
      )
    ));
    
    // Composición (diamante lleno)
    this.diagram.linkTemplateMap.add("composition", go.GraphObject.make(go.Link,
      {
        routing: go.Link.Orthogonal,
        corner: 10,
        relinkableFrom: true,
        relinkableTo: true,
        reshapable: true,
        resegmentable: true
      },
      go.GraphObject.make(go.Shape, { strokeWidth: 2 }),  // Línea básica
      go.GraphObject.make(go.Shape, { fromArrow: 'Diamond', fill: 'black' }),  // Diamante lleno para composición
    
      // Multiplicidad en el extremo 'from'
      go.GraphObject.make(go.Panel, "Auto",
        go.GraphObject.make(go.Shape, { fill: 'transparent' }),
        go.GraphObject.make(go.TextBlock, { margin: 3, editable: true }, 
          new go.Binding("text", "fromMultiplicity").makeTwoWay())
      ),
    
      // Multiplicidad en el extremo 'to'
      go.GraphObject.make(go.Panel, "Auto",
        go.GraphObject.make(go.Shape, { fill: 'transparent' }),
        go.GraphObject.make(go.TextBlock, { margin: 3, editable: true }, 
          new go.Binding("text", "toMultiplicity").makeTwoWay())
      ),
    
      go.GraphObject.make(go.Panel, 'Auto',
        go.GraphObject.make(go.Shape, { fill: '#F8F8F8', stroke: 'black' }),
        go.GraphObject.make(go.TextBlock, { margin: 3, editable: true },
          new go.Binding('text', 'relation').makeTwoWay())
      )
    ));
    
    // Agregación (diamante vacío)
    this.diagram.linkTemplateMap.add("aggregation", go.GraphObject.make(go.Link,
      {
        routing: go.Link.Orthogonal,
        corner: 10,
        relinkableFrom: true,
        relinkableTo: true,
        reshapable: true,
        resegmentable: true
      },
      go.GraphObject.make(go.Shape, { strokeWidth: 2 }),  // Línea básica
      go.GraphObject.make(go.Shape, { fromArrow: 'Diamond', fill: 'white' }),  // Diamante vacío para agregación
    
      // Multiplicidad en el extremo 'from'
      go.GraphObject.make(go.Panel, "Auto",
        go.GraphObject.make(go.Shape, { fill: 'transparent' }),
        go.GraphObject.make(go.TextBlock, { margin: 3, editable: true }, 
          new go.Binding("text", "fromMultiplicity").makeTwoWay())
      ),
    
      // Multiplicidad en el extremo 'to'
      go.GraphObject.make(go.Panel, "Auto",
        go.GraphObject.make(go.Shape, { fill: 'transparent' }),
        go.GraphObject.make(go.TextBlock, { margin: 3, editable: true }, 
          new go.Binding("text", "toMultiplicity").makeTwoWay())
      ),
    
      go.GraphObject.make(go.Panel, 'Auto',
        go.GraphObject.make(go.Shape, { fill: '#F8F8F8', stroke: 'black' }),
        go.GraphObject.make(go.TextBlock, { margin: 3, editable: true },
          new go.Binding('text', 'relation').makeTwoWay())
      )
    ));

    // Inicializar el modelo con algunas clases de prueba
    this.diagram.model = new go.GraphLinksModel(
      [
        { key: 1, name: 'Clase1', attributes: [{ name: 'atributo1' }], methods: [{ name: 'metodo1' }] },
        { key: 2, name: 'Clase2', attributes: [], methods: [] }
      ],
      []
    );

    // Actualizar la lista de clases disponibles para relacionar
    this.classList = this.diagram.model.nodeDataArray;
  }

  

  // Método para agregar una nueva clase
  addClass() {
    const newClass = {
      key: this.diagram.model.nodeDataArray.length + 1,
      name: 'Nueva Clase',
      attributes: [],
      methods: []
    };
    (this.diagram.model as go.GraphLinksModel).addNodeData(newClass);
    this.classList = this.diagram.model.nodeDataArray; // Actualizar la lista de clases
  }

  // Método para agregar un atributo a la clase seleccionada
  addAttribute() {
    const selectedClass = this.diagram.selection.first(); // Seleccionar la primera clase activa
    if (selectedClass && this.attributeName) {
      const classData = selectedClass.data;
      classData.attributes.push({ name: `${this.methodName} : ${this.attributeReturnType}` });
      this.diagram.model.updateTargetBindings(classData); // Actualizar los enlaces
      this.attributeName = ''; // Limpiar el campo
    }
  }

  // Método para agregar un método a la clase seleccionada
  addMethod() {
    const selectedClass = this.diagram.selection.first(); // Seleccionar la primera clase activa
    if (selectedClass && this.methodName) {
      const classData = selectedClass.data;
      classData.methods.push({ name: `${this.methodName} : ${this.methodReturnType}` });
      this.diagram.model.updateTargetBindings(classData); // Actualizar los enlaces
      this.methodName = ''; // Limpiar el campo
      this.methodReturnType = 'void'; // Resetear el tipo de retorno
    }
  }

  removeMethod(methodName: string) {
    const selectedClass = this.diagram.selection.first(); // Seleccionar la clase activa
    if (selectedClass) {
      const classData = selectedClass.data;
      classData.methods = classData.methods.filter((method: any) => method.name !== methodName);
      this.diagram.model.updateTargetBindings(classData);  // Actualizar los enlaces
    }
  }

  addRelation() {
    if (this.fromClassId && this.toClassId && this.selectedRelationType) {
      const linkData = {
        from: this.fromClassId.toString(),  // Convertimos los IDs a string si no lo son
        to: this.toClassId.toString(),
        relation: this.selectedRelationType,
        category: this.selectedRelationType,
        fromMultiplicity: "1",  // Valor por defecto o permitir que el usuario lo seleccione
        toMultiplicity: "*"      // Valor por defecto o permitir que el usuario lo seleccione
      };
  
      // Agregamos el enlace al modelo
      (this.diagram.model as go.GraphLinksModel).addLinkData(linkData);
      console.log(`Relación de tipo ${this.selectedRelationType} agregada entre ${this.fromClassId} y ${this.toClassId}`);
    } else {
      console.error("Asegúrate de seleccionar ambas clases y un tipo de relación.");
    }
  }
}
