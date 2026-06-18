import { Routes } from '@angular/router'
import { authGuard } from './guards/auth.guard'
import { LoginComponent } from './pages/login/login.component'
import { ChatComponent } from './pages/chat/chat.component'
import { ShowcaseComponent } from './pages/showcase/showcase.component'

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'showcase', component: ShowcaseComponent },
  { path: '', component: ChatComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
]
