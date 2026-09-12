import {
  getComponent,
  getIcon,
  getImage,
  getMotion,
  searchComponent,
  searchIcon,
  searchImage,
  searchMotion,
  type ResourceRegistry,
} from "@/lib/resource-registry";
import type { ToolCall, ToolResult } from "./contracts";

function resultFromItems(items: Array<Record<string, unknown>>, ok = true): ToolResult {
  return {
    ok,
    items,
    warnings: items.length === 0 ? ["Nenhum recurso encontrado para a consulta atual."] : undefined,
    nextAction: items.length > 0 ? "reuse" : "search",
  };
}

export function searchComponentTool(
  input: Parameters<typeof searchComponent>[0] = {},
  registry: ResourceRegistry = {} as ResourceRegistry,
): ToolCall {
  const items = searchComponent(input, registry).map((item) => ({ ...item }));
  return {
    name: "search_component",
    arguments: input as Record<string, unknown>,
    result: resultFromItems(items),
  };
}

export function getComponentTool(
  resourceId: string,
  registry: ResourceRegistry = {} as ResourceRegistry,
): ToolCall {
  const item = getComponent(resourceId, registry); 
  return {
    name: "get_component",
    arguments: { resourceId },
    result: {
      ok: Boolean(item),
      item: item ? ({ ...item } as Record<string, unknown>) : undefined,
      items: item ? [{ ...item }] : [],
      warnings: item ? undefined : ["Componente não encontrado."],
      nextAction: item ? "reuse" : "search",
    },
  };
}

export function searchIconTool(
  input: Parameters<typeof searchIcon>[0] = {},
  registry: ResourceRegistry = {} as ResourceRegistry,
): ToolCall {
  const items = searchIcon(input, registry).map((item) => ({ ...item }));
  return {
    name: "search_icon",
    arguments: input as Record<string, unknown>,
    result: resultFromItems(items),
  };
}

export function getIconTool(
  resourceId: string,
  registry: ResourceRegistry = {} as ResourceRegistry,
): ToolCall {
  const item = getIcon(resourceId, registry);
  return {
    name: "get_icon",
    arguments: { resourceId },
    result: {
      ok: Boolean(item),
      item: item ? ({ ...item } as Record<string, unknown>) : undefined,
      items: item ? [{ ...item }] : [],
      warnings: item ? undefined : ["Ícone não encontrado."],
      nextAction: item ? "reuse" : "search",
    },
  };
}

export function searchMotionTool(
  input: Parameters<typeof searchMotion>[0] = {},
  registry: ResourceRegistry = {} as ResourceRegistry,
): ToolCall {
  const items = searchMotion(input, registry).map((item) => ({ ...item }));
  return {
    name: "search_motion",
    arguments: input as Record<string, unknown>,
    result: resultFromItems(items),
  };
}

export function getMotionTool(
  resourceId: string,
  registry: ResourceRegistry = {} as ResourceRegistry,
): ToolCall {
  const item = getMotion(resourceId, registry);
  return {
    name: "get_motion",
    arguments: { resourceId },
    result: {
      ok: Boolean(item),
      item: item ? ({ ...item } as Record<string, unknown>) : undefined,
      items: item ? [{ ...item }] : [],
      warnings: item ? undefined : ["Motion não encontrada."],
      nextAction: item ? "reuse" : "search",
    },
  };
}

export function searchImageTool(
  input: Parameters<typeof searchImage>[0] = {},
  registry: ResourceRegistry = {} as ResourceRegistry,
): ToolCall {
  const items = searchImage(input, registry).map((item) => ({ ...item }));
  return {
    name: "search_image",
    arguments: input as Record<string, unknown>,
    result: resultFromItems(items),
  };
}

export function getImageTool(
  resourceId: string,
  registry: ResourceRegistry = {} as ResourceRegistry,
): ToolCall {
  const item = getImage(resourceId, registry);
  return {
    name: "get_image",
    arguments: { resourceId },
    result: {
      ok: Boolean(item),
      item: item ? ({ ...item } as Record<string, unknown>) : undefined,
      items: item ? [{ ...item }] : [],
      warnings: item ? undefined : ["Imagem não encontrada."],
      nextAction: item ? "reuse" : "search",
    },
  };
}
