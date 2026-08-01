export type SelectionBox = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}>;

export type MutableSelectionBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type ViewportRect = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
}>;

export type LocalCoordinateSpace = Readonly<{
  viewportLeft: number;
  viewportTop: number;
  scrollLeft: number;
  scrollTop: number;
  clientLeft: number;
  clientTop: number;
  scaleX: number;
  scaleY: number;
}>;

export type SelectionLine = {
  top: number;
  bottom: number;
  fragments: MutableSelectionBox[];
};

export type CornerKind = "outer" | "inner" | "flat";

export type CornerStyles = {
  topLeft: CornerKind;
  topRight: CornerKind;
  bottomLeft: CornerKind;
  bottomRight: CornerKind;
};

export type StyledSelectionFragment = {
  box: MutableSelectionBox;
  corners: CornerStyles;
};

type Point = Readonly<{ x: number; y: number }>;
type Interval = Readonly<{ left: number; right: number }>;

type DirectedEdge = {
  from: Point;
  to: Point;
  direction: 0 | 1 | 2 | 3;
};

export function createSelectionBox(
  left: number,
  top: number,
  right: number,
  bottom: number,
): MutableSelectionBox {
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export function cloneSelectionBox(box: SelectionBox): MutableSelectionBox {
  return createSelectionBox(box.left, box.top, box.right, box.bottom);
}

export function quantize(value: number, step: number): number {
  if (!Number.isFinite(step) || step <= 0) {
    return value;
  }
  return Math.round(value / step) * step;
}

export function viewportRectToLocalBox(
  rect: ViewportRect,
  space: LocalCoordinateSpace,
  horizontalPadding: number,
  verticalPadding: number,
  quantizationStep: number,
): MutableSelectionBox {
  const scaleX =
    Number.isFinite(space.scaleX) && space.scaleX > 0 ? space.scaleX : 1;
  const scaleY =
    Number.isFinite(space.scaleY) && space.scaleY > 0 ? space.scaleY : 1;

  const left =
    (rect.left - space.viewportLeft) / scaleX +
    space.scrollLeft -
    space.clientLeft -
    horizontalPadding;
  const top =
    (rect.top - space.viewportTop) / scaleY +
    space.scrollTop -
    space.clientTop -
    verticalPadding;
  const right =
    (rect.right - space.viewportLeft) / scaleX +
    space.scrollLeft -
    space.clientLeft +
    horizontalPadding;
  const bottom =
    (rect.bottom - space.viewportTop) / scaleY +
    space.scrollTop -
    space.clientTop +
    verticalPadding;

  return createSelectionBox(
    quantize(left, quantizationStep),
    quantize(top, quantizationStep),
    quantize(right, quantizationStep),
    quantize(bottom, quantizationStep),
  );
}

function approximatelyEqual(a: number, b: number, epsilon: number): boolean {
  return Math.abs(a - b) <= epsilon;
}

function horizontalOverlap(a: SelectionBox, b: SelectionBox): number {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
}

function verticalOverlap(a: SelectionBox, b: SelectionBox): number {
  return Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
}

function boxesAreOnSameLine(
  a: SelectionBox,
  b: SelectionBox,
  tolerance: number,
): boolean {
  const overlap = verticalOverlap(a, b);
  const minHeight = Math.min(a.height, b.height);

  if (minHeight > 0 && overlap / minHeight >= 0.55) {
    return true;
  }

  const centerA = (a.top + a.bottom) / 2;
  const centerB = (b.top + b.bottom) / 2;
  return Math.abs(centerA - centerB) <= tolerance;
}

export function mergeBoxesOnLine(
  boxes: readonly SelectionBox[],
  gapTolerance: number,
): MutableSelectionBox[] {
  if (boxes.length <= 1) {
    return boxes.map(cloneSelectionBox);
  }

  const sorted = boxes
    .map(cloneSelectionBox)
    .sort((a, b) => a.left - b.left || a.right - b.right);

  const result: MutableSelectionBox[] = [];
  let current = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const next = sorted[index];

    if (next.left <= current.right + gapTolerance) {
      current = createSelectionBox(
        Math.min(current.left, next.left),
        Math.min(current.top, next.top),
        Math.max(current.right, next.right),
        Math.max(current.bottom, next.bottom),
      );
    } else {
      result.push(current);
      current = next;
    }
  }

  result.push(current);
  return result;
}

export function groupBoxesIntoLines(
  boxes: readonly SelectionBox[],
  lineTolerance: number,
  fragmentGapTolerance: number,
): SelectionLine[] {
  const sorted = boxes
    .map(cloneSelectionBox)
    .sort((a, b) => a.top - b.top || a.left - b.left);

  const lines: SelectionLine[] = [];

  for (const box of sorted) {
    let selectedLine: SelectionLine | undefined;
    let selectedScore = Number.NEGATIVE_INFINITY;

    // A fragment with a slightly different top can be sorted after the first
    // fragment of the next line. Looking back a few candidates is more robust
    // than only comparing against the latest line and stays O(n) in practice.
    for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex -= 1) {
      const line = lines[lineIndex];
      if (box.top - line.bottom > lineTolerance * 2 + box.height) {
        break;
      }

      const lineBox = createSelectionBox(0, line.top, 1, line.bottom);
      if (!boxesAreOnSameLine(lineBox, box, lineTolerance)) {
        continue;
      }

      const overlap = verticalOverlap(lineBox, box);
      const centerDelta = Math.abs(
        (line.top + line.bottom) / 2 - (box.top + box.bottom) / 2,
      );
      const score = overlap * 1000 - centerDelta;
      if (score > selectedScore) {
        selectedLine = line;
        selectedScore = score;
      }
    }

    if (selectedLine) {
      selectedLine.top = Math.min(selectedLine.top, box.top);
      selectedLine.bottom = Math.max(selectedLine.bottom, box.bottom);
      selectedLine.fragments.push(box);
    } else {
      lines.push({ top: box.top, bottom: box.bottom, fragments: [box] });
    }
  }

  lines.sort((a, b) => a.top - b.top);

  for (const line of lines) {
    line.fragments = mergeBoxesOnLine(
      line.fragments,
      fragmentGapTolerance,
    ).map((fragment) =>
      createSelectionBox(fragment.left, line.top, fragment.right, line.bottom),
    );
  }

  return lines;
}

export function bridgeSmallLineGaps(
  lines: readonly SelectionLine[],
  maxBridgeGap: number,
): SelectionLine[] {
  const result = lines.map((line) => ({
    top: line.top,
    bottom: line.bottom,
    fragments: line.fragments.map(cloneSelectionBox),
  }));

  for (let index = 0; index + 1 < result.length; index += 1) {
    const current = result[index];
    const next = result[index + 1];
    const gap = next.top - current.bottom;

    if (Math.abs(gap) <= maxBridgeGap) {
      const sharedBoundary = current.bottom + gap / 2;
      current.bottom = sharedBoundary;
      next.top = sharedBoundary;
      current.fragments = current.fragments.map((box) =>
        createSelectionBox(box.left, box.top, box.right, sharedBoundary),
      );
      next.fragments = next.fragments.map((box) =>
        createSelectionBox(box.left, sharedBoundary, box.right, box.bottom),
      );
    }
  }

  return result;
}

function findBestAdjacentFragment(
  box: SelectionBox,
  adjacentLine: SelectionLine | undefined,
  epsilon: number,
): MutableSelectionBox | null {
  if (!adjacentLine) {
    return null;
  }

  let best: MutableSelectionBox | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of adjacentLine.fragments) {
    const overlap = horizontalOverlap(box, candidate);
    const horizontalGap = Math.max(
      0,
      Math.max(candidate.left - box.right, box.left - candidate.right),
    );

    if (overlap <= 0 && horizontalGap > epsilon * 2) {
      continue;
    }

    const score = overlap * 1000 - horizontalGap;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

export function classifyAdjacentCorners(
  lines: readonly SelectionLine[],
  epsilon: number,
): StyledSelectionFragment[] {
  const styled: StyledSelectionFragment[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];

    for (const box of line.fragments) {
      const above = findBestAdjacentFragment(box, lines[lineIndex - 1], epsilon);
      const below = findBestAdjacentFragment(box, lines[lineIndex + 1], epsilon);

      const topLeft: CornerKind = !above
        ? "outer"
        : approximatelyEqual(box.left, above.left, epsilon)
          ? "flat"
          : box.left > above.left && box.left < above.right
            ? "inner"
            : "outer";

      const topRight: CornerKind = !above
        ? "outer"
        : approximatelyEqual(box.right, above.right, epsilon)
          ? "flat"
          : box.right < above.right && box.right > above.left
            ? "inner"
            : "outer";

      const bottomLeft: CornerKind = !below
        ? "outer"
        : approximatelyEqual(box.left, below.left, epsilon)
          ? "flat"
          : box.left > below.left && box.left < below.right
            ? "inner"
            : "outer";

      const bottomRight: CornerKind = !below
        ? "outer"
        : approximatelyEqual(box.right, below.right, epsilon)
          ? "flat"
          : box.right < below.right && box.right > below.left
            ? "inner"
            : "outer";

      styled.push({
        box,
        corners: { topLeft, topRight, bottomLeft, bottomRight },
      });
    }
  }

  return styled;
}

function uniqueSorted(values: readonly number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  if (intervals.length <= 1) {
    return intervals.map((interval) => ({ ...interval }));
  }

  const sorted = [...intervals].sort(
    (a, b) => a.left - b.left || a.right - b.right,
  );
  const result: Interval[] = [];
  let current = { ...sorted[0] };

  for (let index = 1; index < sorted.length; index += 1) {
    const next = sorted[index];
    if (next.left <= current.right) {
      current.right = Math.max(current.right, next.right);
    } else {
      result.push(current);
      current = { ...next };
    }
  }

  result.push(current);
  return result;
}

function subtractIntervals(
  source: readonly Interval[],
  cover: readonly Interval[],
): Interval[] {
  const result: Interval[] = [];
  let coverIndex = 0;

  for (const sourceInterval of source) {
    let cursor = sourceInterval.left;

    while (
      coverIndex < cover.length &&
      cover[coverIndex].right <= sourceInterval.left
    ) {
      coverIndex += 1;
    }

    let index = coverIndex;
    while (index < cover.length && cover[index].left < sourceInterval.right) {
      const coverInterval = cover[index];
      if (coverInterval.left > cursor) {
        result.push({
          left: cursor,
          right: Math.min(coverInterval.left, sourceInterval.right),
        });
      }
      cursor = Math.max(cursor, coverInterval.right);
      if (cursor >= sourceInterval.right) {
        break;
      }
      index += 1;
    }

    if (cursor < sourceInterval.right) {
      result.push({ left: cursor, right: sourceInterval.right });
    }
  }

  return result.filter((interval) => interval.right > interval.left);
}

function pointKey(point: Point): string {
  return `${point.x},${point.y}`;
}

function edgeDirection(from: Point, to: Point): 0 | 1 | 2 | 3 {
  if (to.x > from.x) return 0;
  if (to.y > from.y) return 1;
  if (to.x < from.x) return 2;
  return 3;
}

function chooseNextEdge(
  currentDirection: DirectedEdge["direction"],
  candidates: readonly number[],
  edges: readonly DirectedEdge[],
): number {
  // Prefer a right turn, then straight, then left. This keeps the filled
  // region on the right side of the path and separates diagonal contacts.
  const preferredTurns = [1, 0, 3, 2];
  let selected = candidates[0];
  let selectedRank = Number.POSITIVE_INFINITY;

  for (const candidateIndex of candidates) {
    const candidateDirection = edges[candidateIndex].direction;
    const turn = (candidateDirection - currentDirection + 4) % 4;
    const rank = preferredTurns.indexOf(turn);
    if (rank < selectedRank) {
      selected = candidateIndex;
      selectedRank = rank;
    }
  }

  return selected;
}

function simplifyLoop(points: readonly Point[]): Point[] {
  if (points.length < 3) {
    return [...points];
  }

  const deduplicated: Point[] = [];
  for (const point of points) {
    const previous = deduplicated.at(-1);
    if (!previous || previous.x !== point.x || previous.y !== point.y) {
      deduplicated.push(point);
    }
  }

  if (
    deduplicated.length > 1 &&
    deduplicated[0].x === deduplicated.at(-1)?.x &&
    deduplicated[0].y === deduplicated.at(-1)?.y
  ) {
    deduplicated.pop();
  }

  if (deduplicated.length < 3) {
    return deduplicated;
  }

  return deduplicated.filter((point, index, all) => {
    const previous = all[(index - 1 + all.length) % all.length];
    const next = all[(index + 1) % all.length];
    const vertical = previous.x === point.x && point.x === next.x;
    const horizontal = previous.y === point.y && point.y === next.y;
    return !vertical && !horizontal;
  });
}

function traceLoops(
  edges: readonly DirectedEdge[],
  maxSegments: number,
): Point[][] | null {
  if (edges.length > maxSegments) {
    return null;
  }

  const outgoing = new Map<string, number[]>();
  edges.forEach((edge, index) => {
    const key = pointKey(edge.from);
    const bucket = outgoing.get(key);
    if (bucket) {
      bucket.push(index);
    } else {
      outgoing.set(key, [index]);
    }
  });

  const used = new Uint8Array(edges.length);
  const loops: Point[][] = [];

  for (let startEdgeIndex = 0; startEdgeIndex < edges.length; startEdgeIndex += 1) {
    if (used[startEdgeIndex]) {
      continue;
    }

    const startPoint = edges[startEdgeIndex].from;
    const points: Point[] = [startPoint];
    let edgeIndex = startEdgeIndex;
    let closed = false;

    for (let guard = 0; guard <= edges.length; guard += 1) {
      const edge = edges[edgeIndex];
      used[edgeIndex] = 1;
      points.push(edge.to);

      if (edge.to.x === startPoint.x && edge.to.y === startPoint.y) {
        closed = true;
        break;
      }

      const candidates = (outgoing.get(pointKey(edge.to)) ?? []).filter(
        (candidate) => !used[candidate],
      );
      if (candidates.length === 0) {
        break;
      }

      edgeIndex =
        candidates.length === 1
          ? candidates[0]
          : chooseNextEdge(edge.direction, candidates, edges);
    }

    if (!closed) {
      // A rectangle union must always produce closed contours. Returning null
      // is safer than displaying a malformed partial path.
      return null;
    }

    const simplified = simplifyLoop(points);
    if (simplified.length >= 3) {
      loops.push(simplified);
    }
  }

  return loops;
}

/**
 * Builds contours of an axis-aligned rectangle union using horizontal sweep
 * bands. Unlike a compressed occupancy grid, memory grows with produced
 * boundary segments rather than uniqueX * uniqueY.
 */
export function unionBoxesToLoops(
  boxes: readonly SelectionBox[],
  maxSegments: number,
): Point[][] | null {
  if (boxes.length === 0) {
    return [];
  }

  const ys = uniqueSorted(boxes.flatMap((box) => [box.top, box.bottom]));
  if (ys.length < 2) {
    return [];
  }

  const yIndices = new Map(ys.map((value, index) => [value, index]));
  const rawBands: Interval[][] = Array.from(
    { length: ys.length - 1 },
    () => [],
  );
  let intervalAssignments = 0;

  for (const box of boxes) {
    const topIndex = yIndices.get(box.top);
    const bottomIndex = yIndices.get(box.bottom);
    if (topIndex === undefined || bottomIndex === undefined) {
      continue;
    }

    for (let band = topIndex; band < bottomIndex; band += 1) {
      rawBands[band].push({ left: box.left, right: box.right });
      intervalAssignments += 1;
      if (intervalAssignments > maxSegments * 8) {
        return null;
      }
    }
  }

  const bands = rawBands.map(mergeIntervals);
  const edges: DirectedEdge[] = [];
  const addEdge = (from: Point, to: Point): boolean => {
    if (from.x === to.x && from.y === to.y) {
      return true;
    }
    edges.push({ from, to, direction: edgeDirection(from, to) });
    return edges.length <= maxSegments;
  };

  for (let bandIndex = 0; bandIndex < bands.length; bandIndex += 1) {
    const current = bands[bandIndex];
    if (current.length === 0) {
      continue;
    }

    const above = bandIndex > 0 ? bands[bandIndex - 1] : [];
    const below = bandIndex + 1 < bands.length ? bands[bandIndex + 1] : [];
    const top = ys[bandIndex];
    const bottom = ys[bandIndex + 1];

    for (const interval of current) {
      if (
        !addEdge(
          { x: interval.left, y: bottom },
          { x: interval.left, y: top },
        ) ||
        !addEdge(
          { x: interval.right, y: top },
          { x: interval.right, y: bottom },
        )
      ) {
        return null;
      }
    }

    for (const segment of subtractIntervals(current, above)) {
      if (
        !addEdge(
          { x: segment.left, y: top },
          { x: segment.right, y: top },
        )
      ) {
        return null;
      }
    }

    for (const segment of subtractIntervals(current, below)) {
      if (
        !addEdge(
          { x: segment.right, y: bottom },
          { x: segment.left, y: bottom },
        )
      ) {
        return null;
      }
    }
  }

  return traceLoops(edges, maxSegments);
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function moveToward(from: Point, to: Point, amount: number): Point {
  const total = distance(from, to);
  if (total === 0 || amount === 0) {
    return from;
  }

  const ratio = Math.min(1, amount / total);
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

export function loopsToRoundedPath(
  loops: readonly (readonly Point[])[],
  radius: number,
): string {
  const commands: string[] = [];
  const safeRadius = Math.max(0, radius);

  for (const loop of loops) {
    if (loop.length < 3) {
      continue;
    }

    const localRadii = loop.map((point, index) => {
      const previous = loop[(index - 1 + loop.length) % loop.length];
      const next = loop[(index + 1) % loop.length];
      return Math.min(
        safeRadius,
        distance(point, previous) / 2,
        distance(point, next) / 2,
      );
    });

    const incoming = loop.map((point, index) =>
      moveToward(
        point,
        loop[(index - 1 + loop.length) % loop.length],
        localRadii[index],
      ),
    );
    const outgoing = loop.map((point, index) =>
      moveToward(
        point,
        loop[(index + 1) % loop.length],
        localRadii[index],
      ),
    );

    commands.push(
      `M ${formatNumber(outgoing[0].x)} ${formatNumber(outgoing[0].y)}`,
    );

    for (let index = 1; index < loop.length; index += 1) {
      commands.push(
        `L ${formatNumber(incoming[index].x)} ${formatNumber(incoming[index].y)}`,
      );
      commands.push(
        `Q ${formatNumber(loop[index].x)} ${formatNumber(loop[index].y)} ${formatNumber(outgoing[index].x)} ${formatNumber(outgoing[index].y)}`,
      );
    }

    commands.push(
      `L ${formatNumber(incoming[0].x)} ${formatNumber(incoming[0].y)}`,
    );
    commands.push(
      `Q ${formatNumber(loop[0].x)} ${formatNumber(loop[0].y)} ${formatNumber(outgoing[0].x)} ${formatNumber(outgoing[0].y)}`,
    );
    commands.push("Z");
  }

  return commands.join(" ");
}

export function buildRoundedUnionPath(
  boxes: readonly SelectionBox[],
  radius: number,
  maxSegments: number,
): string | null {
  const loops = unionBoxesToLoops(boxes, maxSegments);
  return loops === null ? null : loopsToRoundedPath(loops, radius);
}
