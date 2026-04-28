import { AfterViewChecked, Component } from '@angular/core';

@Component({
  standalone: false,
  selector: 'sbi-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewChecked {
  title = 'smartbi-client';

  ngAfterViewChecked() {}
}
