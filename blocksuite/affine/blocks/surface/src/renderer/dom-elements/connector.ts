import type { ConnectorElementModel } from '@blocksuite/affine-model';
import { ConnectorMode, DefaultTheme } from '@blocksuite/affine-model';
import {
  getBezierParameters,
  type PointLocation,
} from '@blocksuite/global/gfx';

import { DomElementRendererExtension } from '../../extensions/dom-element-renderer.js';
import type { DomRenderer } from '../dom-renderer.js';
import type { DomElementRenderer } from './index.js';

/**
 * DOM renderer for connector elements.
 * Uses SVG to render connector paths, endpoints, and labels.
 */
export const connectorDomRenderer: DomElementRenderer<ConnectorElementModel> = (
  elementModel,
  domElement,
  renderer
) => {
  const {
    mode,
    path: points,
    strokeStyle,
    frontEndpointStyle,
    rearEndpointStyle,
    strokeWidth,
    stroke,
    w,
    h,
  } = elementModel;

  // Clear previous content
  domElement.innerHTML = '';

  // Points might not be built yet in some scenarios (undo/redo, copy/paste)
  if (!points.length || points.length < 2) {
    return;
  }

  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.width = `${w * renderer.viewport.zoom}px`;
  svg.style.height = `${h * renderer.viewport.zoom}px`;
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.pointerEvents = 'none';
  svg.style.overflow = 'visible';

  const strokeColor = renderer.getColorValue(
    stroke,
    DefaultTheme.connectorColor,
    true
  );

  // Render connector path
  renderConnectorPath(
    svg,
    points,
    mode,
    strokeStyle,
    strokeWidth,
    strokeColor,
    renderer.viewport.zoom
  );

  // Render endpoints
  if (frontEndpointStyle && frontEndpointStyle !== 'None') {
    renderEndpoint(
      svg,
      points,
      frontEndpointStyle,
      'front',
      strokeWidth,
      strokeColor,
      mode,
      renderer.viewport.zoom
    );
  }

  if (rearEndpointStyle && rearEndpointStyle !== 'None') {
    renderEndpoint(
      svg,
      points,
      rearEndpointStyle,
      'rear',
      strokeWidth,
      strokeColor,
      mode,
      renderer.viewport.zoom
    );
  }

  // Render label if exists
  if (elementModel.hasLabel()) {
    renderConnectorLabel(elementModel, domElement, renderer);
  }

  domElement.appendChild(svg);
};

function renderConnectorPath(
  svg: SVGSVGElement,
  points: PointLocation[],
  mode: ConnectorMode,
  strokeStyle: string,
  strokeWidth: number,
  strokeColor: string,
  zoom: number
) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  let pathData = '';

  if (mode === ConnectorMode.Curve) {
    // Bezier curve
    const bezierParams = getBezierParameters(points);
    const [p0, p1, p2, p3] = bezierParams;
    pathData = `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}`;
  } else {
    // Straight or orthogonal lines
    pathData = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      pathData += ` L ${points[i][0]} ${points[i][1]}`;
    }
  }

  path.setAttribute('d', pathData);
  path.setAttribute('stroke', strokeColor);
  path.setAttribute('stroke-width', (strokeWidth * zoom).toString());
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');

  if (strokeStyle === 'dash') {
    const dashArray = `${12 * zoom},${12 * zoom}`;
    path.setAttribute('stroke-dasharray', dashArray);
  }

  svg.appendChild(path);
}

function renderEndpoint(
  svg: SVGSVGElement,
  points: PointLocation[],
  endpointStyle: string,
  position: 'front' | 'rear',
  strokeWidth: number,
  strokeColor: string,
  mode: ConnectorMode,
  zoom: number
) {
  const pointIndex = position === 'rear' ? points.length - 1 : 0;
  const point = points[pointIndex];
  const size = 15 * (strokeWidth / 2) * zoom;

  // Calculate tangent direction for endpoint orientation
  let tangent: [number, number];
  if (mode === ConnectorMode.Curve) {
    const bezierParams = getBezierParameters(points);
    // For curve mode, use bezier tangent
    if (position === 'rear') {
      const lastIdx = points.length - 1;
      const prevPoint = points[lastIdx - 1];
      tangent = [point[0] - prevPoint[0], point[1] - prevPoint[1]];
    } else {
      const nextPoint = points[1];
      tangent = [nextPoint[0] - point[0], nextPoint[1] - point[1]];
    }
  } else {
    // For straight/orthogonal mode
    if (position === 'rear') {
      const prevPoint = points[points.length - 2];
      tangent = [point[0] - prevPoint[0], point[1] - prevPoint[1]];
    } else {
      const nextPoint = points[1];
      tangent = [nextPoint[0] - point[0], nextPoint[1] - point[1]];
    }
  }

  // Normalize tangent
  const length = Math.sqrt(tangent[0] * tangent[0] + tangent[1] * tangent[1]);
  if (length > 0) {
    tangent[0] /= length;
    tangent[1] /= length;
  }

  // Adjust tangent direction for front endpoint
  if (position === 'front') {
    tangent[0] = -tangent[0];
    tangent[1] = -tangent[1];
  }

  switch (endpointStyle) {
    case 'Arrow':
      renderArrowEndpoint(svg, point, tangent, size, strokeColor, zoom);
      break;
    case 'Triangle':
      renderTriangleEndpoint(svg, point, tangent, size, strokeColor, zoom);
      break;
    case 'Circle':
      renderCircleEndpoint(svg, point, tangent, size, strokeColor, zoom);
      break;
    case 'Diamond':
      renderDiamondEndpoint(svg, point, tangent, size, strokeColor, zoom);
      break;
  }
}

function renderArrowEndpoint(
  svg: SVGSVGElement,
  point: PointLocation,
  tangent: [number, number],
  size: number,
  color: string,
  zoom: number
) {
  const angle = Math.PI / 4; // 45 degrees
  const arrowPath = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  );

  // Calculate arrow points
  const cos1 = Math.cos(angle);
  const sin1 = Math.sin(angle);
  const cos2 = Math.cos(-angle);
  const sin2 = Math.sin(-angle);

  const x1 = point[0] + size * (tangent[0] * cos1 - tangent[1] * sin1);
  const y1 = point[1] + size * (tangent[0] * sin1 + tangent[1] * cos1);
  const x2 = point[0] + size * (tangent[0] * cos2 - tangent[1] * sin2);
  const y2 = point[1] + size * (tangent[0] * sin2 + tangent[1] * cos2);

  const pathData = `M ${x1} ${y1} L ${point[0]} ${point[1]} L ${x2} ${y2}`;
  arrowPath.setAttribute('d', pathData);
  arrowPath.setAttribute('stroke', color);
  arrowPath.setAttribute('stroke-width', (2 * zoom).toString());
  arrowPath.setAttribute('fill', 'none');
  arrowPath.setAttribute('stroke-linecap', 'round');
  arrowPath.setAttribute('stroke-linejoin', 'round');

  svg.appendChild(arrowPath);
}

function renderTriangleEndpoint(
  svg: SVGSVGElement,
  point: PointLocation,
  tangent: [number, number],
  size: number,
  color: string,
  zoom: number
) {
  const triangle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'polygon'
  );

  const angle = Math.PI / 3; // 60 degrees
  const cos1 = Math.cos(angle);
  const sin1 = Math.sin(angle);
  const cos2 = Math.cos(-angle);
  const sin2 = Math.sin(-angle);

  const x1 = point[0] + size * (tangent[0] * cos1 - tangent[1] * sin1);
  const y1 = point[1] + size * (tangent[0] * sin1 + tangent[1] * cos1);
  const x2 = point[0] + size * (tangent[0] * cos2 - tangent[1] * sin2);
  const y2 = point[1] + size * (tangent[0] * sin2 + tangent[1] * cos2);

  const points = `${point[0]},${point[1]} ${x1},${y1} ${x2},${y2}`;
  triangle.setAttribute('points', points);
  triangle.setAttribute('fill', color);
  triangle.setAttribute('stroke', color);
  triangle.setAttribute('stroke-width', (1 * zoom).toString());

  svg.appendChild(triangle);
}

function renderCircleEndpoint(
  svg: SVGSVGElement,
  point: PointLocation,
  tangent: [number, number],
  size: number,
  color: string,
  zoom: number
) {
  const circle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle'
  );

  const radius = size * 0.5;
  const centerX = point[0] + radius * tangent[0];
  const centerY = point[1] + radius * tangent[1];

  circle.setAttribute('cx', centerX.toString());
  circle.setAttribute('cy', centerY.toString());
  circle.setAttribute('r', radius.toString());
  circle.setAttribute('fill', color);
  circle.setAttribute('stroke', color);
  circle.setAttribute('stroke-width', (1 * zoom).toString());

  svg.appendChild(circle);
}

function renderDiamondEndpoint(
  svg: SVGSVGElement,
  point: PointLocation,
  tangent: [number, number],
  size: number,
  color: string,
  zoom: number
) {
  const diamond = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'polygon'
  );

  // Calculate diamond points
  const perpX = -tangent[1]; // Perpendicular to tangent
  const perpY = tangent[0];

  const halfSize = size * 0.5;
  const x1 = point[0] + halfSize * tangent[0]; // Front point
  const y1 = point[1] + halfSize * tangent[1];
  const x2 = point[0] + halfSize * perpX; // Right point
  const y2 = point[1] + halfSize * perpY;
  const x3 = point[0] - halfSize * tangent[0]; // Back point
  const y3 = point[1] - halfSize * tangent[1];
  const x4 = point[0] - halfSize * perpX; // Left point
  const y4 = point[1] - halfSize * perpY;

  const points = `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`;
  diamond.setAttribute('points', points);
  diamond.setAttribute('fill', color);
  diamond.setAttribute('stroke', color);
  diamond.setAttribute('stroke-width', (1 * zoom).toString());

  svg.appendChild(diamond);
}

function renderConnectorLabel(
  elementModel: ConnectorElementModel,
  domElement: HTMLElement,
  renderer: DomRenderer
) {
  if (!elementModel.text || !elementModel.labelXYWH) {
    return;
  }

  const labelElement = document.createElement('div');
  const [lx, ly, lw, lh] = elementModel.labelXYWH;
  const { x, y } = elementModel;

  // Position label relative to the connector
  const relativeX = (lx - x) * renderer.viewport.zoom;
  const relativeY = (ly - y) * renderer.viewport.zoom;

  labelElement.style.position = 'absolute';
  labelElement.style.left = `${relativeX}px`;
  labelElement.style.top = `${relativeY}px`;
  labelElement.style.width = `${lw * renderer.viewport.zoom}px`;
  labelElement.style.height = `${lh * renderer.viewport.zoom}px`;
  labelElement.style.pointerEvents = 'auto';
  labelElement.style.display = 'flex';
  labelElement.style.alignItems = 'center';
  labelElement.style.justifyContent = 'center';
  labelElement.style.backgroundColor = 'white';
  labelElement.style.border = '1px solid #e0e0e0';
  labelElement.style.borderRadius = '4px';
  labelElement.style.padding = '2px 4px';
  labelElement.style.fontSize = `${(elementModel.labelStyle?.fontSize || 16) * renderer.viewport.zoom}px`;
  labelElement.style.fontFamily =
    elementModel.labelStyle?.fontFamily || 'Inter';
  labelElement.style.color = renderer.getColorValue(
    elementModel.labelStyle?.color || DefaultTheme.black,
    DefaultTheme.black,
    true
  );
  labelElement.style.textAlign = elementModel.labelStyle?.textAlign || 'center';
  labelElement.style.overflow = 'hidden';
  labelElement.style.whiteSpace = 'nowrap';
  labelElement.style.textOverflow = 'ellipsis';

  // Set label text content
  labelElement.textContent = elementModel.text.toString();

  domElement.appendChild(labelElement);
}

// Export the extension
import { DomElementRendererExtension } from '../../extensions/dom-element-renderer.js';

export const ConnectorDomRendererExtension = DomElementRendererExtension(
  'connector',
  connectorDomRenderer
);
