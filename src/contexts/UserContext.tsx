import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ApiUser, usersApi, flowsApi } from "@/lib/api";
import { toast } from "sonner";

interface UserContextType {
  currentUser: ApiUser | null;
  isLoading: boolean;
  login: (username: string, email?: string) => Promise<void>;
  logout: () => void;
  createDefaultFlow: () => Promise<any>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Проверяем сохраненного пользователя при загрузке
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error("Error parsing saved user:", error);
        localStorage.removeItem("currentUser");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, email?: string) => {
    try {
      setIsLoading(true);
      const user = await usersApi.getOrCreate(username, email);
      setCurrentUser(user);
      localStorage.setItem("currentUser", JSON.stringify(user));
      toast.success(`Добро пожаловать, ${user.username}!`);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Ошибка входа в систему");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    toast.success("Вы вышли из системы");
  };

  const createDefaultFlow = async () => {
    if (!currentUser) {
      throw new Error("Пользователь не авторизован");
    }

    try {
      const flow = await flowsApi.createDefaultForUser(currentUser.id);
      toast.success("Создан дефолтный поток");
      return flow;
    } catch (error) {
      console.error("Error creating default flow:", error);
      toast.error("Ошибка создания дефолтного потока");
      throw error;
    }
  };

  const value: UserContextType = {
    currentUser,
    isLoading,
    login,
    logout,
    createDefaultFlow,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
