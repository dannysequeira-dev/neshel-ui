"use client";
/**
 * `useTilt3D(ref, options)`: Tilt3D on an element you render yourself (contracts/tilt-3d.md §4).
 * Uses the shared attachment lifecycle without the exclusive-channel arbiter (Tilt3D only composes
 * `transform`), so the hover bundle does not include arbitration code.
 */
import type { RefObject } from "react";
import { attachWith } from "../../core/attach.js";
import { type AttachFunction, useAttachment } from "../../react/use-attachment.js";
import { tilt3D } from "./controller.js";
import type { Tilt3DOptions } from "./options.js";

const attachComposed: AttachFunction = (element, definition, options, config) =>
  attachWith(element, definition, options, config, undefined);

export function useTilt3D(ref: RefObject<HTMLElement | null>, options: Tilt3DOptions = {}): void {
  useAttachment(attachComposed, ref, tilt3D, options, {});
}
