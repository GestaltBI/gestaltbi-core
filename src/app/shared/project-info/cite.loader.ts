/**
 * Dynamic-imports @citation-js/core + the CFF/CSL/BibTeX/RIS plugins so the
 * heavy citation tooling lands in its own lazy chunk and never inflates the
 * main bundle. Resolves to the plugin-registered `Cite` constructor.
 */
let cached: Promise<CiteCtor> | undefined;

export type CiteCtor = (new (input: string | object) => CiteInstance) & {
  async(input: string | object, options?: object): Promise<CiteInstance>;
};

export interface CiteInstance {
  format(name: 'bibtex' | 'ris' | 'data', options?: object): string;
  format(name: 'bibliography', options: { template: string; format?: string; lang?: string }): string;
  data: unknown[];
}

export function loadCite(): Promise<CiteCtor> {
  if (!cached) {
    cached = (async () => {
      const core = await import(/* webpackChunkName: "citation-js" */ '@citation-js/core');
      // Side-effect imports register the plugins on the shared core.
      // plugin-yaml must register before plugin-cff (peer dependency).
      await import(/* webpackChunkName: "citation-js" */ '@citation-js/plugin-yaml');
      await import(/* webpackChunkName: "citation-js" */ '@citation-js/plugin-cff');
      await Promise.all([
        import(/* webpackChunkName: "citation-js" */ '@citation-js/plugin-csl'),
        import(/* webpackChunkName: "citation-js" */ '@citation-js/plugin-bibtex'),
        import(/* webpackChunkName: "citation-js" */ '@citation-js/plugin-ris'),
      ]);
      const ns = core as { Cite?: CiteCtor; default?: { Cite?: CiteCtor } };
      const Cite = ns.Cite ?? ns.default?.Cite;
      if (!Cite) throw new Error('citation.js: Cite export not found');
      return Cite;
    })().catch((err) => {
      cached = undefined;
      throw err;
    });
  }
  return cached;
}

export interface CitationStyle {
  id: string;
  labelKey: string;
}

/** Built-in CSL templates that ship with @citation-js/plugin-csl. */
export const BUILT_IN_STYLES: CitationStyle[] = [
  { id: 'apa', labelKey: 'projectInfo.styles.apa' },
  { id: 'vancouver', labelKey: 'projectInfo.styles.vancouver' },
  { id: 'harvard1', labelKey: 'projectInfo.styles.harvard' },
];
