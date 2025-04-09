import {
  Bound,
  getCenterAreaBounds,
  getNearestPointFromEllipse,
  getPointsFromBoundWithRotation,
  type IBound,
  type IVec,
  linePolygonIntersects,
  pointInEllipse,
  pointInPolygon,
  PointLocation,
  pointOnPolygonStoke,
  polygonNearestPoint,
  rotatePoints,
  toRadian,
  Vec,
} from '@blocksuite/global/gfx';
import type { PointTestOptions } from '@blocksuite/std/gfx';

import { DEFAULT_CENTRAL_AREA_RATIO } from '../../../consts/index';
import type { ShapeElementModel } from '../shape';

export const capsule = {
  // Six points
  points({ x, y, w, h }: IBound): IVec[] {
    const cx = w / 2;
    const cy = h / 2;
    const isHorizontal = w > h;
    const r = isHorizontal ? cy : cx;
    const indices = isHorizontal
      ? [
          // left
          [0, r],

          [r, 0],
          [w - r, 0],

          // right
          [w, r],

          [w - r, h],
          [r, h],
        ]
      : [
          // top
          [r, 0],

          [w, r],
          [w, h - r],

          // bottom
          [r, h],

          [0, h - r],
          [0, r],
        ];

    return indices.map(p => [x + p[0], y + p[1]]);
  },

  draw(ctx: CanvasRenderingContext2D, { x, y, w, h, rotate = 0 }: IBound) {
    const cx = w / 2;
    const cy = h / 2;
    const isHorizontal = w > h;
    const r = isHorizontal ? cy : cx;
    const startAngle = isHorizontal ? Math.PI / 2 : Math.PI;
    const matrix = ctx
      .getTransform()
      .translate(x, y)
      .translateSelf(cx, cy)
      .rotateSelf(rotate)
      .translateSelf(-cx, -cy);

    ctx.save();
    ctx.setTransform(matrix);

    ctx.beginPath();

    // Two semicircles
    ctx.arc(r, r, r, startAngle, startAngle + Math.PI);
    ctx.arc(w - r, h - r, r, startAngle + Math.PI, startAngle + Math.PI * 2);

    ctx.closePath();

    ctx.restore();
  },

  // TODO(@fundon): should improve it
  includesPoint(
    this: ShapeElementModel,
    px: number,
    py: number,
    options: PointTestOptions
  ) {
    const point: IVec = [px, py];
    const threshold = (options?.hitThreshold ?? 1) / (options?.zoom ?? 1);
    const { rotate, xywh } = this;
    const bounds = Bound.deserialize(xywh);
    const { center, x, y, w, h } = bounds;
    const rad = toRadian(rotate);
    const filled = !options.ignoreTransparent || this.filled;

    let hit = false;

    // Horizontal
    if (w > h) {
      const r = h / 2;
      const indices: IVec[] = [
        [x + r, y],
        [x + w - r, y],
        [x + r, y + h],
        [x + w - r, y + h],
      ];
      const points = indices.map(vec => Vec.rotWith(vec, center, rad));

      const topPoints = points.slice(0, 2);
      const bottomPoints = points.slice(2, 4);

      // Left semicircle
      const isLeft = Vec.isLeft(point, topPoints[0], bottomPoints[0]) > 0;
      // Right semicircle
      const isRight = Vec.isLeft(point, topPoints[1], bottomPoints[1]) < 0;

      if (isLeft) {
        const center = Vec.med(topPoints[0], bottomPoints[0]);
        hit =
          pointInEllipse(point, center, r + threshold, r + threshold, rad) &&
          !pointInEllipse(point, center, r - threshold, r - threshold, rad);

        if (filled) {
          hit ||= pointInEllipse(point, center, r, r, rad);
        }
      } else if (isRight) {
        const center = Vec.med(topPoints[1], bottomPoints[1]);
        hit =
          pointInEllipse(point, center, r + threshold, r + threshold, rad) &&
          !pointInEllipse(point, center, r - threshold, r - threshold, rad);

        if (filled) {
          hit ||= pointInEllipse(point, center, r, r, rad);
        }
      } else {
        hit =
          pointOnPolygonStoke(point, topPoints, threshold) ||
          pointOnPolygonStoke(point, bottomPoints, threshold);

        if (filled) {
          hit ||= pointInPolygon(point, [
            ...topPoints,
            bottomPoints[1],
            bottomPoints[0],
          ]);
        }
      }

      if (!hit) {
        // If shape is not filled or transparent
        const text = this.text;
        if (!text || !text.length) {
          // if not, check the default center area of the shape
          const centralBounds = getCenterAreaBounds(
            bounds.expand([-r, 0]),
            DEFAULT_CENTRAL_AREA_RATIO
          );
          const centralPoints = getPointsFromBoundWithRotation(centralBounds);
          // Check if the point is in the center area
          hit = pointInPolygon([x, y], centralPoints);
        } else if (this.textBound) {
          hit = pointInPolygon(
            point,
            getPointsFromBoundWithRotation(
              this,
              () => Bound.from(this.textBound!).points
            )
          );
        }
      }

      return hit;
    }

    // Vertical

    const r = w / 2;
    const indices: IVec[] = [
      [x, y + r],
      [x, y + h - r],
      [x + w, y + r],
      [x + w, y + h - r],
    ];
    const points = indices.map(vec => Vec.rotWith(vec, center, rad));

    const leftPoints = points.slice(0, 2);
    const rightPoints = points.slice(2, 4);

    // Top semicircle
    const isTop = Vec.isLeft(point, rightPoints[0], leftPoints[0]) > 0;
    // Bottom semicircle
    const isBottom = Vec.isLeft(point, rightPoints[1], leftPoints[1]) < 0;

    if (isTop) {
      const center = Vec.med(leftPoints[0], rightPoints[0]);
      hit =
        pointInEllipse(point, center, r + threshold, r + threshold, rad) &&
        !pointInEllipse(point, center, r - threshold, r - threshold, rad);

      if (filled) {
        hit ||= pointInEllipse(point, center, r, r, rad);
      }
    } else if (isBottom) {
      const center = Vec.med(leftPoints[1], rightPoints[1]);
      hit =
        pointInEllipse(point, center, r + threshold, r + threshold, rad) &&
        !pointInEllipse(point, center, r - threshold, r - threshold, rad);

      if (filled) {
        hit ||= pointInEllipse(point, center, r, r, rad);
      }
    } else {
      hit =
        pointOnPolygonStoke(point, leftPoints, threshold) ||
        pointOnPolygonStoke(point, rightPoints, threshold);

      if (filled) {
        hit ||= pointInPolygon(point, [
          ...leftPoints,
          rightPoints[1],
          rightPoints[0],
        ]);
      }
    }

    if (!hit) {
      // If shape is not filled or transparent
      const text = this.text;
      if (!text || !text.length) {
        // if not, check the default center area of the shape
        const centralBounds = getCenterAreaBounds(
          bounds.expand([0, -r]),
          DEFAULT_CENTRAL_AREA_RATIO
        );
        const centralPoints = getPointsFromBoundWithRotation(centralBounds);
        // Check if the point is in the center area
        hit = pointInPolygon([x, y], centralPoints);
      } else if (this.textBound) {
        hit = pointInPolygon(
          point,
          getPointsFromBoundWithRotation(
            this,
            () => Bound.from(this.textBound!).points
          )
        );
      }
    }

    return hit;
  },

  containsBound(bounds: Bound, element: ShapeElementModel): boolean {
    const points = getPointsFromBoundWithRotation(element, capsule.points);
    return points.some(point => bounds.containsPoint(point));
  },

  getNearestPoint(point: IVec, element: ShapeElementModel) {
    const { rotate, xywh } = element;
    const { center, x, y, w, h } = Bound.deserialize(xywh);
    const rad = toRadian(rotate);

    // Horizontal
    if (w > h) {
      const r = h / 2;
      const indices: IVec[] = [
        [x + r, y],
        [x + w - r, y],
        [x + r, y + h],
        [x + w - r, y + h],
      ];
      const points = indices.map(vec => Vec.rotWith(vec, center, rad));

      const topPoints = points.slice(0, 2);
      const bottomPoints = points.slice(2, 4);

      // Left semicircle
      const isLeft = Vec.isLeft(point, topPoints[0], bottomPoints[0]) > 0;
      // Right semicircle
      const isRight = Vec.isLeft(point, topPoints[1], bottomPoints[1]) < 0;

      if (isLeft || isRight) {
        const center: IVec = isLeft
          ? Vec.med(topPoints[0], bottomPoints[0])
          : Vec.med(topPoints[1], bottomPoints[1]);
        return getNearestPointFromEllipse(point, center, rad, r);
      }

      const topNearestPoint = polygonNearestPoint(topPoints, point);
      const bottomNearestPoint = polygonNearestPoint(bottomPoints, point);

      const topDist = Vec.dist(topNearestPoint, point);
      const bottomDist = Vec.dist(bottomNearestPoint, point);

      return topDist > bottomDist ? bottomNearestPoint : topNearestPoint;
    }

    // Vertical

    const r = w / 2;
    const indices: IVec[] = [
      [x, y + r],
      [x, y + h - r],
      [x + w, y + r],
      [x + w, y + h - r],
    ];
    const points = indices.map(vec => Vec.rotWith(vec, center, rad));

    const leftPoints = points.slice(0, 2);
    const rightPoints = points.slice(2, 4);

    // Top semicircle
    const isTop = Vec.isLeft(point, rightPoints[0], leftPoints[0]) > 0;
    // Bottom semicircle
    const isBottom = Vec.isLeft(point, rightPoints[1], leftPoints[1]) < 0;

    if (isTop || isBottom) {
      const center: IVec = isTop
        ? Vec.med(leftPoints[0], rightPoints[0])
        : Vec.med(leftPoints[1], rightPoints[1]);
      return getNearestPointFromEllipse(point, center, rad, r);
    }

    const leftNearestPoint = polygonNearestPoint(leftPoints, point);
    const rightNearestPoint = polygonNearestPoint(rightPoints, point);

    const leftDist = Vec.dist(leftNearestPoint, point);
    const rightDist = Vec.dist(rightNearestPoint, point);

    return leftDist > rightDist ? rightNearestPoint : leftNearestPoint;
  },

  getLineIntersections(start: IVec, end: IVec, element: ShapeElementModel) {
    const points = getPointsFromBoundWithRotation(element);
    return linePolygonIntersects(start, end, points);
  },

  getRelativePointLocation(
    relativePoint: IVec,
    { rotate = 0, xywh }: ShapeElementModel
  ) {
    const bounds = Bound.deserialize(xywh);
    const point = bounds.getRelativePoint(relativePoint);
    const { center } = bounds;
    const points = rotatePoints(
      capsule.points(bounds).concat([point]),
      center,
      rotate
    );
    const rotatedPoint = points.pop()!;
    const len = points.length;
    let tangent: IVec = [0, 0.5];
    let i = 0;

    for (; i < len; i++) {
      const p0 = points[i];
      const p1 = points[(i + 1) % len];
      const bounds = Bound.fromPoints([p0, p1, center]);
      if (bounds.containsPoint(rotatedPoint)) {
        tangent = Vec.normalize(Vec.sub(p1, p0));
        break;
      }
    }

    return new PointLocation(rotatedPoint, tangent);
  },
};
