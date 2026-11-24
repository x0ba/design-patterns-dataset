// Mock project data for the elemental.nvim docs site. Sidebar order is the order listed here.

import install from '../content/install.md?raw';
import quickStart from '../content/quick-start.md?raw';
import configuration from '../content/configuration.md?raw';
import elementLookup from '../content/element-lookup.md?raw';
import elementMass from '../content/element-mass.md?raw';
import elementCompare from '../content/element-compare.md?raw';
import isotopes from '../content/isotopes.md?raw';
import electronConfig from '../content/electron-config.md?raw';
import units from '../content/units.md?raw';
import faq from '../content/faq.md?raw';
import changelog from '../content/changelog.md?raw';

import helpCrossRefs from '../content/help/cross-references.md?raw';
import helpCallouts from '../content/help/callouts.md?raw';
import helpVersioning from '../content/help/versioning.md?raw';
import helpPublishing from '../content/help/publishing.md?raw';

export const PAGE_DEFS = [
  { slug: 'install', group: 'Start here', source: install },
  { slug: 'quick-start', group: 'Start here', source: quickStart },
  { slug: 'configuration', group: 'Start here', source: configuration },
  { slug: 'element-lookup', group: 'Commands', source: elementLookup },
  { slug: 'element-mass', group: 'Commands', source: elementMass },
  { slug: 'element-compare', group: 'Commands', source: elementCompare },
  { slug: 'isotopes', group: 'Commands', source: isotopes },
  { slug: 'electron-config', group: 'Commands', source: electronConfig },
  { slug: 'units', group: 'Commands', source: units },
  { slug: 'faq', group: 'Project', source: faq },
  { slug: 'changelog', group: 'Project', source: changelog },
];

export const GROUP_ORDER = ['Start here', 'Commands', 'Project'];

export const HELP_ARTICLES = [
  { slug: 'cross-references', title: 'Cross-references', summary: 'Link to pages and sections, and what a broken link means', source: helpCrossRefs },
  { slug: 'callouts', title: 'Callouts', summary: 'Note, tip, warning, and caution boxes, and why > NOTE: is plain text', source: helpCallouts },
  { slug: 'versioning', title: 'Versioning', summary: 'What the version setting controls, and when to change it', source: helpVersioning },
  { slug: 'publishing', title: 'Publishing', summary: 'What blocks a publish and what gets uploaded', source: helpPublishing },
];

export const PROJECT = {
  name: 'elemental.nvim',
  repo: 'hale-chem/elemental.nvim',
  license: 'MIT',
  stars: 214,
  latestRelease: '0.9.2',
};

export const INITIAL_CONFIG = {
  title: 'elemental.nvim',
  version: '0.9',
  baseUrl: '',
};

export const FIRST_BUILD_AT = '16 Nov 2026, 18:14';
