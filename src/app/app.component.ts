import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: false,
  selector: 'sbi-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(private translate: TranslateService) {
    // ngx-translate v17: defaultLanguage sets the fallback but does not
    // auto-switch the active language. Force it explicitly so the pipe
    // resolves keys instead of rendering them literally.
    this.translate.addLangs(['it', 'en']);
    this.translate.use('en');
  }
}
