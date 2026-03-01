/**
 * Mock vscode module for testing
 */

export const window = {
  createOutputChannel: () => ({
    appendLine: () => {},
    dispose: () => {},
  }),
  showInformationMessage: () => Promise.resolve(undefined),
  showWarningMessage: () => Promise.resolve(undefined),
  showErrorMessage: () => Promise.resolve(undefined),
  showSaveDialog: () => Promise.resolve(undefined),
  createStatusBarItem: () => ({
    text: '',
    tooltip: '',
    command: '',
    show: () => {},
    dispose: () => {},
  }),
  createWebviewPanel: () => ({
    webview: {
      asWebviewUri: (uri: any) => uri,
      onDidReceiveMessage: () => ({ dispose: () => {} }),
      postMessage: () => Promise.resolve(true),
    },
    reveal: () => {},
    dispose: () => {},
  }),
};

export const workspace = {
  onDidChangeTextDocument: () => ({ dispose: () => {} }),
  onDidChangeConfiguration: () => ({ dispose: () => {} }),
  getConfiguration: () => ({
    get: (key: string, defaultValue: any) => defaultValue,
  }),
  fs: {
    writeFile: () => Promise.resolve(undefined),
  },
};

export const Uri = {
  joinPath: (baseUri: any, ...pathSegments: string[]) => ({
    ...baseUri,
    path: pathSegments.join('/'),
  }),
  file: (path: string) => ({ path }),
};

export const commands = {
  registerCommand: (commandId: string, handler: (...args: any[]) => any) => ({
    dispose: () => {},
  }),
};

export const ViewColumn = {
  One: 1,
};

export const StatusBarAlignment = {
  Right: 1,
};

export const Memento = {
  update: () => Promise.resolve(),
  get: () => undefined,
};
