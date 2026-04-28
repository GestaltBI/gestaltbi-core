export class TimedmapOptions {
  id: string;
  zoom: number;
  lat: number;
  lng: number;

  /**
   *
   * @param id "different id for each map, prima bestemmia: ***** ***"
   * @param lat latitude of center
   * @param lng longitude of center
   * @param zoom default on 13
   */
  constructor(id: string, lat: number, lng: number, zoom?: number) {
    this.zoom = zoom === undefined ? 13 : zoom;
    this.lat = lat;
    this.lng = lng;
    this.id = id;
  }
}
