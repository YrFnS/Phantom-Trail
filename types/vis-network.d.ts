declare module 'vis-network' {
  export interface NodeOptions {
    borderWidth?: number;
    borderWidthSelected?: number;
    brokenImage?: string;
    chosen?: boolean | {
      node?: (values: unknown, id: string, selected: boolean, hovering: boolean) => void;
      label?: (values: unknown, id: string, selected: boolean, hovering: boolean) => void;
    };
    color?: string | {
      border?: string;
      background?: string;
      highlight?: {
        border?: string;
        background?: string;
      };
      hover?: {
        border?: string;
        background?: string;
      };
    };
    fixed?: boolean | { x?: boolean; y?: boolean };
    font?: {
      color?: string;
      size?: number;
      face?: string;
      background?: string;
      strokeWidth?: number;
      strokeColor?: string;
      align?: string;
    };
    group?: string;
    heightConstraint?: number | { minimum?: number; valign?: string };
    hidden?: boolean;
    icon?: {
      face?: string;
      code?: string;
      size?: number;
      color?: string;
    };
    image?: string;
    label?: string;
    labelHighlightBold?: boolean;
    level?: number;
    mass?: number;
    physics?: boolean;
    scaling?: {
      min?: number;
      max?: number;
      label?: {
        enabled?: boolean;
        min?: number;
        max?: number;
        maxVisible?: number;
        drawThreshold?: number;
      };
      customScalingFunction?: (min: number, max: number, total: number, value: number) => number;
    };
    shadow?: boolean | {
      enabled?: boolean;
      color?: string;
      size?: number;
      x?: number;
      y?: number;
    };
    shape?: 'ellipse' | 'circle' | 'database' | 'box' | 'text' | 'image' | 'circularImage' | 'diamond' | 'dot' | 'star' | 'triangle' | 'triangleDown' | 'square' | 'icon' | 'hexagon';
    shapeProperties?: {
      borderDashes?: number[] | boolean;
      borderRadius?: number;
      interpolation?: boolean;
      useImageSize?: boolean;
      useBorderWithImage?: boolean;
    };
    size?: number;
    title?: string;
    value?: number;
    widthConstraint?: number | { minimum?: number; maximum?: number };
    x?: number;
    y?: number;
  }

  export interface Node extends NodeOptions {
    id: string;
  }

  export interface EdgeOptions {
    arrows?: string | {
      to?: boolean | {
        enabled?: boolean;
        imageHeight?: number;
        imageWidth?: number;
        scaleFactor?: number;
        src?: string;
        type?: string;
      };
      middle?: boolean | {
        enabled?: boolean;
        imageHeight?: number;
        imageWidth?: number;
        scaleFactor?: number;
        src?: string;
        type?: string;
      };
      from?: boolean | {
        enabled?: boolean;
        imageHeight?: number;
        imageWidth?: number;
        scaleFactor?: number;
        src?: string;
        type?: string;
      };
    };
    arrowStrikethrough?: boolean;
    chosen?: boolean | {
      edge?: (values: unknown, id: string, selected: boolean, hovering: boolean) => void;
      label?: (values: unknown, id: string, selected: boolean, hovering: boolean) => void;
    };
    color?: string | {
      color?: string;
      highlight?: string;
      hover?: string;
      inherit?: boolean | 'from' | 'to' | 'both';
      opacity?: number;
    };
    dashes?: boolean | number[];
    font?: {
      color?: string;
      size?: number;
      face?: string;
      background?: string;
      strokeWidth?: number;
      strokeColor?: string;
      align?: 'horizontal' | 'top' | 'middle' | 'bottom';
    };
    hidden?: boolean;
    hoverWidth?: number;
    label?: string;
    labelHighlightBold?: boolean;
    length?: number;
    physics?: boolean;
    scaling?: {
      min?: number;
      max?: number;
      label?: {
        enabled?: boolean;
        min?: number;
        max?: number;
        maxVisible?: number;
        drawThreshold?: number;
      };
      customScalingFunction?: (min: number, max: number, total: number, value: number) => number;
    };
    selectionWidth?: number;
    selfReferenceSize?: number;
    shadow?: boolean | {
      enabled?: boolean;
      color?: string;
      size?: number;
      x?: number;
      y?: number;
    };
    smooth?: boolean | {
      enabled?: boolean;
      type?: 'dynamic' | 'continuous' | 'discrete' | 'diagonalCross' | 'straightCross' | 'horizontal' | 'vertical' | 'curvedCW' | 'curvedCCW' | 'cubicBezier';
      roundness?: number;
      forceDirection?: 'horizontal' | 'vertical' | 'none';
    };
    title?: string;
    value?: number;
    width?: number;
  }

  export interface Edge extends EdgeOptions {
    id: string;
    from: string;
    to: string;
  }

  export interface Data {
    nodes: Node[];
    edges: Edge[];
  }

  export interface PhysicsOptions {
    enabled?: boolean;
    barnesHut?: {
      gravitationalConstant?: number;
      centralGravity?: number;
      springLength?: number;
      springConstant?: number;
      damping?: number;
      avoidOverlap?: number;
    };
    forceAtlas2Based?: {
      gravitationalConstant?: number;
      centralGravity?: number;
      springLength?: number;
      springConstant?: number;
      damping?: number;
      avoidOverlap?: number;
    };
    repulsion?: {
      centralGravity?: number;
      springLength?: number;
      springConstant?: number;
      nodeDistance?: number;
      damping?: number;
    };
    hierarchicalRepulsion?: {
      centralGravity?: number;
      springLength?: number;
      springConstant?: number;
      nodeDistance?: number;
      damping?: number;
    };
    maxVelocity?: number;
    minVelocity?: number;
    solver?: 'barnesHut' | 'repulsion' | 'hierarchicalRepulsion' | 'forceAtlas2Based';
    stabilization?: boolean | {
      enabled?: boolean;
      iterations?: number;
      updateInterval?: number;
      onlyDynamicEdges?: boolean;
      fit?: boolean;
    };
    timestep?: number;
    adaptiveTimestep?: boolean;
  }

  export interface InteractionOptions {
    dragNodes?: boolean;
    dragView?: boolean;
    hideEdgesOnDrag?: boolean;
    hideEdgesOnZoom?: boolean;
    hideNodesOnDrag?: boolean;
    hover?: boolean;
    hoverConnectedEdges?: boolean;
    keyboard?: boolean | {
      enabled?: boolean;
      speed?: { x?: number; y?: number; zoom?: number };
      bindToWindow?: boolean;
    };
    multiselect?: boolean;
    navigationButtons?: boolean;
    selectable?: boolean;
    selectConnectedEdges?: boolean;
    tooltipDelay?: number;
    zoomView?: boolean;
    zoomSpeed?: number;
  }

  export interface Options {
    nodes?: NodeOptions;
    edges?: EdgeOptions;
    physics?: PhysicsOptions;
    interaction?: InteractionOptions;
    layout?: {
      randomSeed?: number;
      improvedLayout?: boolean;
      clusterThreshold?: number;
      hierarchical?: boolean | {
        enabled?: boolean;
        levelSeparation?: number;
        nodeSpacing?: number;
        treeSpacing?: number;
        blockShifting?: boolean;
        edgeMinimization?: boolean;
        parentCentralization?: boolean;
        direction?: 'UD' | 'DU' | 'LR' | 'RL';
        sortMethod?: 'hubsize' | 'directed';
        shakeTowards?: 'leaves' | 'roots';
      };
    };
    manipulation?: boolean | {
      enabled?: boolean;
      initiallyActive?: boolean;
      addNode?: boolean | ((data: Node, callback: (data: Node | null) => void) => void);
      addEdge?: boolean | ((data: Edge, callback: (data: Edge | null) => void) => void);
      editNode?: (data: Node, callback: (data: Node | null) => void) => void;
      editEdge?: boolean | ((data: Edge, callback: (data: Edge | null) => void) => void);
      deleteNode?: boolean | ((data: { nodes: string[]; edges: string[] }, callback: (data: { nodes: string[]; edges: string[] } | null) => void) => void);
      deleteEdge?: boolean | ((data: { nodes: string[]; edges: string[] }, callback: (data: { nodes: string[]; edges: string[] } | null) => void) => void);
      controlNodeStyle?: NodeOptions;
    };
    height?: string;
    width?: string;
    autoResize?: boolean;
    clickToUse?: boolean;
    configure?: boolean | {
      enabled?: boolean;
      filter?: boolean | string | string[] | ((option: string, path: string[]) => boolean);
      container?: HTMLElement;
      showButton?: boolean;
    };
    groups?: Record<string, NodeOptions>;
    locale?: string;
    locales?: Record<string, Record<string, string>>;
  }

  export class Network {
    constructor(container: HTMLElement, data: Data, options?: Options);
    destroy(): void;
    on(event: string, callback: (params?: unknown) => void): void;
    off(event: string, callback: (params?: unknown) => void): void;
    once(event: string, callback: (params?: unknown) => void): void;
    setOptions(options: Options): void;
    setData(data: Data): void;
    getPositions(nodeIds?: string[]): Record<string, { x: number; y: number }>;
    storePositions(): void;
    moveNode(nodeId: string, x: number, y: number): void;
    getBoundingBox(nodeId: string): { top: number; left: number; right: number; bottom: number };
    getConnectedNodes(nodeId: string, direction?: 'from' | 'to'): string[];
    getConnectedEdges(nodeId: string): string[];
    startSimulation(): void;
    stopSimulation(): void;
    stabilize(iterations?: number): void;
    getScale(): number;
    getViewPosition(): { x: number; y: number };
    fit(options?: { nodes?: string[]; animation?: boolean | { duration?: number; easingFunction?: string } }): void;
    focus(nodeId: string, options?: { scale?: number; offset?: { x: number; y: number }; animation?: boolean | { duration?: number; easingFunction?: string } }): void;
    moveTo(options: { position?: { x: number; y: number }; scale?: number; offset?: { x: number; y: number }; animation?: boolean | { duration?: number; easingFunction?: string } }): void;
    releaseNode(): void;
    getNodeAt(position: { x: number; y: number }): string | undefined;
    getEdgeAt(position: { x: number; y: number }): string | undefined;
    selectNodes(nodeIds: string[], highlightEdges?: boolean): void;
    selectEdges(edgeIds: string[]): void;
    getSelectedNodes(): string[];
    getSelectedEdges(): string[];
    unselectAll(): void;
    redraw(): void;
    setSize(width: string, height: string): void;
    canvasToDOM(position: { x: number; y: number }): { x: number; y: number };
    DOMtoCanvas(position: { x: number; y: number }): { x: number; y: number };
  }
}
