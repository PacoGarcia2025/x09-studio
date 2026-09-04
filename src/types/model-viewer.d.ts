import type { DetailedHTMLProps, HTMLAttributes } from "react";

type ModelViewerProps = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  src?: string;
  alt?: string;
  autoplay?: boolean;
  "camera-controls"?: boolean;
  "auto-rotate"?: boolean;
  "auto-rotate-delay"?: string;
  "rotation-per-second"?: string;
  "shadow-intensity"?: string;
  "shadow-softness"?: string;
  "environment-image"?: string;
  exposure?: string;
  "camera-orbit"?: string;
  "min-camera-orbit"?: string;
  "max-camera-orbit"?: string;
  "field-of-view"?: string;
  "min-field-of-view"?: string;
  "max-field-of-view"?: string;
  "interaction-prompt"?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerProps;
    }
  }
}

export {};
