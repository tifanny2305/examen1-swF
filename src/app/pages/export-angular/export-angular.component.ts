import { Component, Injectable } from '@angular/core';
import JSZip from 'jszip';
import * as FileSaver from 'file-saver';

@Injectable({
  providedIn: 'root'
})

@Component({
  selector: 'app-export-angular',
  standalone: true,
  imports: [],
  templateUrl: './export-angular.component.html',
  styleUrl: './export-angular.component.css'
})

export class ExportAngularComponent 
{
  /*async exportToZip(components: any[], projectName: string) {
    const zip = new JSZip();
    const appFolder = zip.folder(projectName);
    const srcFolder = appFolder.folder('src');
    const appSrcFolder = srcFolder.folder('app');

    // 1. Exportar componentes
    const componentsFolder = appSrcFolder.folder('components');
    components.forEach(comp => {
      const compFolder = componentsFolder.folder(comp.name);
      compFolder.file(`${comp.name}.component.ts`, this.generateComponentTS(comp));
      compFolder.file(`${comp.name}.component.html`, this.generateComponentHTML(comp));
      compFolder.file(`${comp.name}.component.css`, this.generateComponentCSS(comp));
    });

    // 2. Exportar módulo principal
    appSrcFolder.file('app.module.ts', this.generateAppModule(components));

    // 3. Generar archivo ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    FileSaver.saveAs(content, `${projectName}.zip`);
  }

  private generateComponentTS(component: any): string {
    return `import { Component } from '@angular/core';
  }
*/
}
