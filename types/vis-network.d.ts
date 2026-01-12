declare module 'vis-network' {
  export interface Node {
    id: string;
    label?: string;
    color?: string;
    shape?: string;
    size?: number;
    [key: string]: any;
  }

  export interface Edge {
    id: string;
    from: string;
    to: string;
    color?: string;
    width?: number;
    arrows?: string;
    [key: string]: any;
  }

  export interface Data {
    nodes: Node[];
    edges: Edge[];
  }

  export interface Options {
    nodes?: any;
    edges?: any;
    physics?: any;
    interaction?: any;
    [key: string]: any;
  }

  export class Network {
    constructor(container: HTMLElement, data: Data, options?: Options);
    destroy(): void;
    on(event: string, callback: Function): void;
    setOptions(options: Options): void;
  }
}
