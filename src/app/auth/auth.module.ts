import { NgModule } from '@angular/core';

import { SharedModule } from './../shared/shared.module';
import { AuthRoutingModule, routedComponents } from './auth-routing.module';

@NgModule({
  imports: [SharedModule, AuthRoutingModule],
  declarations: [routedComponents],
})
export class AuthModule {}
