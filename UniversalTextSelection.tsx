"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";

import {
  bridgeSmallLineGaps,
  buildRoundedUnionPath,
  classifyAdjacentCorners,
  cloneSelectionBox,
  groupBoxesIntoLines,
  viewportRectToLocalBox,
  type CornerStyles,
  type MutableSelectionBox,
  type SelectionBox,
  type SelectionLine,
} from "./selection-geometry";

export type { SelectionBox } from "./selection-geometry";

export type SelectionRenderMode =
  | "fragment-fill"
  | "contour-union"
  | "adjacent-corners";

export type SelectionGranularity = "range" | "text-node";

export interface SelectionSnapshot {
  readonly text: string;
  readonly boxes: readonly SelectionBox[];
  readonly lineBoxes: readonly SelectionBox[];
  readonly mode: SelectionRenderMode;
}

export interface UniversalTextSelectionHandle {
  refresh(): void;
  clear(): void;
  getSnapshot(): SelectionSnapshot | null;
  getRootElement(): HTMLDivElement | null;
}

export interface UniversalTextSelectionProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children" | "dangerouslySetInnerHTML" | "onChange" | "ref"
  > {
  children: ReactNode;
  ref?: Ref<UniversalTextSelectionHandle>;
  mode?: SelectionRenderMode;
  granularity?: SelectionGranularity;
  selectionColor?: string;
  surfaceColor?: string;
  radius?: number;
  horizontalPadding?: number;
  verticalPadding?: number;
  lineTolerance?: number;
  fragmentGapTolerance?: number;
  bridgeLineGaps?: boolean;
  maxBridgeGap?: number;
  quantizationStep?: number;
  maxRects?: number;
  maxContourSegments?: number;
  /** @deprecated Use maxContourSegments. Retained for source compatibility. */
  maxContourCells?: number;
  fallbackToNativeOnOverflow?: boolean;
  hideNativeSelection?: boolean;
  disabled?: boolean;
  contentClassName?: string;
  overlayClassName?: string;
  onSelectionChange?: (snapshot: SelectionSnapshot | null) => void;
}

type SelectionGeometry = {
  text: string;
  boxes: MutableSelectionBox[];
  lineBoxes: MutableSelectionBox[];
  lines: SelectionLine[];
  width: number;
  height: number;
};

type CollectedRects = {
  rects: DOMRect[];
  overflowed: boolean;
};

const DEFAULT_SELECTION_COLOR = "rgb(51 144 236 / 0.34)";
const DEFAULT_SURFACE_COLOR = "Canvas";

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function finiteAtLeast(value: number, minimum: number): number {
  return Number.isFinite(value) ? Math.max(minimum, value) : minimum;
}

function finiteIntegerAtLeast(value: number, minimum: number): number {
  return Math.floor(finiteAtLeast(value, minimum));
}

function intersectRanges(range: Range, containerRange: Range): Range | null {
  let startPosition: number;
  let endPosition: number;

  try {
    startPosition = containerRange.comparePoint(
      range.startContainer,
      range.startOffset,
    );
    endPosition = containerRange.comparePoint(
      range.endContainer,
      range.endOffset,
    );
  } catch {
    // Different trees/documents (including unsupported Shadow DOM crossings).
    return null;
  }

  if (endPosition < 0 || startPosition > 0) {
    return null;
  }

  const clipped = range.cloneRange();
  if (startPosition < 0) {
    clipped.setStart(containerRange.startContainer, containerRange.startOffset);
  }
  if (endPosition > 0) {
    clipped.setEnd(containerRange.endContainer, containerRange.endOffset);
  }

  return clipped.collapsed ? null : clipped;
}

type SelectionWithComposedRanges = Selection & {
  getComposedRanges?: (options?: { shadowRoots?: ShadowRoot[] }) =>
    readonly StaticRange[];
};

function isShadowRoot(node: Node): node is ShadowRoot {
  return node.nodeType === 11 && "host" in node;
}

function getAccessibleSelectionRanges(
  selection: Selection,
  contextNode: HTMLElement,
): Range[] {
  const documentRef = contextNode.ownerDocument;
  const treeRoot = contextNode.getRootNode();
  const getComposedRanges = (selection as SelectionWithComposedRanges)
    .getComposedRanges;

  if (isShadowRoot(treeRoot) && getComposedRanges) {
    try {
      const staticRanges = getComposedRanges.call(selection, {
        shadowRoots: [treeRoot],
      });
      const ranges: Range[] = [];

      for (const staticRange of staticRanges) {
        const range = documentRef.createRange();
        range.setStart(staticRange.startContainer, staticRange.startOffset);
        range.setEnd(staticRange.endContainer, staticRange.endOffset);
        ranges.push(range);
      }

      if (ranges.length > 0) {
        return ranges;
      }
    } catch {
      // Fall back to getRangeAt() for older or partially implemented engines.
    }
  }

  const ranges: Range[] = [];
  for (let index = 0; index < selection.rangeCount; index += 1) {
    try {
      ranges.push(selection.getRangeAt(index));
    } catch {
      // Ignore inaccessible ranges from another tree or shadow boundary.
    }
  }
  return ranges;
}

function selectionIntersectsNode(
  selection: Selection,
  node: HTMLElement,
): boolean {
  if (
    (selection.anchorNode && node.contains(selection.anchorNode)) ||
    (selection.focusNode && node.contains(selection.focusNode))
  ) {
    return true;
  }

  for (const range of getAccessibleSelectionRanges(selection, node)) {
    try {
      if (range.intersectsNode(node)) {
        return true;
      }
    } catch {
      // Ignore ranges that cannot be compared to this node.
    }
  }

  return false;
}

function appendRectsWithLimit(
  target: DOMRect[],
  source: DOMRectList | readonly DOMRect[],
  maxRects: number,
): boolean {
  for (const rect of Array.from(source)) {
    if (rect.width <= 0.25 || rect.height <= 0.25) {
      continue;
    }
    if (target.length >= maxRects) {
      return true;
    }
    target.push(rect);
  }
  return false;
}

function collectTextNodeRects(
  range: Range,
  root: HTMLElement,
  maxRects: number,
): CollectedRects {
  const documentRef = root.ownerDocument;
  const showText = documentRef.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
  const walker = documentRef.createTreeWalker(root, showText);
  const rects: DOMRect[] = [];

  let currentNode = walker.nextNode();
  while (currentNode) {
    const textNode = currentNode as Text;
    let intersects = false;

    if (textNode.data.length > 0) {
      try {
        intersects = range.intersectsNode(textNode);
      } catch {
        intersects = false;
      }
    }

    if (intersects) {
      const nodeRange = documentRef.createRange();
      nodeRange.selectNodeContents(textNode);
      const clipped = intersectRanges(range, nodeRange);
      if (
        clipped &&
        appendRectsWithLimit(rects, clipped.getClientRects(), maxRects)
      ) {
        return { rects, overflowed: true };
      }
    }

    currentNode = walker.nextNode();
  }

  return { rects, overflowed: false };
}

function collectRangeRects(
  ranges: readonly Range[],
  root: HTMLElement,
  granularity: SelectionGranularity,
  maxRects: number,
): CollectedRects {
  const output: DOMRect[] = [];

  for (const range of ranges) {
    if (granularity === "text-node") {
      const remaining = maxRects - output.length;
      const collected = collectTextNodeRects(range, root, remaining);
      output.push(...collected.rects);
      if (collected.overflowed) {
        return { rects: output, overflowed: true };
      }
    } else if (appendRectsWithLimit(output, range.getClientRects(), maxRects)) {
      return { rects: output, overflowed: true };
    }
  }

  return { rects: output, overflowed: false };
}

function toLocalBoxes(
  rects: readonly DOMRect[],
  root: HTMLElement,
  horizontalPadding: number,
  verticalPadding: number,
  quantizationStep: number,
): MutableSelectionBox[] {
  const rootRect = root.getBoundingClientRect();
  const scaleX = root.offsetWidth > 0 ? rootRect.width / root.offsetWidth : 1;
  const scaleY = root.offsetHeight > 0 ? rootRect.height / root.offsetHeight : 1;
  const coordinateSpace = {
    viewportLeft: rootRect.left,
    viewportTop: rootRect.top,
    scrollLeft: root.scrollLeft,
    scrollTop: root.scrollTop,
    clientLeft: root.clientLeft,
    clientTop: root.clientTop,
    scaleX,
    scaleY,
  };
  const result: MutableSelectionBox[] = [];

  for (const rect of rects) {
    const box = viewportRectToLocalBox(
      rect,
      coordinateSpace,
      horizontalPadding,
      verticalPadding,
      quantizationStep,
    );

    if (box.width > 0.25 && box.height > 0.25) {
      result.push(box);
    }
  }

  return result;
}

function deduplicateBoxes(
  boxes: readonly MutableSelectionBox[],
): MutableSelectionBox[] {
  const seen = new Set<string>();
  const result: MutableSelectionBox[] = [];

  for (const box of boxes) {
    const key = `${box.left}:${box.top}:${box.right}:${box.bottom}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(box);
    }
  }

  return result;
}

function boxesEqual(
  first: readonly SelectionBox[],
  second: readonly SelectionBox[],
): boolean {
  if (first.length !== second.length) {
    return false;
  }

  for (let index = 0; index < first.length; index += 1) {
    const a = first[index];
    const b = second[index];
    if (
      a.left !== b.left ||
      a.top !== b.top ||
      a.right !== b.right ||
      a.bottom !== b.bottom
    ) {
      return false;
    }
  }

  return true;
}

function linesEqual(
  first: readonly SelectionLine[],
  second: readonly SelectionLine[],
): boolean {
  if (first.length !== second.length) {
    return false;
  }

  for (let index = 0; index < first.length; index += 1) {
    const a = first[index];
    const b = second[index];
    if (
      a.top !== b.top ||
      a.bottom !== b.bottom ||
      !boxesEqual(a.fragments, b.fragments)
    ) {
      return false;
    }
  }

  return true;
}

function geometriesEqual(
  first: SelectionGeometry | null,
  second: SelectionGeometry,
): boolean {
  return (
    first !== null &&
    first.text === second.text &&
    first.width === second.width &&
    first.height === second.height &&
    boxesEqual(first.boxes, second.boxes) &&
    boxesEqual(first.lineBoxes, second.lineBoxes) &&
    linesEqual(first.lines, second.lines)
  );
}

function snapshotMatchesGeometry(
  snapshot: SelectionSnapshot | null,
  geometry: SelectionGeometry,
  mode: SelectionRenderMode,
): boolean {
  return (
    snapshot !== null &&
    snapshot.text === geometry.text &&
    snapshot.mode === mode &&
    boxesEqual(snapshot.boxes, geometry.boxes) &&
    boxesEqual(snapshot.lineBoxes, geometry.lineBoxes)
  );
}

function freezeBox(box: SelectionBox): SelectionBox {
  return Object.freeze(cloneSelectionBox(box));
}

function createSnapshot(
  geometry: SelectionGeometry,
  mode: SelectionRenderMode,
): SelectionSnapshot {
  return Object.freeze({
    text: geometry.text,
    boxes: Object.freeze(geometry.boxes.map(freezeBox)),
    lineBoxes: Object.freeze(geometry.lineBoxes.map(freezeBox)),
    mode,
  });
}

function cloneSnapshot(snapshot: SelectionSnapshot): SelectionSnapshot {
  return createSnapshot(
    {
      text: snapshot.text,
      boxes: snapshot.boxes.map(cloneSelectionBox),
      lineBoxes: snapshot.lineBoxes.map(cloneSelectionBox),
      lines: [],
      width: 0,
      height: 0,
    },
    snapshot.mode,
  );
}

function FragmentFillRenderer({
  boxes,
  color,
}: {
  boxes: readonly MutableSelectionBox[];
  color: string;
}) {
  return (
    <>
      {boxes.map((box, index) => (
        <div
          key={index}
          className="uts-fragment"
          style={{
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
            background: color,
          }}
        />
      ))}
    </>
  );
}

function ContourUnionRenderer({
  boxes,
  color,
  radius,
  width,
  height,
  maxContourSegments,
}: {
  boxes: readonly MutableSelectionBox[];
  color: string;
  radius: number;
  width: number;
  height: number;
  maxContourSegments: number;
}) {
  const path = useMemo(
    () => buildRoundedUnionPath(boxes, radius, maxContourSegments),
    [boxes, maxContourSegments, radius],
  );

  if (!path) {
    return (
      <>
        {boxes.map((box, index) => (
          <div
            key={index}
            className="uts-fragment"
            style={{
              left: box.left,
              top: box.top,
              width: box.width,
              height: box.height,
              borderRadius: radius,
              background: color,
            }}
          />
        ))}
      </>
    );
  }

  return (
    <svg
      className="uts-contour-svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <path d={path} fill={color} fillRule="evenodd" />
    </svg>
  );
}

function cornerRadiusStyle(
  corners: CornerStyles,
  radius: number,
): CSSProperties {
  return {
    borderTopLeftRadius: corners.topLeft === "outer" ? radius : 0,
    borderTopRightRadius: corners.topRight === "outer" ? radius : 0,
    borderBottomLeftRadius: corners.bottomLeft === "outer" ? radius : 0,
    borderBottomRightRadius: corners.bottomRight === "outer" ? radius : 0,
  };
}

function AdjacentCornersRenderer({
  lines,
  color,
  surfaceColor,
  radius,
}: {
  lines: readonly SelectionLine[];
  color: string;
  surfaceColor: string;
  radius: number;
}) {
  const epsilon = Math.max(0.75, radius / 3);
  const fragments = useMemo(
    () => classifyAdjacentCorners(lines, epsilon),
    [epsilon, lines],
  );
  const pieceWidth = Math.max(radius * 2, 10);

  return (
    <>
      {fragments.flatMap(({ box, corners }, index) => {
        const pieces: ReactNode[] = [];
        const leftInner =
          corners.topLeft === "inner" || corners.bottomLeft === "inner";
        const rightInner =
          corners.topRight === "inner" || corners.bottomRight === "inner";

        if (leftInner) {
          pieces.push(
            <div
              key={`left-fill-${index}`}
              className="uts-inner-fill"
              style={{
                left: box.left - pieceWidth,
                top: box.top,
                width: pieceWidth,
                height: box.height,
                background: color,
              }}
            />,
            <div
              key={`left-cutout-${index}`}
              className="uts-inner-cutout"
              style={{
                left: box.left - pieceWidth,
                top: box.top,
                width: pieceWidth,
                height: box.height,
                background: surfaceColor,
                borderTopRightRadius:
                  corners.topLeft === "inner" ? radius : 0,
                borderBottomRightRadius:
                  corners.bottomLeft === "inner" ? radius : 0,
              }}
            />,
          );
        }

        if (rightInner) {
          pieces.push(
            <div
              key={`right-fill-${index}`}
              className="uts-inner-fill"
              style={{
                left: box.right,
                top: box.top,
                width: pieceWidth,
                height: box.height,
                background: color,
              }}
            />,
            <div
              key={`right-cutout-${index}`}
              className="uts-inner-cutout"
              style={{
                left: box.right,
                top: box.top,
                width: pieceWidth,
                height: box.height,
                background: surfaceColor,
                borderTopLeftRadius:
                  corners.topRight === "inner" ? radius : 0,
                borderBottomLeftRadius:
                  corners.bottomRight === "inner" ? radius : 0,
              }}
            />,
          );
        }

        return pieces;
      })}

      {fragments.map(({ box, corners }, index) => (
        <div
          key={`main-${index}`}
          className="uts-adjacent-fragment"
          style={{
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
            background: color,
            ...cornerRadiusStyle(corners, radius),
          }}
        />
      ))}
    </>
  );
}

export function UniversalTextSelection({
  children,
  ref,
  mode = "contour-union",
  granularity = "range",
  selectionColor = DEFAULT_SELECTION_COLOR,
  surfaceColor = DEFAULT_SURFACE_COLOR,
  radius = 6,
  horizontalPadding = 1.5,
  verticalPadding = 0,
  lineTolerance = 2,
  fragmentGapTolerance = 1,
  bridgeLineGaps = true,
  maxBridgeGap = 4,
  quantizationStep = 0.25,
  maxRects = 500,
  maxContourSegments,
  maxContourCells,
  fallbackToNativeOnOverflow = true,
  hideNativeSelection = true,
  disabled = false,
  className,
  contentClassName,
  overlayClassName,
  onSelectionChange,
  style,
  ...rootProps
}: UniversalTextSelectionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const frameWindowRef = useRef<Window | null>(null);
  const mountedRef = useRef(false);
  const geometryRef = useRef<SelectionGeometry | null>(null);
  const snapshotRef = useRef<SelectionSnapshot | null>(null);
  const activeSelectionRef = useRef(false);
  const callbackRef = useRef(onSelectionChange);

  const [geometry, setGeometry] = useState<SelectionGeometry | null>(null);

  const options = useMemo(
    () => ({
      radius: finiteAtLeast(finiteOr(radius, 6), 0),
      horizontalPadding: finiteOr(horizontalPadding, 1.5),
      verticalPadding: finiteOr(verticalPadding, 0),
      lineTolerance: finiteAtLeast(finiteOr(lineTolerance, 2), 0),
      fragmentGapTolerance: finiteAtLeast(
        finiteOr(fragmentGapTolerance, 1),
        0,
      ),
      maxBridgeGap: finiteAtLeast(finiteOr(maxBridgeGap, 4), 0),
      quantizationStep: finiteAtLeast(finiteOr(quantizationStep, 0.25), 0),
      maxRects: finiteIntegerAtLeast(finiteOr(maxRects, 500), 1),
      maxContourSegments: finiteIntegerAtLeast(
        finiteOr(maxContourSegments ?? maxContourCells ?? 20_000, 20_000),
        16,
      ),
    }),
    [
      fragmentGapTolerance,
      horizontalPadding,
      lineTolerance,
      maxBridgeGap,
      maxContourCells,
      maxContourSegments,
      maxRects,
      quantizationStep,
      radius,
      verticalPadding,
    ],
  );

  const clear = useCallback(() => {
    const previousSnapshot = snapshotRef.current;
    const hadGeometry = geometryRef.current !== null;
    geometryRef.current = null;
    snapshotRef.current = null;
    activeSelectionRef.current = false;

    if (hadGeometry) {
      setGeometry(null);
    }
    if (previousSnapshot !== null) {
      callbackRef.current?.(null);
    }
  }, []);

  const commitGeometry = useCallback(
    (nextGeometry: SelectionGeometry) => {
      activeSelectionRef.current = true;

      if (!geometriesEqual(geometryRef.current, nextGeometry)) {
        geometryRef.current = nextGeometry;
        setGeometry(nextGeometry);
      }

      if (!snapshotMatchesGeometry(snapshotRef.current, nextGeometry, mode)) {
        const nextSnapshot = createSnapshot(nextGeometry, mode);
        snapshotRef.current = nextSnapshot;
        callbackRef.current?.(nextSnapshot);
      }
    },
    [mode],
  );

  const measure = useCallback(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    const documentRef = root?.ownerDocument;
    const selection = documentRef?.getSelection();

    if (
      !root ||
      !content ||
      !documentRef ||
      !selection ||
      disabled ||
      selection.isCollapsed
    ) {
      clear();
      return;
    }

    const rootRange = documentRef.createRange();
    rootRange.selectNodeContents(content);

    const clippedRanges: Range[] = [];
    for (const range of getAccessibleSelectionRanges(selection, content)) {
      const clipped = intersectRanges(range, rootRange);
      if (clipped) {
        clippedRanges.push(clipped);
      }
    }

    if (clippedRanges.length === 0) {
      clear();
      return;
    }

    const collected = collectRangeRects(
      clippedRanges,
      content,
      granularity,
      options.maxRects,
    );

    if (collected.overflowed && fallbackToNativeOnOverflow) {
      clear();
      return;
    }

    const boxes = deduplicateBoxes(
      toLocalBoxes(
        collected.rects,
        root,
        options.horizontalPadding,
        options.verticalPadding,
        options.quantizationStep,
      ),
    );

    if (boxes.length === 0) {
      clear();
      return;
    }

    const rawLines = groupBoxesIntoLines(
      boxes,
      options.lineTolerance,
      options.fragmentGapTolerance,
    );
    const lines = bridgeLineGaps
      ? bridgeSmallLineGaps(rawLines, options.maxBridgeGap)
      : rawLines;
    const lineBoxes = lines.flatMap((line) =>
      line.fragments.map(cloneSelectionBox),
    );

    let maxRight = 0;
    let maxBottom = 0;
    for (const box of lineBoxes) {
      maxRight = Math.max(maxRight, box.right);
      maxBottom = Math.max(maxBottom, box.bottom);
    }
    const contentRight = content.offsetLeft + content.scrollWidth;
    const contentBottom = content.offsetTop + content.scrollHeight;

    commitGeometry({
      text: clippedRanges.map((range) => range.toString()).join(""),
      boxes,
      lineBoxes,
      lines,
      // Do not read root.scrollWidth/root.scrollHeight here: the absolutely
      // positioned overlay itself can participate in scrollable overflow and
      // make those values self-referential across measurements.
      width: Math.ceil(Math.max(root.clientWidth, contentRight, maxRight, 1)),
      height: Math.ceil(Math.max(root.clientHeight, contentBottom, maxBottom, 1)),
    });
  }, [
    bridgeLineGaps,
    clear,
    commitGeometry,
    disabled,
    fallbackToNativeOnOverflow,
    granularity,
    options,
  ]);

  const cancelScheduledMeasure = useCallback(() => {
    if (frameRef.current === null) {
      return;
    }
    frameWindowRef.current?.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    frameWindowRef.current = null;
  }, []);

  const scheduleMeasure = useCallback(() => {
    const windowRef = rootRef.current?.ownerDocument.defaultView;
    if (!mountedRef.current || !windowRef || frameRef.current !== null) {
      return;
    }

    frameWindowRef.current = windowRef;
    frameRef.current = windowRef.requestAnimationFrame(() => {
      frameRef.current = null;
      frameWindowRef.current = null;
      if (mountedRef.current) {
        measure();
      }
    });
  }, [measure]);

  const scheduleActiveMeasure = useCallback(() => {
    if (activeSelectionRef.current) {
      scheduleMeasure();
    }
  }, [scheduleMeasure]);

  const handleSelectionChange = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    const content = contentRef.current;
    const selection = content?.ownerDocument.getSelection();
    if (!content || !selection || selection.isCollapsed) {
      clear();
      return;
    }

    if (selectionIntersectsNode(selection, content)) {
      scheduleMeasure();
    } else if (activeSelectionRef.current) {
      clear();
    }
  }, [clear, scheduleMeasure]);

  useLayoutEffect(() => {
    callbackRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useImperativeHandle(
    ref,
    () => ({
      refresh: scheduleMeasure,
      clear,
      getSnapshot: () =>
        snapshotRef.current ? cloneSnapshot(snapshotRef.current) : null,
      getRootElement: () => rootRef.current,
    }),
    [clear, scheduleMeasure],
  );

  useLayoutEffect(() => {
    mountedRef.current = true;
    if (disabled) {
      clear();
    } else {
      scheduleMeasure();
    }

    return () => {
      mountedRef.current = false;
      cancelScheduledMeasure();
    };
  }, [cancelScheduledMeasure, clear, disabled, scheduleMeasure]);

  useEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    const documentRef = root?.ownerDocument;
    const windowRef = documentRef?.defaultView;

    if (!root || !content || !documentRef || !windowRef || disabled) {
      return;
    }

    documentRef.addEventListener("selectionchange", handleSelectionChange);
    documentRef.addEventListener("scroll", scheduleActiveMeasure, true);
    windowRef.addEventListener("resize", scheduleActiveMeasure);
    windowRef.visualViewport?.addEventListener("resize", scheduleActiveMeasure);
    windowRef.visualViewport?.addEventListener("scroll", scheduleActiveMeasure);

    const resizeObserver = windowRef.ResizeObserver
      ? new windowRef.ResizeObserver(scheduleActiveMeasure)
      : null;
    resizeObserver?.observe(root);
    resizeObserver?.observe(content);

    const mutationObserver = windowRef.MutationObserver
      ? new windowRef.MutationObserver(scheduleActiveMeasure)
      : null;
    mutationObserver?.observe(content, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const fontSet = documentRef.fonts;
    fontSet?.addEventListener?.("loadingdone", scheduleActiveMeasure);
    fontSet?.addEventListener?.("loadingerror", scheduleActiveMeasure);

    return () => {
      documentRef.removeEventListener("selectionchange", handleSelectionChange);
      documentRef.removeEventListener("scroll", scheduleActiveMeasure, true);
      windowRef.removeEventListener("resize", scheduleActiveMeasure);
      windowRef.visualViewport?.removeEventListener(
        "resize",
        scheduleActiveMeasure,
      );
      windowRef.visualViewport?.removeEventListener(
        "scroll",
        scheduleActiveMeasure,
      );
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      fontSet?.removeEventListener?.("loadingdone", scheduleActiveMeasure);
      fontSet?.removeEventListener?.("loadingerror", scheduleActiveMeasure);
    };
  }, [
    disabled,
    handleSelectionChange,
    scheduleActiveMeasure,
  ]);

  const safeRadius = options.radius;
  const renderedGeometry = disabled ? null : geometry;
  const customSelectionActive =
    renderedGeometry !== null && hideNativeSelection;
  const requestedPosition = style?.position;
  const rootStyle = {
    ...style,
    position:
      !requestedPosition || requestedPosition === "static"
        ? "relative"
        : requestedPosition,
  } as CSSProperties;

  return (
    <div
      {...rootProps}
      ref={rootRef}
      className={["uts-root", className].filter(Boolean).join(" ")}
      data-custom-selection-active={customSelectionActive ? "true" : "false"}
      style={rootStyle}
    >
      <div
        className={["uts-overlay", overlayClassName].filter(Boolean).join(" ")}
        style={{
          width: renderedGeometry?.width ?? "100%",
          height: renderedGeometry?.height ?? "100%",
        }}
        aria-hidden="true"
      >
        {renderedGeometry && mode === "fragment-fill" && (
          <FragmentFillRenderer
            boxes={renderedGeometry.boxes}
            color={selectionColor}
          />
        )}

        {renderedGeometry && mode === "contour-union" && (
          <ContourUnionRenderer
            boxes={renderedGeometry.lineBoxes}
            color={selectionColor}
            radius={safeRadius}
            width={renderedGeometry.width}
            height={renderedGeometry.height}
            maxContourSegments={options.maxContourSegments}
          />
        )}

        {renderedGeometry && mode === "adjacent-corners" && (
          <AdjacentCornersRenderer
            lines={renderedGeometry.lines}
            color={selectionColor}
            surfaceColor={surfaceColor}
            radius={safeRadius}
          />
        )}
      </div>

      <div
        ref={contentRef}
        className={["uts-content", contentClassName].filter(Boolean).join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
