import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import * as go from 'gojs';
import { io, Socket } from 'socket.io-client'; 
import { ServerService } from '../../services/server.service';

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
  private roomCode!: string;

  attributeName: string = ''; // Nombre del atributo select
  methodName: string = ''; // Nombre del método select
  selectedAttribute: string = ''; //Nombre del atributoDelete select
  selectedMethod: string = ''; //Nombre del metodoDelete select

  methodReturnType: string = 'void'; // Tipo de retorno por defecto para métodos
  attributeReturnType: string = 'void'; 

  selectedRelationType: string = 'association'; // Tipo de relación seleccionado
  fromClassId: string | null = null; // Clase de origen seleccionada
  toClassId: string | null = null;   // Clase de destino seleccionada
  classList: any[] = [];  // Lista de clases (nodos) disponibles para seleccionar

  //PRUEBAS
  //serverService = inject(ServerService)

  constructor(
    private cdr: ChangeDetectorRef, 
    private activatedRoute: ActivatedRoute,
    private serverService: ServerService) {} 


  
  ngAfterViewInit(): void {
    //obtiene el cod de la sala desde el url
    this.roomCode = this.activatedRoute.snapshot.paramMap.get('codigo') || '';
    // Unirse al board (pizarra)
    //this.serverService.connect();
    this.serverService.joinBoard(this.roomCode);

    this.diagram = new go.Diagram(this.diagramDiv.nativeElement);
    this.initializeDiagram();
    this.cdr.detectChanges();

    // Escuchar cambios en el modelo de GoJS
    this.diagram.addModelChangedListener((event) => {
      if (event.isTransactionFinished) {
        // Capturamos todos los cambios del diagrama
        const modelChanges = this.diagram.model.toJson();
      
      // Enviamos los cambios al servidor
      this.serverService.sendDiagramUpdate({
        roomCode: this.roomCode, 
        diagramData: modelChanges
      });
    }
    });

    // Escuchar las actualizaciones del diagrama desde el servidor
    this.serverService.onDiagramUpdate().subscribe(data => {
      this.updateDiagramFromSocket(data);
      this.cdr.detectChanges();
    });
  }
  
  //Inicializar el diagrama
  initializeDiagram() {
    this.diagram.nodeTemplate = go.GraphObject.make(
      go.Node, 'Auto',
      go.GraphObject.make(go.Shape, 'RoundedRectangle', 
        { fill: 'lightblue', stroke: 'black', strokeWidth: 1, portId: "" }), 
      go.GraphObject.make(
        go.Panel, 'Vertical', { margin: 5
         }, 
        go.GraphObject.make(

          // Nombre de la clase
          go.TextBlock,  
          {
            font: 'bold 11pt sans-serif',
            margin: new go.Margin(5, 0, 5, 0),  
            editable: true      
          },
          new go.Binding('text', 'name').makeTwoWay()),
    
        go.GraphObject.make(go.Shape, "LineH", { strokeWidth: 1,maxSize: new go.Size(NaN, 10) }),  // Línea horizontal
    
        go.GraphObject.make(go.Panel, 'Vertical',  // Panel para los atributos
          new go.Binding('itemArray', 'attributes'),
          {
            itemTemplate: go.GraphObject.make(go.Panel, 'Horizontal',
              go.GraphObject.make(go.TextBlock, { margin: new go.Margin(5, 0, 5, 0), editable: true },
                new go.Binding('text', 'name').makeTwoWay())
            )
          }
        ),
    
        go.GraphObject.make(go.Shape, "LineH", { strokeWidth: 1, maxSize: new go.Size(NaN, 10) }),  // Otra línea horizontal
    
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

    // Inicializar el modelo con algunas clases de prueba
    this.diagram.model = new go.GraphLinksModel(
      [
        { key: 1, name: 'Clase1', attributes: [{ name: 'atributo1' }], methods: [{ name: 'metodo1' }] },
        { key: 2, name: 'Clase2', attributes: [], methods: [] }
      ],
      []
    );
  }

  // Método para actualizar el diagrama cuando recibimos datos de otros usuarios
  updateDiagramFromSocket(diagramData: string): void {
    this.diagram.model = go.Model.fromJson(diagramData);
    this.cdr.detectChanges();  
  }

  // Enviar actualizaciones del diagrama cuando se hagan cambios
  sendDiagramUpdate(): void {
    /*const model = this.diagram.model as go.GraphLinksModel;
    const data = {
      nodeDataArray: model.nodeDataArray.slice(),
      linkDataArray: model.linkDataArray.slice()
    };
    this.serverService.sendDiagramUpdate({ codigo: this.roomCode, ...data });*/

    const diagramJson = this.diagram.model.toJson(); // Convertir el modelo a JSON
  
    this.serverService.sendDiagramUpdate({
      roomCode: this.roomCode,
      diagramJson // Enviar el JSON del diagrama
  });

  console.log('Enviando actualización del diagrama:', diagramJson);
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
    this.sendDiagramUpdate();
  }

  //Agregar atributos
  addAttribute() {
    const selectedClass = this.diagram.selection.first();
    if (selectedClass && this.attributeName) {
      const classData = selectedClass.data;
      classData.attributes.push({ name: `${this.attributeName} : ${this.attributeReturnType}` });
      this.diagram.model.updateTargetBindings(classData); // Actualizar los enlaces
      this.attributeName = ''; // Limpiar el campo
    }
  }

  //Agregar metodos
  addMethod() {
    const selectedClass = this.diagram.selection.first();
    if (selectedClass && this.methodName) {
      const classData = selectedClass.data;
      classData.methods.push({ name: `${this.methodName} : ${this.methodReturnType}` });
      this.diagram.model.updateTargetBindings(classData); // Actualizar los enlaces
      this.methodName = ''; // Limpiar el campo
    }
  }

  //Eliminar atributo
  removeAttribute(attributeName: string) {
    const selectedClass = this.diagram.selection.first();
    if (selectedClass) {
      const classData = selectedClass.data;
      classData.attributes = classData.attributes.filter((attribute: any) => attribute.name !== attributeName);
      // Actualizar los enlaces 
      this.diagram.model.updateTargetBindings(classData);
      this.selectedAttribute = '';
    }
  }

  //Eliminar metodo
  removeMethod(methodName: string) {
    const selectedClass = this.diagram.selection.first();
    if (selectedClass) {
      const classData = selectedClass.data;
      classData.methods = classData.methods.filter((method: any) => method.name !== methodName);
      // Actualizar los enlaces 
      this.diagram.model.updateTargetBindings(classData);
      this.selectedMethod = '';
    }
  }

  

}
