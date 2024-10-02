import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { AccessComponent } from './pages/access/access.component';
import { BoardComponent } from './pages/board/board.component';
import { notAuthenticateGuard } from './guard/not-authenticate.guard';


export const routes: Routes = [
    {
        path: '', redirectTo: 'login', pathMatch: 'full'
    },
    {
        path: '',
        component: LoginComponent
    },
    {
        path: 'access',
        component: AccessComponent,
        canActivate: [notAuthenticateGuard]
    },
    {
        path: 'board/:codigo',
        component: BoardComponent,
        canActivate: [notAuthenticateGuard]
    },

];
