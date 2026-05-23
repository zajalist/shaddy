// Hand-mirrored from backend/openapi.yaml AND backend/app/schemas.py.
// Per CONTRACTS.md §3: any change to one of these three files MUST land in
// the same PR as the other two, with both owners' review.

export type TemplateId = 'plasma' | 'voronoi-cells' | 'gradient-noise';
export type Device = 'cuda' | 'cpu';
export type RequestedDevice = 'auto' | 'cuda' | 'cpu';

export interface OptimizeRequest {
  template_id: TemplateId;
  image_base64: string;             // PNG/JPEG/WebP, base64 or data-URL, <=1MB decoded
  device?: RequestedDevice;         // default 'auto'
  max_steps?: number;               // 1..500, default 500
  wall_clock_cap_sec?: number;      // 1..30, default 30
}

export interface OptimizeAccepted {
  job_id: string;
  ws_url: string;                   // relative, e.g. "/optimize/stream/<id>"
  resolved_device: Device;
}

export interface OptimizeError {
  error: string;
}

// --- WebSocket frame union (tagged by `type`) ---

export interface ProgressFrame {
  type: 'progress';
  step: number;
  total: number;
  loss: number;
  preview_b64: string;              // data:image/jpeg;base64,... (256x256 JPEG q85)
}

export interface DoneFrame {
  type: 'done';
  final_params: Record<string, number | number[]>;
  glsl: string;
  loss: number;
}

export interface ErrorFrame {
  type: 'error';
  message: string;
}

export type OptimizeFrame = ProgressFrame | DoneFrame | ErrorFrame;
