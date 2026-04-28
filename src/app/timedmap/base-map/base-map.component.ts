import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import * as maplibregl from 'maplibre-gl';

import { DatastructureService } from 'src/app/datastructure/datastructure.service';
import { Measure } from 'src/app/shared/measure';

@Component({
  standalone: false,
  selector: 'sbi-base-map',
  templateUrl: './base-map.component.html',
  styleUrls: ['./base-map.component.scss'],
})
export class BaseMapComponent implements OnInit, AfterViewInit {
  map: maplibregl.Map;

  // OpenFreeMap is free, key-less, OSM-derived. The "positron" style is
  // a low-saturation neutral basemap that lets data layers stand out.
  style = 'https://tiles.openfreemap.org/styles/positron';
  @Input() lat: number;
  @Input() lng: number;
  @Input() zoom: number;
  @Input() layout: string; // 'alpha' or 'colored', default alpha
  @Input() navigation: string; // navigation control position 'left' or 'right' or just skip this prop

  @Input() startingFixedMeasure = new Measure(
    this.dataStructureService.getFull('smartbi:calc:daily_ro:sum'),
    'smartbi:calc:daily_ro:sum',
  );
  @Input() startingDynamicMeasure = new Measure(
    this.dataStructureService.getFull('smartbi:sold_price:avg'),
    'smartbi:sold_price:avg',
  );
  @Input() titleField = new Measure(this.dataStructureService.getFull('smartbi:delivery_pc'), 'smartbi:delivery_pc');

  private _data: any;
  @Input() set data(value: any) {
    this._data = value;

    if (this.map !== undefined) {
      if (this.map.getSource(this.sourceLayer)) {
        (this.map.getSource(this.sourceLayer) as maplibregl.GeoJSONSource).setData(this._data);
      } else {
        this.map.addSource(this.sourceLayer, {
          type: 'geojson',
          data: this._data,
          generateId: true,
        });
      }
      try {
        this.addLayerOnMap('colored');
      } catch (error) {}
    }
  }

  get data() {
    return this._data;
  }

  private _fixedMeasure: Measure;
  @Input() set fixedMeasure(value: Measure) {
    this._fixedMeasure = value;
    if (this._dynamicMeasure === undefined) {
      this._dynamicMeasure = this.startingDynamicMeasure;
    }

    if (this.fixedMeasure === undefined) {
      this._fixedMeasure = this.startingFixedMeasure;
    }
    try {
      this.addLayerOnMap('colored');
    } catch (error) {}
  }
  get fixedMeasure() {
    return this._fixedMeasure;
  }

  private _dynamicMeasure: Measure;
  @Input() set dynamicMeasure(value: Measure) {
    this._dynamicMeasure = value;
    if (this._dynamicMeasure === undefined) {
      this._dynamicMeasure = this.startingDynamicMeasure;
    }

    if (this.fixedMeasure === undefined) {
      this._fixedMeasure = this.startingFixedMeasure;
    }
    this.addLayerOnMap('colored');
  }
  get dynamicMeasure() {
    return this._dynamicMeasure;
  }

  // debug
  @Input()
  public set toggle(v: boolean) {
    try {
      if (v) {
        this.addLayerOnMap('colored');
      } else {
        this.addLayerOnMap('alpha');
      }
    } catch (error) {}
  }

  @ViewChild('mapcontainer') el: ElementRef;

  sourceLayer: string;
  minZoomLayer: number;
  idLayer: string;

  constructor(private dataStructureService: DatastructureService) {}

  ngOnInit(): void {
    this.sourceLayer = 'gestalt-source';
    this.minZoomLayer = 0;

    this.idLayer = 'gestalt-point';
  }

  ngAfterViewInit(): void {
    this.map = new maplibregl.Map({
      container: this.el.nativeElement,
      style: this.style,
      zoom: this.zoom,
      center: [this.lng, this.lat],
      attributionControl: false,
      dragRotate: false,
      touchZoomRotate: false,
    });

    if (this.navigation === 'right') {
      this.map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    }

    if (this.navigation === 'left') {
      this.map.addControl(new maplibregl.NavigationControl(), 'bottom-left');
    }

    this.map.on('load', () => {
      this.map.on('click', this.idLayer, (e: any) => {
        if (e.features[0].geometry.type === 'Point') {
          const coordinates = e.features[0].geometry.coordinates.slice();
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          new maplibregl.Popup()
            .setLngLat(new maplibregl.LngLat(coordinates[0], coordinates[1]))
            .setHTML(
              `<div>
                  <h1>${e.features[0].properties[this.titleField.code]}</h1>
                  <span><b>${this.dynamicMeasure.column.label} </b></span>
                  </br>
                  <span>${Number.parseFloat(e.features[0].properties[this._dynamicMeasure.code]).toFixed(0)} ${
                this.dynamicMeasure.column.type === 'number:currency' ? '€' : ''
              }</span>
                  </br>
                  <span><b>${this.fixedMeasure.column.label}</b></span>
                  </br>
                  <span>${Number.parseFloat(e.features[0].properties[this.fixedMeasure.code]).toFixed(0)} ${
                this.fixedMeasure.column.type === 'number:currency' ? '€' : ''
              }</span>
                </div>`,
            )
            .addTo(this.map);
        }
      });

      this.map.on('mouseenter', this.idLayer, () => {
        this.map.getCanvas().style.cursor = 'pointer';
      });
      this.map.on('mouseleave', this.idLayer, () => {
        this.map.getCanvas().style.cursor = '';
      });
    });
  }

  addLayerOnMap(layout: string): void {
    if (this._data) {
      const highlightIdLayer = 'hl-ID';

      try {
        if (this.map.getLayer(this.idLayer)) {
          this.map.removeLayer(this.idLayer);
        }
        if (this.map.getLayer(highlightIdLayer)) {
          this.map.removeLayer(highlightIdLayer);
        }
      } catch (error) {}

      switch (layout) {
        case 'colored':
          this.addColoredLayer();
          break;

        default:
          this.addAlphaLayer();
          break;
      }

      let hoveredPointId: number | null = null;
      if (this.map !== undefined) {
        const defaultMax = 10;
        const defaultMin = 1;

        const minDynamic =
          this._data.properties[this._dynamicMeasure.code] !== undefined
            ? this._data.properties[this._dynamicMeasure.code].min
            : defaultMin;
        const maxDynamic =
          this._data.properties[this._dynamicMeasure.code] !== undefined
            ? this._data.properties[this._dynamicMeasure.code].max
            : defaultMax;

        this.map.addLayer({
          id: highlightIdLayer,
          type: 'circle',
          source: this.sourceLayer,
          paint: {
            'circle-radius': {
              property: this._dynamicMeasure.code,
              type: 'exponential',
              stops: [
                [{ zoom: 0, value: minDynamic }, 1],
                [{ zoom: 0, value: maxDynamic }, 5],
                [{ zoom: 15, value: minDynamic }, 30],
                [{ zoom: 15, value: maxDynamic }, 50],
              ],
            },
            'circle-color': 'rgba(0,0,0,0)',
            'circle-stroke-color': 'black',
            'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0],
            'circle-opacity': {
              property: this._dynamicMeasure.code,
              type: 'exponential',
              stops: [
                [{ zoom: 0, value: 0 }, 0.3],
                [{ zoom: 0, value: 6 }, 1],
              ],
            },
          },
        });

        this.map.on('click', highlightIdLayer, (e: any) => {
          if (e.features.length > 0) {
            e.preventDefault();
            if (hoveredPointId || hoveredPointId === 0) {
              this.map.setFeatureState({ source: this.sourceLayer, id: hoveredPointId }, { hover: false });
            }
            hoveredPointId = e.features[0].id;
            this.map.setFeatureState({ source: this.sourceLayer, id: hoveredPointId }, { hover: true });
          }
        });

        this.map.on('click', (e: any) => {
          if (e.defaultPrevented === false) {
            if (hoveredPointId || hoveredPointId === 0) {
              this.map.setFeatureState({ source: this.sourceLayer, id: hoveredPointId }, { hover: false });
              hoveredPointId = null;
            }
          }
        });
      }
    }
  }

  addColoredLayer(): void {
    if (this._data) {
      if (this.map !== undefined) {
        const defaultMax = 10;
        const defaultMin = 1;

        const minDynamic =
          this._data.properties[this._dynamicMeasure.code] !== undefined
            ? this._data.properties[this._dynamicMeasure.code].min
            : defaultMin;
        const maxDynamic =
          this._data.properties[this._dynamicMeasure.code] !== undefined
            ? this._data.properties[this._dynamicMeasure.code].max
            : defaultMax;

        const minFixed =
          this._data.properties[this.fixedMeasure.code] !== undefined
            ? this._data.properties[this.fixedMeasure.code].min
            : defaultMin;
        const maxFixed =
          this._data.properties[this.fixedMeasure.code] !== undefined
            ? this._data.properties[this.fixedMeasure.code].max
            : defaultMax;

        this.map.addLayer({
          id: this.idLayer,
          type: 'circle',
          source: this.sourceLayer,
          minzoom: this.minZoomLayer,
          paint: {
            'circle-radius': {
              property: this._dynamicMeasure.code,
              type: 'exponential',
              stops: [
                [{ zoom: 0, value: minDynamic }, 1],
                [{ zoom: 0, value: maxDynamic }, 5],
                [{ zoom: 15, value: minDynamic }, 30],
                [{ zoom: 15, value: maxDynamic }, 50],
              ],
            },
            'circle-color': {
              property: this.fixedMeasure.code,
              type: 'exponential',
              stops: [
                [minFixed, 'rgb(145, 6, 6)'],
                [minFixed + (maxFixed - minFixed) * 0.25, 'rgb(252, 5, 5)'],
                [minFixed + (maxFixed - minFixed) * 0.75, 'rgb(244, 252, 5)'],
                [maxFixed, 'rgb(17, 105, 13)'],
              ],
            },
            'circle-stroke-color': 'black',
            'circle-stroke-width': 0,
            'circle-opacity': 0.75,
          },
        });
      }
    }
  }

  addAlphaLayer(): void {
    this.map.addLayer({
      id: this.idLayer,
      type: 'circle',
      source: this.sourceLayer,
      minzoom: this.minZoomLayer,
      paint: {
        'circle-radius': {
          property: this._dynamicMeasure.code,
          type: 'exponential',
          stops: [
            [{ zoom: 0, value: 0 }, 8],
            [{ zoom: 0, value: 8 }, 25],
            [{ zoom: 10, value: 0 }, 12],
            [{ zoom: 10, value: 0 }, 40],
          ],
        },
        'circle-color': '#333333',
        'circle-stroke-width': 0,
        'circle-opacity': {
          property: this.fixedMeasure.code,
          type: 'exponential',
          stops: [
            [{ zoom: 0, value: 0 }, 0.3],
            [{ zoom: 0, value: 6 }, 1],
          ],
        },
      },
    });
  }

  toTable(object: any) {
    let ret = '<table>';
    for (const key of Object.keys(object)) {
      ret += '<tr><th>' + key + '</th><td>' + object[key] + '</td></tr>';
    }
    ret += '</table>';
    return ret;
  }
}
