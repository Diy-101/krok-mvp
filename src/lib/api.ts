const API_BASE_URL = "http://localhost:8000/api/v1";

// Типы для API
export interface ApiUser {
  id: number;
  username: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ApiNode {
  id: number;
  node_id: string;
  flow_id: string;
  node_type: string;
  name: string;
  properties: Record<string, any>;
  position_x: number;
  position_y: number;
  status: string;
  health: number;
  created_at: string;
  updated_at?: string;
}

export interface ApiFlow {
  id: number;
  flow_id: string;
  name: string;
  description?: string;
  user_id: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateUserRequest {
  username: string;
  email?: string;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  is_active?: boolean;
}

export interface CreateNodeRequest {
  node_id: string;
  flow_id: string;
  node_type: string;
  name: string;
  properties: Record<string, any>;
  position_x: number;
  position_y: number;
  status: string;
  health: number;
}

export interface UpdateNodeRequest {
  name?: string;
  properties?: Record<string, any>;
  position_x?: number;
  position_y?: number;
  status?: string;
  health?: number;
}

export interface CreateFlowRequest {
  flow_id: string;
  name: string;
  description?: string;
  user_id: number;
}

export interface UpdateFlowRequest {
  name?: string;
  description?: string;
}

// Утилиты для API запросов
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`
      );
    }

    return response.json();
  } catch (error) {
    console.error("API request failed:", {
      url,
      error: error instanceof Error ? error.message : error,
      type: error instanceof TypeError ? "Network/CORS error" : "HTTP error",
    });

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        "CORS error: Backend server may not be running or CORS not configured properly"
      );
    }

    throw error;
  }
}

// API для узлов
export const nodesApi = {
  // Получить все узлы
  getAll: (flowId?: string): Promise<ApiNode[]> => {
    const params = flowId ? `?flow_id=${flowId}` : "";
    return apiRequest<ApiNode[]>(`/nodes${params}`);
  },

  // Получить узел по ID
  getById: (nodeId: string): Promise<ApiNode> => {
    return apiRequest<ApiNode>(`/nodes/${nodeId}`);
  },

  // Создать узел
  create: (node: CreateNodeRequest): Promise<ApiNode> => {
    return apiRequest<ApiNode>("/nodes/", {
      method: "POST",
      body: JSON.stringify(node),
    });
  },

  // Обновить узел
  update: (nodeId: string, updates: UpdateNodeRequest): Promise<ApiNode> => {
    return apiRequest<ApiNode>(`/nodes/${nodeId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  // Удалить узел
  delete: (nodeId: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/nodes/${nodeId}`, {
      method: "DELETE",
    });
  },

  // Удалить все узлы потока
  deleteByFlow: (flowId: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/nodes/flow/${flowId}`, {
      method: "DELETE",
    });
  },
};

// API для пользователей
export const usersApi = {
  // Получить всех пользователей
  getAll: (): Promise<ApiUser[]> => {
    return apiRequest<ApiUser[]>("/users/");
  },

  // Получить пользователя по ID
  getById: (userId: number): Promise<ApiUser> => {
    return apiRequest<ApiUser>(`/users/${userId}`);
  },

  // Создать пользователя
  create: (user: CreateUserRequest): Promise<ApiUser> => {
    return apiRequest<ApiUser>("/users/", {
      method: "POST",
      body: JSON.stringify(user),
    });
  },

  // Обновить пользователя
  update: (userId: number, updates: UpdateUserRequest): Promise<ApiUser> => {
    return apiRequest<ApiUser>(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  // Удалить пользователя
  delete: (userId: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/users/${userId}`, {
      method: "DELETE",
    });
  },

  // Получить или создать пользователя
  getOrCreate: (username: string, email?: string): Promise<ApiUser> => {
    const params = new URLSearchParams({ username });
    if (email) params.append("email", email);
    return apiRequest<ApiUser>(`/users/get-or-create?${params}`, {
      method: "POST",
    });
  },
};

// API для потоков
export const flowsApi = {
  // Получить все потоки
  getAll: (userId?: number): Promise<ApiFlow[]> => {
    const params = userId ? `?user_id=${userId}` : "";
    return apiRequest<ApiFlow[]>(`/flows/${params}`);
  },

  // Получить поток по ID
  getById: (flowId: string): Promise<ApiFlow> => {
    return apiRequest<ApiFlow>(`/flows/${flowId}`);
  },

  // Создать поток
  create: (flow: CreateFlowRequest): Promise<ApiFlow> => {
    return apiRequest<ApiFlow>("/flows/", {
      method: "POST",
      body: JSON.stringify(flow),
    });
  },

  // Обновить поток
  update: (flowId: string, updates: UpdateFlowRequest): Promise<ApiFlow> => {
    return apiRequest<ApiFlow>(`/flows/${flowId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  // Удалить поток
  delete: (flowId: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/flows/${flowId}`, {
      method: "DELETE",
    });
  },

  // Создать дефолтный поток для пользователя
  createDefaultForUser: (userId: number): Promise<ApiFlow> => {
    return apiRequest<ApiFlow>(`/flows/create-default/${userId}`, {
      method: "POST",
    });
  },
};

// Преобразование типов между frontend и backend
export function apiNodeToGraphNode(apiNode: ApiNode) {
  return {
    id: apiNode.node_id,
    type: apiNode.node_type as any,
    name: apiNode.name,
    x: apiNode.position_x,
    y: apiNode.position_y,
    health: apiNode.health,
    status: apiNode.status as any,
    properties: apiNode.properties,
  };
}

export function graphNodeToApiNode(
  graphNode: any,
  flowId: string
): CreateNodeRequest {
  return {
    node_id: graphNode.id,
    flow_id: flowId,
    node_type: graphNode.type,
    name: graphNode.name,
    properties: graphNode.properties || {},
    position_x: graphNode.x,
    position_y: graphNode.y,
    status: graphNode.status || "unknown",
    health: graphNode.health || 0,
  };
}

export function apiFlowToFlow(apiFlow: ApiFlow) {
  return {
    id: apiFlow.flow_id,
    name: apiFlow.name,
    nodes: [],
    links: [],
  };
}
