import changelog from '../../../CHANGELOG.json';

export const APP_CODE_VERSION = changelog[0]?.version || '0.0.0';
