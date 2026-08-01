import { strict as assert } from "node:assert";
import { performance } from "node:perf_hooks";
import test from "node:test";

import {
  buildRoundedUnionPath,
  classifyAdjacentCorners,
  createSelectionBox,
  groupBoxesIntoLines,
  loopsToRoundedPath,
  unionBoxesToLoops,
  viewportRectToLocalBox,
  type SelectionBox,
} from "../src/selection-geometry.js";

const box = (left: number, top: number, right: number, bottom: number) =>
  createSelectionBox(left, top, right, bottom);

test("viewport coordinates convert once into scaled local coordinates", () => {
  const local = viewportRectToLocalBox(
    { left: 120, top: 240, right: 320, bottom: 300 },
    {
      viewportLeft: 100,
      viewportTop: 200,
      scrollLeft: 10,
      scrollTop: 20,
      clientLeft: 2,
      clientTop: 4,
      scaleX: 2,
      scaleY: 2,
    },
    2,
    1,
    0,
  );

  assert.deepEqual(local, {
    left: 16,
    top: 35,
    right: 120,
    bottom: 67,
    width: 104,
    height: 32,
  });
});

test("single rectangle creates one closed rounded contour", () => {
  const loops = unionBoxesToLoops([box(0, 0, 100, 20)], 100);
  assert.ok(loops);
  assert.equal(loops.length, 1);
  assert.equal(loops[0].length, 4);

  const path = buildRoundedUnionPath([box(0, 0, 100, 20)], 6, 100);
  assert.match(path ?? "", /^M /);
  assert.match(path ?? "", / Q /);
  assert.match(path ?? "", / Z$/);
});

test("overlapping multiline rectangles become one concave contour", () => {
  const loops = unionBoxesToLoops(
    [box(0, 0, 100, 20), box(20, 20, 80, 40)],
    100,
  );
  assert.ok(loops);
  assert.equal(loops.length, 1);
  assert.equal(loops[0].length, 8);
});

test("disconnected rectangles remain separate contours", () => {
  const loops = unionBoxesToLoops(
    [box(0, 0, 20, 20), box(40, 0, 60, 20)],
    100,
  );
  assert.ok(loops);
  assert.equal(loops.length, 2);
});

test("diagonal contact does not incorrectly join contours", () => {
  const loops = unionBoxesToLoops(
    [box(0, 0, 20, 20), box(20, 20, 40, 40)],
    100,
  );
  assert.ok(loops);
  assert.equal(loops.length, 2);
});

test("rectangle frame produces an outer contour and a hole", () => {
  const loops = unionBoxesToLoops(
    [
      box(0, 0, 100, 20),
      box(0, 80, 100, 100),
      box(0, 20, 20, 80),
      box(80, 20, 100, 80),
    ],
    500,
  );
  assert.ok(loops);
  assert.equal(loops.length, 2);
  assert.equal((loopsToRoundedPath(loops, 4).match(/Z/g) ?? []).length, 2);
});

test("adjacent corner classification detects inner and outer corners", () => {
  const lines = [
    { top: 0, bottom: 20, fragments: [box(0, 0, 100, 20)] },
    { top: 20, bottom: 40, fragments: [box(20, 20, 80, 40)] },
  ];
  const styled = classifyAdjacentCorners(lines, 1);
  assert.equal(styled[0].corners.bottomLeft, "outer");
  assert.equal(styled[0].corners.bottomRight, "outer");
  assert.equal(styled[1].corners.topLeft, "inner");
  assert.equal(styled[1].corners.topRight, "inner");
});

test("same-line fragments merge while real gaps remain separate", () => {
  const lines = groupBoxesIntoLines(
    [
      box(0, 0, 20, 20),
      box(20.5, 0.2, 40, 19.8),
      box(60, 0, 80, 20),
      box(0, 25, 20, 45),
    ],
    2,
    1,
  );
  assert.equal(lines.length, 2);
  assert.equal(lines[0].fragments.length, 2);
  assert.equal(lines[0].fragments[0].left, 0);
  assert.equal(lines[0].fragments[0].right, 40);
});

test("complexity guard falls back instead of returning a malformed path", () => {
  const boxes = Array.from({ length: 20 }, (_, index) =>
    box(index * 2, index * 2, index * 2 + 10, index * 2 + 10),
  );
  assert.equal(unionBoxesToLoops(boxes, 8), null);
});

function signedArea(loop: readonly { x: number; y: number }[]): number {
  let area = 0;
  for (let index = 0; index < loop.length; index += 1) {
    const current = loop[index];
    const next = loop[(index + 1) % loop.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function exactUnionArea(boxes: readonly SelectionBox[]): number {
  const xs = [...new Set(boxes.flatMap((item) => [item.left, item.right]))].sort(
    (a, b) => a - b,
  );
  const ys = [...new Set(boxes.flatMap((item) => [item.top, item.bottom]))].sort(
    (a, b) => a - b,
  );
  let area = 0;

  for (let yIndex = 0; yIndex + 1 < ys.length; yIndex += 1) {
    for (let xIndex = 0; xIndex + 1 < xs.length; xIndex += 1) {
      const centerX = (xs[xIndex] + xs[xIndex + 1]) / 2;
      const centerY = (ys[yIndex] + ys[yIndex + 1]) / 2;
      if (
        boxes.some(
          (item) =>
            centerX > item.left &&
            centerX < item.right &&
            centerY > item.top &&
            centerY < item.bottom,
        )
      ) {
        area +=
          (xs[xIndex + 1] - xs[xIndex]) * (ys[yIndex + 1] - ys[yIndex]);
      }
    }
  }

  return area;
}

test("sweep contours preserve exact union area for random inputs", () => {
  let seed = 0x12345678;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };

  for (let sample = 0; sample < 150; sample += 1) {
    const count = 1 + Math.floor(random() * 12);
    const boxes: SelectionBox[] = [];

    for (let index = 0; index < count; index += 1) {
      const left = Math.floor(random() * 20);
      const top = Math.floor(random() * 20);
      const width = 1 + Math.floor(random() * 10);
      const height = 1 + Math.floor(random() * 10);
      boxes.push(box(left, top, left + width, top + height));
    }

    const loops = unionBoxesToLoops(boxes, 5_000);
    assert.ok(loops, `sample ${sample} exceeded complexity unexpectedly`);
    const contourArea = loops.reduce(
      (sum, loop) => sum + signedArea(loop),
      0,
    );
    assert.equal(contourArea, exactUnionArea(boxes), `sample ${sample}`);
  }
});

test("500-line contour remains within a practical CPU guard", () => {
  const boxes = Array.from({ length: 500 }, (_, index) => {
    const left = (index % 7) * 2;
    const right = 600 - (index % 11) * 3;
    return box(left, index * 18, right, (index + 1) * 18);
  });

  const started = performance.now();
  const path = buildRoundedUnionPath(boxes, 6, 20_000);
  const elapsed = performance.now() - started;

  assert.ok(path && path.length > 0);
  assert.ok(elapsed < 250, `elapsed ${elapsed.toFixed(2)}ms`);
});
