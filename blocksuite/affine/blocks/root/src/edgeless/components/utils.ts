import type {
  CursorType,
  ResizeHandle,
  StandardCursor,
} from '@blocksuite/std/gfx';

const rotateCursorMap: {
  [key in ResizeHandle]: number;
} = {
  'top-right': 0,
  'bottom-right': 90,
  'bottom-left': 180,
  'top-left': 270,

  // not used
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

export function generateCursorUrl(
  angle = 0,
  handle: ResizeHandle,
  fallback: StandardCursor = 'default'
): CursorType {
  angle = ((angle % 360) + 360) % 360;
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg transform='rotate(${rotateCursorMap[handle] + angle} 16 16)'%3E%3Cpath fill='white' d='M13.7,18.5h3.9l0-1.5c0-1.4-1.2-2.6-2.6-2.6h-1.5v3.9l-5.8-5.8l5.8-5.8v3.9h2.3c3.1,0,5.6,2.5,5.6,5.6v2.3h3.9l-5.8,5.8L13.7,18.5z'/%3E%3Cpath d='M20.4,19.4v-3.2c0-2.6-2.1-4.7-4.7-4.7h-3.2l0,0V9L9,12.6l3.6,3.6v-2.6l0,0H15c1.9,0,3.5,1.6,3.5,3.5v2.4l0,0h-2.6l3.6,3.6l3.6-3.6L20.4,19.4L20.4,19.4z'/%3E%3C/g%3E%3C/svg%3E") 16 16, ${fallback}`;
}

const handleToRotateMap: {
  [key in ResizeHandle]: number;
} = {
  'top-left': 45,
  'top-right': 135,
  'bottom-right': 45,
  'bottom-left': 135,
  left: 0,
  right: 0,
  top: 90,
  bottom: 90,
};

const rotateToHandleMap: {
  [key: number]: StandardCursor;
} = {
  0: 'ew-resize',
  45: 'nwse-resize',
  90: 'ns-resize',
  135: 'nesw-resize',
};

export function getRotatedResizeCursor(option: {
  handle: ResizeHandle;
  angle: number;
}) {
  const angle =
    (Math.round(
      (handleToRotateMap[option.handle] + ((option.angle + 360) % 360)) / 45
    ) %
      4) *
    45;

  return rotateToHandleMap[angle] || 'default';
}
