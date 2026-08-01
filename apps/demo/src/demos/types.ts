import type { ComponentType } from "react";

export interface DemoProject {
  id: string;
  index: string;
  title: string;
  label: string;
  summary: string;
  bestFor: string;
  component: ComponentType;
}
