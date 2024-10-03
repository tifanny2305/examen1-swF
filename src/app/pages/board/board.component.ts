import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import * as go from 'gojs';
import { io, Socket } from 'socket.io-client'; 
import { ServerService } from '../../services/server.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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
  attributeReturnType: string = '';  // Tipo de retorno por defecto para atributos

  fromClassId: string | null = null; // Clase de origen
  toClassId: string | null = null; // Clase de destino
  multiplicityFrom: string = ""; // Multiplicidad por defecto origen
  multiplicityTo: string = ""; // Multiplicidad por defecto destino

  classList: any[] = [];  // Lista de clases (nodos) disponibles para seleccionar

  // Aquí es donde se almacenarán los datos dinámicos del backend
  data: {
    nodeDataArray: Array<{
      key: string;
      name: string;
      attributes: Array<{ name: string }>;
      methods: Array<{ name: string }>;
      location: string;
    }>;
    linkDataArray: Array<{
      from: string;
      to: string;
      fromPort: string;
      toPort: string;
      text: string;
      multiplicityFrom: string;
      multiplicityTo: string;
      toArrow: string;
    }>;
  } = { nodeDataArray: [], linkDataArray: [] };

  //PRUEBAS
  //serverService = inject(ServerService)

  constructor(
    private cdr: ChangeDetectorRef, 
    private activatedRoute: ActivatedRoute,
    private serverService: ServerService,
    private httpClient: HttpClient ) {} 
  
  ngAfterViewInit(): void {
    //obtiene el cod de la sala desde el url
    this.roomCode = this.activatedRoute.snapshot.paramMap.get('codigo') || '';

    // Unirse al board y conectar servidor
    this.serverService.connect();
    this.serverService.joinBoard(this.roomCode);

    // Inicializar el diagrama
    this.diagram = new go.Diagram(this.diagramDiv.nativeElement);
    this.initializeDiagram();
    this.cdr.detectChanges();

    //nodeDataArray, linkDataArray
    this.serverService.getDiagramData(this.roomCode).subscribe((diagramData: { nodeDataArray: any[], linkDataArray: any[] }) => {
      // Si no hay datos o están vacíos, inicializamos arrays vacíos.
      const nodeDataArray = diagramData?.nodeDataArray?.length ? 
      diagramData.nodeDataArray.map(node => ({
        key: node.key,
        name: node.name,
        attributes: node.attributes,
        methods: node.methods,
        location: node.location ? node.location : "0 0"
      })) : [];

      const linkDataArray = diagramData?.linkDataArray?.length ? 
      diagramData.linkDataArray.map(link => ({
        from: link.from,
        to: link.to,
        //fromPort: link.fromPort === "0, 0" ? go.Spot.Center : link.fromPort,  
        //toPort: link.toPort === "0, 0" ? go.Spot.Center : link.toPort,        
        fromPort: go.Spot.parse(link.fromPort) || go.Spot.Center, 
        toPort: go.Spot.parse(link.toPort) || go.Spot.Center,
        text: link.text,
        multiplicityFrom: link.multiplicityFrom || "",  
        multiplicityTo: link.multiplicityTo || "",

        toArrow: link.toArrow || ""
      })) : [];
  
      // Actualizamos el modelo del diagrama
      this.diagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
      this.diagram.model = go.Model.fromJson(diagramData);

    });


    // Escuchar cuando un nodo sea movido y enviar la actualización al servidor
    this.diagram.addDiagramListener('SelectionMoved', (e: go.DiagramEvent) => {
      e.subject.each((node: go.Node) => {
        if (node && node.data) {
          const nodeData = node.data;
          const updatedPosition = node.position.toString();

          this.serverService.sendDiagramUpdate({
            roomCode: this.roomCode,
            updateType: 'updateNodePosition',
            data: { 
              key: nodeData.key, 
              location: /*updatedPosition*/ { 
                x: node.position.x, 
                y: node.position.y 
              } 
            }  // Enviar la nueva posición
          });
        }
      });
    });

    // Escuchar actualizaciones del servidor
    this.serverService.onDiagramUpdate().subscribe((update) => {
      const { updateType, data } = update;

      this.diagram.startTransaction('updateFromServer');

      if (updateType === 'addClass') {
        (this.diagram.model as go.GraphLinksModel).addNodeData(data);
        this.updateClassList();

      }else if(updateType === 'updateNodePosition'){ 
        const node = this.diagram.findNodeForKey(data.key);
        if (node) {
          node.position = new go.Point(data.location.x, data.location.y);
          this.diagram.model.setDataProperty(node.data, 'location', `${data.location.x} ${data.location.y}`);
        }

      }else if (updateType === 'updateAttribute') {
        const node = this.diagram.findNodeForKey(data.key);
        if (node) {
          // Aquí nos aseguramos de que la clase reciba el nuevo atributo y lo actualizamos en el cliente
          node.data.attributes.push(data.newAttribute);
          this.diagram.model.updateTargetBindings(node.data);  
        }

      }else if (updateType === 'updateMethod') {
        const node = this.diagram.findNodeForKey(data.key);
        if (node) {
          // Aquí nos aseguramos de que la clase reciba el nuevo atributo y lo actualizamos en el cliente
          node.data.methods.push(data.newMethod);
          this.diagram.model.updateTargetBindings(node.data);  
        }

      }else if (updateType === 'removeAttribute') {
        const node = this.diagram.findNodeForKey(data.key);
        if (node) {
          // Eliminar el atributo de la clase
          node.data.attributes = node.data.attributes.filter((attribute: { name: string }) => attribute.name !== data.attributeName);
          this.diagram.model.updateTargetBindings(node.data);  // Actualizar los enlaces
        }

      }else if (updateType === 'removeMethod') {
        const node = this.diagram.findNodeForKey(data.key);
        if (node) {
          // Eliminar el atributo de la clase
          node.data.methods = node.data.methods.filter((method: { name: string }) => method.name !== data.methodName);
          this.diagram.model.updateTargetBindings(node.data);  // Actualizar los enlaces
        }

      }else if (updateType === 'addLink') {
        // Añadir el enlace al modelo del diagrama
        (this.diagram.model as go.GraphLinksModel).addLinkData(data);

      }else if (updateType === 'addManyToMany') {
        // Añadir la tabla intermedia al modelo
        (this.diagram.model as go.GraphLinksModel).addNodeData(data.intermediateClass);
    
        // Añadir los enlaces desde la clase de origen a la tabla intermedia y de la tabla intermedia a la clase destino
        (this.diagram.model as go.GraphLinksModel).addLinkData(data.fromLink);
        (this.diagram.model as go.GraphLinksModel).addLinkData(data.toLink);
      }

      this.diagram.commitTransaction('updateFromServer');
    });  

  }
  
  makePort(name: string, spot: go.Spot, output: boolean, input: boolean) {
    return go.GraphObject.make(go.Shape, "Circle", {
      fill: "transparent", strokeWidth: 0, width: 8, height: 8,
      alignment: spot, alignmentFocus: spot, portId: name,
      fromSpot: spot, toSpot: spot, fromLinkable: output, toLinkable: input,
      cursor: "pointer"
    });
  }

  //Inicializar el diagrama
  initializeDiagram() {
    this.diagram.nodeTemplate = go.GraphObject.make(
      go.Node, 'Auto',
      go.GraphObject.make(go.Shape, 'RoundedRectangle', 
        { fill: 'lightblue', stroke: 'black', strokeWidth: 1, portId: "" }), 
      go.GraphObject.make(go.Panel, 'Vertical', { margin: 5 }, 
  
        // Nombre de la clase
        go.GraphObject.make(go.TextBlock, {
          font: 'bold 11pt sans-serif',
          margin: new go.Margin(5, 0, 5, 0),
          editable: true
        }, new go.Binding('text', 'name').makeTwoWay()),
  
        go.GraphObject.make(go.Shape, "LineH", { 
          strokeWidth: 1, 
          maxSize: new go.Size(NaN, 10) 
        }),  // Línea horizontal para separar
  
        // Panel para atributos
        go.GraphObject.make(go.Panel, 'Vertical', 
          new go.Binding('itemArray', 'attributes'),
          {
            itemTemplate: go.GraphObject.make(go.Panel, 'Horizontal',
              go.GraphObject.make(go.TextBlock, { 
                margin: new go.Margin(5, 0, 5, 0), 
                editable: true },
                new go.Binding('text', 'name').makeTwoWay())
            )
          }
        ),
  
        go.GraphObject.make(go.Shape, "LineH", { 
          strokeWidth: 1, 
          maxSize: new go.Size(NaN, 10) 
        }),// Otra línea horizontal
  
        // Panel para métodos
        go.GraphObject.make(go.Panel, 'Vertical', 
          new go.Binding('itemArray', 'methods'),
          {
            itemTemplate: go.GraphObject.make(go.Panel, 'Horizontal',
              go.GraphObject.make(go.TextBlock, { 
                margin: new go.Margin(5, 0, 5, 0), 
                editable: true },
                new go.Binding('text', 'name').makeTwoWay())
            )
          }
        )
      ),

      // Añadir puertos en el nodo (Top, Left, Right, Bottom)
      this.makePort('T', go.Spot.Top, true, true),   // Puerto superior
      this.makePort('L', go.Spot.Left, true, true),  // Puerto izquierdo
      this.makePort('R', go.Spot.Right, true, true), // Puerto derecho
      this.makePort('B', go.Spot.Bottom, true, true) // Puerto inferior
     
    );

    // Configurar el template de los enlaces
    this.diagram.linkTemplate = go.GraphObject.make(
      go.Link,      
      //go.GraphObject.make(go.Shape, { stroke: 'black'}), // Línea del enlace
      
      go.GraphObject.make(go.Shape, 
        new go.Binding("stroke", "stroke"),   
        new go.Binding("strokeDashArray", "strokeDashArray"),
      ), 

      go.GraphObject.make(go.Shape, 
        new go.Binding("toArrow", "toArrow"),
        new go.Binding("fill", "fill")
      ),
      
      // TextBlock para el texto en el enlace
      go.GraphObject.make(go.TextBlock, { 
        segmentIndex: 0, 
        segmentOffset: new go.Point(NaN, NaN), 
        editable: true,
        segmentOrientation: go.Orientation.Upright  }, 
        new go.Binding("text", "multiplicityFrom")
      ),

      go.GraphObject.make(go.TextBlock, { 
        segmentIndex: 0, 
        segmentFraction: 0.5, 
        editable: true }, 
        new go.Binding("text", "text")
      ),

      go.GraphObject.make(go.TextBlock, { 
        segmentIndex: -1, 
        segmentOffset: new go.Point(NaN, NaN), 
        editable: true,
        segmentOrientation: go.Orientation.Upright  }, 
        new go.Binding("text", "multiplicityTo")
      ),

      //new go.Binding("fromSpot", "fromPort"),  // Binding para el puerto de origen
      //new go.Binding("toSpot", "toPort")       // Binding para el puerto de destino
    );
    

    function getNodePositionFromXMI(geometryString: string): string {
      const leftMatch = geometryString.match(/Left=(\d+)/);
      const topMatch = geometryString.match(/Top=(\d+)/);
    
      const left = leftMatch ? parseFloat(leftMatch[1]) : 0;
      const top = topMatch ? parseFloat(topMatch[1]) : 0;
    
      return `${left} ${top}`;
    }
  
    // Inicializar el modelo con algunas clases de prueba
    /*const initialClasses = [
      { key: 1, name: 'Clase1', attributes: [{ name: 'atributo1' }], methods: [{ name: 'metodo1' }], location: '100 100' },
      { key: 2, name: 'Clase2', attributes: [], methods: [], location: '300 100' }
    ];*/

    // Modelo inicial sin enlaces
    //this.diagram.model = new go.GraphLinksModel(initialClasses, []);
    //this.classList = initialClasses;
  
    //console.log('Clases disponibles:', this.classList);
    // Agregar listener para capturar los enlaces creados

    this.diagram.addDiagramListener("LinkDrawn", (e) => {
      const link = e.subject;
      const fromPort = link.fromPort;
      const toPort = link.toPort;

      if (!fromPort || !toPort) {
        console.error("No se encontraron las clases de origen o destino.");
        return;
      }

      const fromPortPos = fromPort.getDocumentPoint(go.Spot.Center);
      const toPortPos = toPort.getDocumentPoint(go.Spot.Center);

      const linkData = {
        from: link.data.key,                            // ID de la clase origen
        to: link.data.key,                              // ID de la clase destino
        fromPort: `${fromPortPos.x},${fromPortPos.y}`,  // Posición del puerto origen
        toPort: `${toPortPos.x},${toPortPos.y}`,        // Posición del puerto destino
        routing: go.Routing.Orthogonal,                 // Tipo de ruta
        text: link.data.text,                           // Nombre de la relación
        multiplicityFrom: this.multiplicityFrom || "1", // Multiplicidad del origen
        multiplicityTo: this.multiplicityTo || "1",     // Multiplicidad del destino
        toArrow: link.data.toArrow,                     // Flecha del enlace
        relationType: link.data.relationType,           // Tipo de relación
      };

      const model = this.diagram.model as go.GraphLinksModel;
      model.addLinkData(linkData);

      // Actualizar el modelo del enlace con los datos de los puertos
      this.diagram.model.set(link.data, "fromPort", `${fromPortPos.x},${fromPortPos.y}`);
      this.diagram.model.set(link.data, "toPort", `${toPortPos.x},${toPortPos.y}`);

    });
  }

  // Método para agregar una nueva clase
  addClass() {
    const newClass = {
      key: this.diagram.model.nodeDataArray.length + 1,
      name: 'Nueva Clase',
      attributes: [],
      methods: [],
      location: '100,100'
    };

    (this.diagram.model as go.GraphLinksModel).addNodeData(newClass);

    this.serverService.sendDiagramUpdate({
      roomCode: this.roomCode,
      updateType: 'addClass',  // Indicar la acción realizada
      data: newClass           // Los datos de la nueva clase
    });

    this.updateClassList();
    
  }

  // Actualizar la lista de clases en el select
  updateClassList() {
    this.classList = this.diagram.model.nodeDataArray.map(node => {
      return { key: node['key'], name: node['name'] };
    });
  }

  //Agregar atributos
  addAttribute() {
    const selectedClass = this.diagram.selection.first();
    if (selectedClass && this.attributeName) {
      const classData = selectedClass.data;
      const newAttribute = { name: `${this.attributeName} : ${this.attributeReturnType}` };
      
      classData.attributes.push(newAttribute);
      this.diagram.model.updateTargetBindings(classData); // Actualizar los enlaces

      // Emitir la actualización del atributo al servidor
      this.serverService.sendDiagramUpdate({
        roomCode: this.roomCode,
        updateType: 'updateAttribute',
        data: { key: classData.key, newAttribute: newAttribute }  // Enviar la clave de la clase y el nuevo atributo
      });

      this.attributeName = ''; // Limpiar el campo
    }
  }

  //Agregar metodos
  addMethod() {
    const selectedClass = this.diagram.selection.first();
    if (selectedClass && this.methodName) {
      const classData = selectedClass.data;
      const newMethod = { name: `${this.methodName} : ${this.methodReturnType}` };

      classData.methods.push(newMethod);
      this.diagram.model.updateTargetBindings(classData); // Actualizar los enlaces

      // Emitir la actualización del atributo al servidor
      this.serverService.sendDiagramUpdate({
        roomCode: this.roomCode,
        updateType: 'updateMethod',
        data: { key: classData.key, newMethod: newMethod }  // Enviar la clave de la clase y el nuevo atributo
      });

      this.methodName = ''; // Limpiar el campo
    }
  }

  //Eliminar atributo
  removeAttribute(attributeName: string) {
    const selectedClass = this.diagram.selection.first();
    if (selectedClass) {
      const classData = selectedClass.data;

      classData.attributes = classData.attributes.filter((attribute: any) => attribute.name !== attributeName);
      this.diagram.model.updateTargetBindings(classData); // Actualizar los enlaces 

      this.serverService.sendDiagramUpdate({
        roomCode: this.roomCode,
        updateType: 'removeAttribute',  // Indicar que es una eliminación de atributo
        data: { key: classData.key, attributeName: attributeName }  // Enviar la clave de la clase y el nombre del atributo a eliminar
      });

      this.selectedAttribute = '';
    }
  }

  //Eliminar metodo
  removeMethod(methodName: string) {
    const selectedClass = this.diagram.selection.first();
    if (selectedClass) {
      const classData = selectedClass.data;
      
      classData.methods = classData.methods.filter((method: any) => method.name !== methodName);
      this.diagram.model.updateTargetBindings(classData);

      this.serverService.sendDiagramUpdate({
        roomCode: this.roomCode,
        updateType: 'removeMethod',  // Indicar que es una eliminación de atributo
        data: { key: classData.key, methodName: methodName }  // Enviar la clave de la clase y el nombre del atributo a eliminar
      });

      this.selectedMethod = '';
    }
  }

  //Asociacion
  createAssociation(fromClassId: string | null, toClassId: string | null, multiplicityFrom: string, multiplicityTo: string): void {

    console.log('From Class ID:', fromClassId);
    console.log('To Class ID:', toClassId);

    
    if (fromClassId && toClassId) {
      const fromNode = this.diagram.findNodeForKey(Number(fromClassId)); 
      const toNode = this.diagram.findNodeForKey(Number(toClassId)); 
  
      if (fromNode && toNode) {
       
        const fromPortPos = fromNode.findPort("T").getDocumentPoint(go.Spot.Center); // Por ejemplo, usas el puerto 'T' para Top
        const toPortPos = toNode.findPort("B").getDocumentPoint(go.Spot.Center); // Por ejemplo, usas el puerto 'B' para Bottom
  
        const linkData = {
          from: Number(fromClassId),
          to: Number(toClassId),
          fromPort: `${fromPortPos.x},${fromPortPos.y}`,
          toPort: `${toPortPos.x},${toPortPos.y}`,
          routing: go.Routing.Orthogonal,
          text: "text",
          multiplicityFrom: multiplicityFrom || "",
          multiplicityTo: multiplicityTo || "",
          toArrow: "", // Puedes asignar un valor por defecto o dejarlo vacío
          relationType: "Association",
        };

      const model = this.diagram.model as go.GraphLinksModel;
      try {
        model.addLinkData(linkData);
        console.log('Enlace creado:', model.linkDataArray);

        // Emitir la relación 
        this.serverService.sendDiagramUpdate({
          roomCode: this.roomCode,
          updateType: 'addLink',  // Indicar que es una adición de enlace
          data: linkData          // Enviar los datos del enlace
        });

      } catch (error) {
        console.error('Error al agregar el enlace:', error);
      }
    } else {
      console.error('No se encontraron los nodos de origen o destino.');
    }
  } else {
    alert('Por favor, seleccione las clases de origen y destino.');
  }
  }

  //Asociacion Directa
  createAssociationDirect(fromClassId: string | null, toClassId: string | null, multiplicityFrom: string, multiplicityTo: string): void {

    console.log('From Class ID:', fromClassId);
    console.log('To Class ID:', toClassId);

    
    if (fromClassId && toClassId) {
      const linkData = {
        from: Number(fromClassId),
        to: Number(toClassId),
        routing: go.Routing.Orthogonal,
        text: "text",
        multiplicityFrom: multiplicityFrom || "",
        multiplicityTo: multiplicityTo || "" ,
        toArrow: "OpenTriangle",
        stroke: "black",
        relationType: "AssociationDirect" 
      };

      const model = this.diagram.model as go.GraphLinksModel;

      try {
        model.addLinkData(linkData);
        console.log('Enlace creado:', model.linkDataArray);

        // Emitir la relación 
        this.serverService.sendDiagramUpdate({
          roomCode: this.roomCode,
          updateType: 'addLink',  // Indicar que es una adición de enlace
          data: linkData          // Enviar los datos del enlace
        });

      } catch (error) {
        console.error('Error al agregar el enlace:', error);
      }
 
      
    } else {
      alert('Por favor, seleccione las clases de origen y destino.');
    }
  }

  //Generalizacion
  createGeneralization(fromClassId: string | null, toClassId: string | null, multiplicityFrom: string, multiplicityTo: string): void {

    console.log('From Class ID:', fromClassId);
    console.log('To Class ID:', toClassId);

    
    if (fromClassId && toClassId) {
      const linkData = {
        from: Number(fromClassId),
        to: Number(toClassId),
        routing: go.Routing.Orthogonal,
        text: "text",
        multiplicityFrom: multiplicityFrom || "",
        multiplicityTo: multiplicityTo || "" ,
        toArrow: "RoundedTriangle",
        stroke: "black",
        fill: "transparent",
        relationType: "Generalization"
      };

      const model = this.diagram.model as go.GraphLinksModel;

      try {
        model.addLinkData(linkData);
        console.log('Enlace creado:', model.linkDataArray);

        // Emitir la relación 
        this.serverService.sendDiagramUpdate({
          roomCode: this.roomCode,
          updateType: 'addLink',  // Indicar que es una adición de enlace
          data: linkData          // Enviar los datos del enlace
        });

      } catch (error) {
        console.error('Error al agregar el enlace:', error);
      }
 
      
    } else {
      alert('Por favor, seleccione las clases de origen y destino.');
    }
  }

  //Agregacion
  createAggregation(fromClassId: string | null, toClassId: string | null, multiplicityFrom: string, multiplicityTo: string): void {

    console.log('From Class ID:', fromClassId);
    console.log('To Class ID:', toClassId);

    
    if (fromClassId && toClassId) {
      const linkData = {
        from: Number(fromClassId),
        to: Number(toClassId),
        routing: go.Routing.Orthogonal,
        text: "text",
        multiplicityFrom: multiplicityFrom || "",
        multiplicityTo: multiplicityTo || "" ,
        toArrow: "StretchedDiamond",
        fill: "transparent",
        stroke: "black",
        relationType: "Agregation" 
      };

      const model = this.diagram.model as go.GraphLinksModel;

      try {
        model.addLinkData(linkData);
        console.log('Enlace creado:', model.linkDataArray);

        // Emitir la relación 
        this.serverService.sendDiagramUpdate({
          roomCode: this.roomCode,
          updateType: 'addLink',  // Indicar que es una adición de enlace
          data: linkData          // Enviar los datos del enlace
        });

      } catch (error) {
        console.error('Error al agregar el enlace:', error);
      }
 
      
    } else {
      alert('Por favor, seleccione las clases de origen y destino.');
    }
  }

  //Composicion
  createComposition(fromClassId: string | null, toClassId: string | null, multiplicityFrom: string, multiplicityTo: string): void {

    console.log('From Class ID:', fromClassId);
    console.log('To Class ID:', toClassId);

    
    if (fromClassId && toClassId) {
      const linkData = {
        from: Number(fromClassId),
        to: Number(toClassId),
        routing: go.Routing.Orthogonal,
        text: "text",
        multiplicityFrom: multiplicityFrom || "",
        multiplicityTo: multiplicityTo || "" ,
        toArrow: "StretchedDiamond",
        stroke: "black",
        relationType: "Composition" 
      };

      const model = this.diagram.model as go.GraphLinksModel;

      try {
        model.addLinkData(linkData);
        console.log('Enlace creado:', model.linkDataArray);

        // Emitir la relación 
        this.serverService.sendDiagramUpdate({
          roomCode: this.roomCode,
          updateType: 'addLink',  // Indicar que es una adición de enlace
          data: linkData          // Enviar los datos del enlace
        });

      } catch (error) {
        console.error('Error al agregar el enlace:', error);
      }
 
      
    } else {
      alert('Por favor, seleccione las clases de origen y destino.');
    }
  }

  //Dependencia
  createDependency(fromClassId: string | null, toClassId: string | null, multiplicityFrom: string, multiplicityTo: string): void {

    console.log('From Class ID:', fromClassId);
    console.log('To Class ID:', toClassId);

    
    if (fromClassId && toClassId) {
      const linkData = {
        from: Number(fromClassId),
        to: Number(toClassId),
        routing: go.Routing.Orthogonal,
        text: "text",
        multiplicityFrom: multiplicityFrom || "",
        multiplicityTo: multiplicityTo || "" ,
        toArrow: "OpenTriangle",
        stroke: "black",
        strokeDashArray: [4, 2],
        relationType: "Dependency" 
      };

      const model = this.diagram.model as go.GraphLinksModel;

      try {
        model.addLinkData(linkData);
        console.log('Enlace creado:', model.linkDataArray);

        // Emitir la relación 
        this.serverService.sendDiagramUpdate({
          roomCode: this.roomCode,
          updateType: 'addLink',  // Indicar que es una adición de enlace
          data: linkData          // Enviar los datos del enlace
        });

      } catch (error) {
        console.error('Error al agregar el enlace:', error);
      }
 
      
    } else {
      alert('Por favor, seleccione las clases de origen y destino.');
    }
  }

  //Recursividad
  createRecursion(fromClassId: string | null, toClassId: string | null, multiplicityFrom: string, multiplicityTo: string): void {

    console.log('From Class ID:', fromClassId);
    console.log('To Class ID:', toClassId);

    
    if (fromClassId && toClassId) {
      const linkData = {
        from: Number(fromClassId),
        to: Number(fromClassId),
        routing: go.Routing.Orthogonal,
        text: "text",
        multiplicityFrom: multiplicityFrom || "",
        multiplicityTo: multiplicityTo || "" ,
        toArrow: "Standard",
        stroke: "black",
        relationType: "Association" 
      };

      const model = this.diagram.model as go.GraphLinksModel;

      try {
        model.addLinkData(linkData);
        console.log('Enlace creado:', model.linkDataArray);

        // Emitir la relación 
        this.serverService.sendDiagramUpdate({
          roomCode: this.roomCode,
          updateType: 'addLink',  // Indicar que es una adición de enlace
          data: linkData          // Enviar los datos del enlace
        });

      } catch (error) {
        console.error('Error al agregar el enlace:', error);
      }
 
      
    } else {
      alert('Por favor, seleccione las clases de origen y destino.');
    }
  }

  //Muchos a Muchos
  createManyToMany(fromClassId: string | null, toClassId: string | null, multiplicityFrom: string, multiplicityTo: string): void {

    console.log('From Class ID:', fromClassId);
    console.log('To Class ID:', toClassId);

    if (fromClassId && toClassId) {
      const model = this.diagram.model as go.GraphLinksModel;

      // Crear la tabla intermedia
      const intermediateClass = {
          key: model.nodeDataArray.length + 1,
          name: 'TablaIntermedia',  
          attributes: [],  
          methods: [], 
      };

      // Añadir el nodo intermedio al modelo
      model.addNodeData(intermediateClass);

      // Crear el enlace desde la clase de origen a la tabla intermedia
      const fromIntermediateLinkData = {
          from: Number(fromClassId),  // Desde la clase de origen
          to: intermediateClass.key,    // A la tabla intermedia
          routing: go.Routing.Orthogonal,
          text: "",
          toArrow: "",  // Flecha estándar hacia la tabla intermedia
      };

      // Añadir el enlace desde la clase de origen a la tabla intermedia
      model.addLinkData(fromIntermediateLinkData);

      // Crear el enlace desde la tabla intermedia a la clase de destino
      const toIntermediateLinkData = {
          from: Number(toClassId),          // Desde la tabla destino
          to: intermediateClass.key,       // A la clase intermedia
          routing: go.Routing.Orthogonal,
          text: "",
          toArrow: "",  // Flecha estándar desde la tabla intermedia
      };

      // Añadir el enlace desde la tabla intermedia a la clase de destino
      model.addLinkData(toIntermediateLinkData);

      // Emitir la información al servidor 
      this.serverService.sendDiagramUpdate({
        roomCode: this.roomCode,
        updateType: 'addManyToMany',
        data: {
          intermediateClass: intermediateClass,
          fromLink: fromIntermediateLinkData,
          toLink: toIntermediateLinkData
        }
      });

    } else {
      alert('Por favor, seleccione las clases de origen y destino.');
    }
  }

  //De JSON a XML
  exportDiagram(): void {
    // Convertir el modelo de GoJS a JSON
    const diagramJson = this.diagram.model.toJson();
    const positions: string[] = [];
    // Parsear el JSON para modificarlo
    const jsonData = JSON.parse(diagramJson);

    // Obtener las posiciones de cada nodo (clase) y agregarlo al JSON
    jsonData.nodeDataArray.forEach((node: any) => {
      const nodeObject = this.diagram.findNodeForKey(node.key); // Buscar el nodo por su key
      if (nodeObject) {
        const loc = nodeObject.location; // Obtener la posición del nodo
        node.location = `${loc.x},${loc.y}`; // Guardar la posición en formato "x,y"
        positions.push(node.location);
      }

      // Agregar atributos y métodos vacíos si no existen
      if (!node.attributes) {
        node.attributes = [];
      }

      if (!node.methods) {
        node.methods = [];
      }
  });

    console.log('Posiciones de todas las clases:', positions);
    // Convertir nuevamente a JSON con las posiciones incluidas
    const updatedDiagramData = JSON.stringify(jsonData);
    const token = localStorage.getItem('token');
    
    // Enviar el JSON al backend para convertirlo en XML o XMI
    this.httpClient.post('https://examen1-swb-production.up.railway.app/api/board/export', 
      { diagram: updatedDiagramData }, 
      {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob' // Recibir la respuesta como archivo blob
      }
    ).subscribe((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.xmi'; // Nombre del archivo exportado
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }  

  // Función para manejar la carga del archivo XMI y enviarlo al backend
  importDiagram(event: any): void {
    const file = event.target.files[0]; // Obtener el archivo seleccionado
    if (!file) {
      console.error('No se ha seleccionado ningún archivo.');
      return;
    }
  
    const formData = new FormData();
    formData.append('file', file); 
    console.log('Enviando archivo:', file);
  
    const token = localStorage.getItem('token'); // Obtén el token almacenado
  
    this.httpClient.post(
      'https://examen1-swb-production.up.railway.app/api/board/import',
      formData, 
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'enctype': 'multipart/form-data' // Encabezado necesario para enviar archivos
        }
      }
    ).subscribe(
      (response: any) => {
        console.log('Diagrama importado:', response);
        this.loadDiagram(response.nodeDataArray, response.linkDataArray);
      },
      (error) => {
        console.error('Error al importar el diagrama:', error);
      }
    );
  }
  
  // Función para cargar y visualizar el diagrama
  loadDiagram(classes: any[], relationships: any[]): void {
    const diagram = this.diagram;
    const $ = go.GraphObject.make;
    
    // Crear el modelo con clases (nodos) y relaciones (enlaces)
    const nodeDataArray = classes.map(cls => ({
      key: cls.key,
      name: cls.name,
      attributes: cls.attributes || [], // Asegúrate de que esté vacío si no hay atributos
      methods: cls.methods || [] // Asegúrate de que esté vacío si no hay métodos
    }));

    const linkDataArray = relationships.map(rel => ({
      from: rel.from,
      to: rel.to,
      text: rel.text || 'Association' // Ajusta según el tipo de relación
    }));

    // Establecer el modelo en GoJS
    this.diagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
    this.diagram.rebuildParts();
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput.click();
  }  
}
