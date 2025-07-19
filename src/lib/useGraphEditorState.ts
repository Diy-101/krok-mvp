import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { GraphNode as GraphNodeType, GraphLink } from "@/types/graph";
import {
  generateNodeId,
  generateLinkId,
  generateFlowId,
  ensureNodesHaveHealth,
  ensureNodeListHasHealth,
} from "./utils";
import {
  createDefaultNodeProperties,
  validateNodeProperties,
} from "./nodeRedUtils";
import {
  nodesApi,
  flowsApi,
  apiNodeToGraphNode,
  graphNodeToApiNode,
  apiFlowToFlow,
} from "./api";

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

  // Загрузка данных с сервера
  const loadFlows = useCallback(async () => {
    try {
      const apiFlows = await flowsApi.getAll();
      const flowsData = apiFlows.map(apiFlowToFlow);
      setFlows(flowsData);

      // Если есть потоки, загружаем узлы для активного потока
      if (flowsData.length > 0 && activeFlowId) {
        await loadNodesForFlow(activeFlowId);
      }
    } catch (error) {
      console.error("Error loading flows:", error);
      // Fallback: используем локальные данные
      toast.warning("Сервер недоступен, используются локальные данные");
    }
  }, [activeFlowId]);

  const loadNodesForFlow = useCallback(async (flowId: string) => {
    try {
      const apiNodes = await nodesApi.getAll(flowId);
      const nodesData = apiNodes.map(apiNodeToGraphNode);
      setNodes(() => nodesData);
    } catch (error) {
      console.error("Error loading nodes:", error);
      // Fallback: оставляем текущие узлы
      toast.warning("Сервер недоступен, используются локальные узлы");
    }
  }, []);

  // Сохранение узла на сервере
  const saveNodeToServer = useCallback(
    async (node: GraphNodeType) => {
      try {
        if (!activeFlowId) {
          throw new Error("Нет активного потока");
        }

        const apiNode = graphNodeToApiNode(node, activeFlowId);
        await nodesApi.create(apiNode);
        toast.success("Узел сохранен на сервере");
      } catch (error) {
        console.error("Error saving node:", error);
        // Fallback: сохраняем локально
        toast.warning("Сервер недоступен, данные сохранены локально");
      }
    },
    [activeFlowId]
  );

  // Обновление узла на сервере
  const updateNodeOnServer = useCallback(
    async (nodeId: string, updates: Partial<GraphNodeType>) => {
      try {
        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.properties !== undefined)
          updateData.properties = updates.properties;
        if (updates.x !== undefined) updateData.position_x = updates.x;
        if (updates.y !== undefined) updateData.position_y = updates.y;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.health !== undefined) updateData.health = updates.health;

        await nodesApi.update(nodeId, updateData);
        toast.success("Узел обновлен на сервере");
      } catch (error) {
        console.error("Error updating node:", error);
        // Fallback: обновляем локально
        toast.warning("Сервер недоступен, изменения сохранены локально");
      }
    },
    []
  );

  // Удаление узла с сервера
  const deleteNodeFromServer = useCallback(async (nodeId: string) => {
    try {
      await nodesApi.delete(nodeId);
      toast.success("Узел удален с сервера");
    } catch (error) {
      console.error("Error deleting node:", error);
      // Fallback: удаляем локально
      toast.warning("Сервер недоступен, узел удален локально");
    }
  }, []);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  // Создание дефолтного потока, если нет потоков
  useEffect(() => {
    if (flows.length === 0) {
      const defaultFlow: Flow = {
        id: "default",
        name: "Default Flow",
        nodes: [],
        links: [],
      };
      setFlows([defaultFlow]);
      setActiveFlowId("default");
    }
  }, [flows.length]);

  // Загрузка узлов при смене активного потока
  useEffect(() => {
    if (activeFlowId) {
      loadNodesForFlow(activeFlowId);
    }
  }, [activeFlowId, loadNodesForFlow]);

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

  const handleAddNode = useCallback(
    (type: NodeType) => {
      const newNode: GraphNodeType = {
        id: generateNodeId(),
        type,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
        health: Math.floor(Math.random() * 100),
        status: "healthy",
        properties: createDefaultNodeProperties(type),
      };
      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      setHasChanges(true);

      // Сохраняем на сервере
      saveNodeToServer(newNode).catch(() => {
        // Если сохранение не удалось, удаляем узел из локального состояния
        setNodes((prev) => prev.filter((n) => n.id !== newNode.id));
        setSelectedNodeId(null);
      });

      toast.success(`${newNode.name} добавлен на граф`);
    },
    [saveNodeToServer]
  );

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

      // Обновляем на сервере
      updateNodeOnServer(nodeId, updates).catch(() => {
        // Если обновление не удалось, можно показать уведомление
        toast.error("Не удалось сохранить изменения на сервере");
      });
    },
    [updateNodeOnServer]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((node) => node.id !== nodeId));
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      setHasChanges(true);

      // Удаляем с сервера
      deleteNodeFromServer(nodeId).catch(() => {
        // Если удаление не удалось, можно показать уведомление
        toast.error("Не удалось удалить узел с сервера");
      });

      toast.success("Узел удален");
    },
    [selectedNodeId, deleteNodeFromServer]
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
    const activeFlow = flows.find((f) => f.id === activeFlowId);
    if (activeFlow && activeFlow.nodes.length > 0) {
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
