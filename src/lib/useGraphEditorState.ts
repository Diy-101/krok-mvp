import { useState, useCallback } from "react";
import { toast } from "sonner";
import { GraphNode as GraphNodeType, GraphLink } from "@/types/graph";
import {
  generateNodeId,
  generateLinkId,
  generateFlowId,
  ensureNodesHaveHealth,
  ensureNodeListHasHealth,
} from "./utils";
import { createDefaultNodeProperties } from "./nodeRedUtils";

interface Flow {
  id: string;
  name: string;
  nodes: GraphNodeType[];
  links: GraphLink[];
}

type NodeType =
  | "server"
  | "database"
  | "network"
  | "service"
  | "api"
  | "storage";

export function useGraphEditorState() {
  const [flows, setFlows] = useState<Flow[]>(
    ensureNodesHaveHealth([
      {
        id: "flow_1",
        name: "Поток 1",
        nodes: [],
        links: [],
      },
    ])
  );
  const [activeFlowId, setActiveFlowId] = useState("flow_1");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [hasChanges, setHasChanges] = useState(false);
  const [dragPort, setDragPort] = useState<{
    nodeId: string;
    portIdx: number;
  } | null>(null);
  const [modalNodeId, setModalNodeId] = useState<string | null>(null);

  // CRUD для flows
  const handleAddFlow = () => {
    const newFlow: Flow = {
      id: generateFlowId(),
      name: `Поток ${flows.length + 1}`,
      nodes: [],
      links: [],
    };
    setFlows((prev) => [...prev, newFlow]);
    setActiveFlowId(newFlow.id);
    setSelectedNodeId(null);
    setSelectedLinkId(null);
  };
  const handleSelectFlow = (flowId: string) => {
    setActiveFlowId(flowId);
    setSelectedNodeId(null);
    setSelectedLinkId(null);
  };
  const handleRenameFlow = (flowId: string, name: string) => {
    setFlows((prev) => prev.map((f) => (f.id === flowId ? { ...f, name } : f)));
  };
  const handleDeleteFlow = (flowId: string) => {
    if (flows.length === 1) return;
    setFlows((prev) => prev.filter((f) => f.id !== flowId));
    if (activeFlowId === flowId) {
      setActiveFlowId(flows.find((f) => f.id !== flowId)!.id);
    }
    setSelectedNodeId(null);
    setSelectedLinkId(null);
  };

  // Все функции для nodes/links теперь работают только с nodes/links активного потока
  const setNodes = (updater: (prev: GraphNodeType[]) => GraphNodeType[]) => {
    setFlows((prev) =>
      ensureNodesHaveHealth(
        prev.map((f) =>
          f.id === activeFlowId
            ? { ...f, nodes: ensureNodeListHasHealth(updater(f.nodes)) }
            : f
        )
      )
    );
  };
  const setLinks = (updater: (prev: GraphLink[]) => GraphLink[]) => {
    setFlows((prev) =>
      ensureNodesHaveHealth(
        prev.map((f) =>
          f.id === activeFlowId ? { ...f, links: updater(f.links) } : f
        )
      )
    );
  };

  const handleAddNode = useCallback((type: NodeType) => {
    const newNode: GraphNodeType = {
      id: generateNodeId(),
      type,
      name: `Новый ${type}`,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      health: Math.floor(Math.random() * 100),
      status: "healthy",
      properties: createDefaultNodeProperties(type),
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setHasChanges(true);
    toast.success(`${newNode.name} добавлен на граф`);
  }, []);

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleDragNode = useCallback(
    (nodeId: string, x: number, y: number) => {
      setFlows((prev) =>
        prev.map((flow) =>
          flow.id === activeFlowId
            ? {
                ...flow,
                nodes: flow.nodes.map((node) =>
                  node.id === nodeId ? { ...node, x, y } : node
                ),
              }
            : flow
        )
      );
      setHasChanges(true);
    },
    [activeFlowId]
  );

  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<GraphNodeType>) => {
      console.log("handleUpdateNode called:", nodeId, updates);
      setNodes((prev) => {
        const updated = prev.map((node) =>
          node.id === nodeId ? { ...node, ...updates } : node
        );
        console.log("Updated nodes:", updated);
        return updated;
      });
      setHasChanges(true);
    },
    []
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((node) => node.id !== nodeId));
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      setHasChanges(true);
      toast.success("Узел удален");
    },
    [selectedNodeId]
  );

  const handleSave = () => {
    toast.success("Граф сохранен");
    setHasChanges(false);
  };

  const handleExport = () => {
    const activeFlow = flows.find((f) => f.id === activeFlowId)!;
    const dataStr = JSON.stringify(activeFlow.nodes, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = "graph_export.json";
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
    toast.success("Граф экспортирован");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        toast.error("Файл не выбран");
        return;
      }
      try {
        const fileContent = await file.text();
        let parsedData;
        try {
          parsedData = JSON.parse(fileContent);
        } catch (parseError) {
          throw new Error("Неверный JSON-формат файла");
        }
        const isArrayFormat = Array.isArray(parsedData);
        const isObjectFormat =
          parsedData &&
          typeof parsedData === "object" &&
          Array.isArray(parsedData.nodes);
        if (!isArrayFormat && !isObjectFormat) {
          throw new Error(
            "Формат файла не поддерживается. Ожидается: массив узлов или объект с полями nodes/links"
          );
        }
        const nodesToImport = isArrayFormat ? parsedData : parsedData.nodes;
        const linksToImport = isArrayFormat ? [] : parsedData.links || [];
        if (!Array.isArray(nodesToImport)) {
          throw new Error("Узлы должны быть массивом");
        }
        if (!Array.isArray(linksToImport)) {
          throw new Error("Связи должны быть массивом");
        }
        const invalidNode = nodesToImport.find(
          (node: any) =>
            !node.id ||
            !node.type ||
            typeof node.x !== "number" ||
            typeof node.y !== "number"
        );
        if (invalidNode) {
          throw new Error(`Некорректный узел: ${JSON.stringify(invalidNode)}`);
        }
        const invalidLink = linksToImport.find(
          (link: any) => !link.source || !link.target || !link.id
        );
        if (invalidLink) {
          throw new Error(`Некорректная связь: ${JSON.stringify(invalidLink)}`);
        }
        setNodes((prevNodes) =>
          ensureNodeListHasHealth([...prevNodes, ...nodesToImport])
        );
        setLinks((prevLinks) => [...prevLinks, ...linksToImport]);
        setSelectedNodeId(null);
        setSelectedLinkId(null);
        setHasChanges(true);
        toast.success(
          `Успешно импортировано: ${nodesToImport.length} узлов, ${linksToImport.length} связей`
        );
      } catch (error) {
        console.error("Ошибка импорта:", error);
        toast.error(
          error instanceof Error
            ? `Ошибка импорта: ${error.message}`
            : "Неизвестная ошибка при импорте"
        );
      }
    };
    input.click();
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2));
  };
  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  };
  const handleReset = () => {
    setNodes(() => []);
    setSelectedNodeId(null);
    setZoom(1);
    setHasChanges(false);
    toast.success("Граф очищен");
  };
  const handleClearAll = () => {
    const activeFlow = flows.find((f) => f.id === activeFlowId)!;
    if (activeFlow.nodes.length > 0) {
      setNodes(() => []);
      setSelectedNodeId(null);
      setHasChanges(true);
      toast.success("Все узлы удалены");
    }
  };

  // Drag&drop для добавления узла на canvas
  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/node-type") as NodeType;
    if (!type) return;
    const canvas = document.getElementById("graph-canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleAddNodeAt(type, x, y);
  };
  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  // Добавить узел в конкретную позицию
  const handleAddNodeAt = (type: NodeType, x: number, y: number) => {
    const newNode: GraphNodeType = {
      id: generateNodeId(),
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      x,
      y,
      health: Math.floor(Math.random() * 100),
      status: "healthy",
      properties: createDefaultNodeProperties(type),
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setHasChanges(true);
    toast.success(`${newNode.name} добавлен на граф`);
  };

  // Drag&drop портов
  const handlePortConnectStart = (
    nodeId: string,
    portIdx: number,
    type: "output" | "input"
  ) => {
    if (type === "output") {
      setDragPort({ nodeId, portIdx });
    }
  };
  const handlePortConnectEnd = (
    nodeId: string,
    portIdx: number,
    type: "output" | "input"
  ) => {
    if (type === "input" && dragPort) {
      const newLink: GraphLink = {
        id: generateLinkId(),
        source: dragPort.nodeId + ":" + dragPort.portIdx,
        target: nodeId + ":" + portIdx,
        type: "network",
        status: "active",
      };
      setLinks((prev) => [...prev, newLink]);
      setHasChanges(true);
      setDragPort(null);
      toast.success("Связь между портами создана");
    }
  };

  return {
    flows,
    setFlows,
    activeFlowId,
    setActiveFlowId,
    selectedNodeId,
    setSelectedNodeId,
    selectedLinkId,
    setSelectedLinkId,
    zoom,
    setZoom,
    hasChanges,
    setHasChanges,
    dragPort,
    setDragPort,
    modalNodeId,
    setModalNodeId,
    handleAddFlow,
    handleSelectFlow,
    handleRenameFlow,
    handleDeleteFlow,
    setNodes,
    setLinks,
    handleAddNode,
    handleSelectNode,
    handleDragNode,
    handleUpdateNode,
    handleDeleteNode,
    handleSave,
    handleExport,
    handleImport,
    handleZoomIn,
    handleZoomOut,
    handleReset,
    handleClearAll,
    handlePortConnectStart,
    handlePortConnectEnd,
    handleCanvasDrop,
    handleCanvasDragOver,
    handleAddNodeAt,
  };
}
