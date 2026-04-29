declare module '@citation-js/core' {
  export class Cite {
    constructor(input: string | object);
    format(name: string, options?: object): string;
    data: unknown[];
  }
}

declare module '@citation-js/plugin-cff';
declare module '@citation-js/plugin-csl';
declare module '@citation-js/plugin-bibtex';
declare module '@citation-js/plugin-ris';
declare module '@citation-js/plugin-yaml';
