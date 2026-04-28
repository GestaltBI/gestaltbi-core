import { Injectable } from '@angular/core';

import { DatastorageService } from './datastorage.service';

@Injectable({
  providedIn: 'root',
})
export class CloudService extends DatastorageService {
  constructor() {
    super();
  }

  store(filename: string, filecontent: string) {
    throw new Error('Method not implemented.');
  }
}
