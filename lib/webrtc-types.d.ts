// WebRTC type declarations for P2P functionality
declare global {
  const RTCPeerConnection: {
    new(configuration?: RTCConfiguration): RTCPeerConnection;
  };

  interface RTCPeerConnection {
    createDataChannel(label: string, dataChannelDict?: RTCDataChannelInit): RTCDataChannel;
    close(): void;
    iceConnectionState: RTCIceConnectionState;
    oniceconnectionstatechange: ((this: RTCPeerConnection, ev: Event) => any) | null;
  }

  interface RTCDataChannel {
    readyState: RTCDataChannelState;
    send(data: string): void;
    close(): void;
    onopen: ((this: RTCDataChannel, ev: Event) => any) | null;
    onmessage: ((this: RTCDataChannel, ev: MessageEvent) => any) | null;
    onerror: ((this: RTCDataChannel, ev: Event) => any) | null;
  }

  interface RTCConfiguration {
    iceServers?: RTCIceServer[];
  }

  interface RTCIceServer {
    urls: string | string[];
  }

  interface RTCDataChannelInit {
    ordered?: boolean;
  }

  type RTCIceConnectionState = 'new' | 'checking' | 'connected' | 'completed' | 'failed' | 'disconnected' | 'closed';
  type RTCDataChannelState = 'connecting' | 'open' | 'closing' | 'closed';
}

export {};
