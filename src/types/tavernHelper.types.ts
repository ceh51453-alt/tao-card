/**
 * TavernHelper Extension types — spec Phần 3.3
 */

export interface TavernHelperExtension {
  scripts: TavernHelperScript[];
  variables: Record<string, unknown>;
}

export interface TavernHelperScript {
  type: 'script';
  enabled: boolean;
  name: string;
  id: string;       // uuid v4
  content: string;  // JS, có thể >130,000 ký tự
  info: string;
  button: {
    enabled: boolean;
    buttons: { name: string; visible: boolean }[];
  };
  data: Record<string, unknown>;
}
