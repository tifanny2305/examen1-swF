import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { SalaComponent } from './layout/sala/sala.component';
import { AccessComponent } from './layout/access/access.component';

export const routes: Routes = [
    {
        path: '', redirectTo: 'login', pathMatch: 'full'
    },
    {
        path: '',
        component: LoginComponent
    },
    {
        path: '',
        component: LayoutComponent,
        children:[
            {
                path: 'access',
                title: 'access',
                component: AccessComponent
            }
        ]
    },


];
