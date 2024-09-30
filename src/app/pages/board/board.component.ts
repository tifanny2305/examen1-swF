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
    {
      routing: go.Link.Orthogonal,  // Esto asegura que las líneas sean ortogonales
      corner: 5,  // Bordes redondeados
      relinkableFrom: true,
      relinkableTo: true,
      reshapable: true,  // Permite modificar la forma del enlace
      resegmentable: true  // Permite ajustar los segmentos del enlace
    },
    go.GraphObject.make(go.Shape, { stroke: 'black', strokeWidth: 1 }), // Línea del enlace
    
    // Flecha destino y su relleno
    go.GraphObject.make(go.Shape, 
      new go.Binding("toArrow", "toArrow"),
      new go.Binding("fill", "fill")), 
    
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
    )
  );
  
    // Inicializar el modelo con algunas clases de prueba
    /*const initialClasses = [
      { key: 1, name: 'Clase1', attributes: [{ name: 'atributo1' }], methods: [{ name: 'metodo1' }], location: '100 100' },
      { key: 2, name: 'Clase2', attributes: [], methods: [], location: '300 100' }
    ];*/

    // Modelo inicial sin enlaces
    //this.diagram.model = new go.GraphLinksModel(initialClasses, []);
    this.diagram.model = new go.GraphLinksModel();
    //this.classList = initialClasses;
  
    //console.log('Clases disponibles:', this.classList);
    // Agregar listener para capturar los enlaces creados

  this.diagram.addDiagramListener("LinkDrawn", (e) => {
    const link = e.subject;
    const fromPort = link.fromPort;
    const toPort = link.toPort;

    // Obtener las coordenadas de los puertos
    const fromPortPos = fromPort.getDocumentPoint(go.Spot.Center);
    const toPortPos = toPort.getDocumentPoint(go.Spot.Center);

    const linkData = {
      from: Number(this.fromClassId),  // ID de la clase origen
      to: Number(this.toClassId),      // ID de la clase destino
      fromPort: `${fromPortPos.x},${fromPortPos.y}`,  // Posición del puerto origen
      toPort: `${toPortPos.x},${toPortPos.y}`,        // Posición del puerto destino
      routing: go.Routing.Orthogonal,  // Tipo de ruta
      text: "tiene",                  // Nombre de la relación
      multiplicityFrom: this.multiplicityFrom || "1",  // Multiplicidad del origen
      multiplicityTo: this.multiplicityTo || "1",      // Multiplicidad del destino
      toArrow: "OpenTriangle",  // Flecha del enlace (puedes cambiarlo según el tipo de relación)
      relationType: ""  // Tipo de relación
    };

    // Actualizar el modelo del enlace con los datos de los puertos
    this.diagram.model.set(link.data, "fromPort", linkData.fromPort);
    this.diagram.model.set(link.data, "toPort", linkData.toPort);
  });
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

    //const diagramJson = this.diagram.model.toJson(); // Convertir el modelo a JSON
  
    /*this.serverService.sendDiagramUpdate({
      roomCode: this.roomCode,
      diagramJson // Enviar el JSON del diagrama
    });

    console.log('Enviando actualización del diagrama:', diagramJson);*/
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
          relationType: "Association"
        };

      const model = this.diagram.model as go.GraphLinksModel;
      try {
        model.addLinkData(linkData);
        this.sendDiagramUpdate(); // Enviar al servidor
        console.log('Enlace creado:', model.linkDataArray);
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
        relationType: "Association" 
      };

      const model = this.diagram.model as go.GraphLinksModel;

      try {
        model.addLinkData(linkData);
        this.sendDiagramUpdate(); // Enviar al servidor
        console.log('Enlace creado:', model.linkDataArray);
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
        fill: "transparent",
        relationType: "Generalization"
      };

      const model = this.diagram.model as go.GraphLinksModel;

      try {
        model.addLinkData(linkData);
        this.sendDiagramUpdate(); // Enviar al servidor
        console.log('Enlace creado:', model.linkDataArray);
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
        relationType: "Agregation" 
      };

      const model = this.diagram.model as go.GraphLinksModel;

      try {
        model.addLinkData(linkData);
        this.sendDiagramUpdate(); // Enviar al servidor
        console.log('Enlace creado:', model.linkDataArray);
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
        relationType: "Composition" 
      };

      const model = this.diagram.model as go.GraphLinksModel;

      try {
        model.addLinkData(linkData);
        this.sendDiagramUpdate(); // Enviar al servidor
        console.log('Enlace creado:', model.linkDataArray);
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
        relationType: "Association" 
      };

      const model = this.diagram.model as go.GraphLinksModel;

      try {
        model.addLinkData(linkData);
        this.sendDiagramUpdate(); // Enviar al servidor
        console.log('Enlace creado:', model.linkDataArray);
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
  
      //Crear el enlace principal entre las clases de origen y destino
      const mainLinkData = {
        from: Number(fromClassId),
        to: Number(toClassId),
        routing: go.Routing.Orthogonal,
        text: "",
        toArrow: "",
      };
  
      // Añadir el enlace principal
      model.addLinkData(mainLinkData);
      const lastLink = model.linkDataArray[model.linkDataArray.length - 1];

      //Clase Intermedia
      const intermediateClass = {
        key: model.nodeDataArray.length + 1,
        name: 'TablaIntermedia',  
        attributes: [],  
        methods: [], 
        loc: "250 150"  // Posición inicial del nodo intermedio
      }
  
      //Añadir el nodo intermedio al modelo
      model.addNodeData(intermediateClass);    

      /*//Crear un enlace punteado desde el puerto en el centro del enlace principal hasta la tabla intermedia
      const midPointLinkData = {
        from: mainLinkData,  // Enlaza desde el puerto en el centro del enlace
        fromPort: "midPoint",  // Puerto en el centro del enlace principal
        to: intermediateClass.key,  // Tabla intermedia
        routing: go.Routing.Orthogonal,
        text: ""
      };

      // ñadir el enlace punteado entre el puerto central del enlace y la tabla intermedia
      model.addLinkData(midPointLinkData);*/

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
    this.httpClient.post('http://localhost:3000/api/board/export', 
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
      'http://localhost:3000/api/board/import',
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
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput.click();
  }
  
}
