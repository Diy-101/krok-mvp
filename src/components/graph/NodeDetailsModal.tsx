import React from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { GraphNode as GraphNodeType } from "@/types/graph";
import {
  getNodePropertiesSchema,
  createDefaultNodeProperties,
  validateNodeProperties,
} from "@/lib/nodeRedUtils";
import { toast } from "sonner";

interface NodeDetailsModalProps {
  node: GraphNodeType;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<GraphNodeType>) => void;
}

export const NodeDetailsModal: React.FC<NodeDetailsModalProps> = ({
  node,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [localNode, setLocalNode] = React.useState(node);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setLocalNode(node);
    setErrors([]);
  }, [node]);

  // Получаем схему свойств для типа узла
  const propertiesSchema = getNodePropertiesSchema(node.type);

  // Обработчик изменения свойства
  const handlePropertyChange = (propertyName: string, value: any) => {
    setLocalNode((prev) => ({
      ...prev,
      properties: {
        ...prev.properties,
        [propertyName]: value,
      },
    }));
  };

  // Обработчик сохранения
  const handleSave = async () => {
    setIsSaving(true);

    // Валидация свойств
    const validationErrors = validateNodeProperties(
      node.type,
      localNode.properties
    );
    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      toast.error(`Ошибки валидации: ${validationErrors.join(", ")}`);
      setIsSaving(false);
      return;
    }

    try {
      await onUpdate(localNode.id, localNode);
      toast.success("Настройки узла сохранены");
      onClose();
    } catch (error) {
      toast.error("Ошибка при сохранении настроек");
    } finally {
      setIsSaving(false);
    }
  };

  // Рендер поля ввода в зависимости от типа
  const renderPropertyField = (property: any) => {
    const value = localNode.properties[property.name] ?? property.value;

    switch (property.type) {
      case "string":
        return (
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={value}
            onChange={(e) =>
              handlePropertyChange(property.name, e.target.value)
            }
            placeholder={property.placeholder}
          />
        );

      case "number":
        return (
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={value}
            onChange={(e) =>
              handlePropertyChange(property.name, Number(e.target.value))
            }
            min={property.min}
            max={property.max}
            step={property.step || 1}
            placeholder={property.placeholder}
          />
        );

      case "boolean":
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              checked={value}
              onChange={(e) =>
                handlePropertyChange(property.name, e.target.checked)
              }
            />
            <span className="text-sm text-gray-700">Включено</span>
          </label>
        );

      case "select":
        return (
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={value}
            onChange={(e) =>
              handlePropertyChange(property.name, e.target.value)
            }
          >
            {property.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "textarea":
        return (
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={value}
            onChange={(e) =>
              handlePropertyChange(property.name, e.target.value)
            }
            rows={6}
            placeholder={property.placeholder}
          />
        );

      case "password":
        return (
          <input
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={value}
            onChange={(e) =>
              handlePropertyChange(property.name, e.target.value)
            }
            placeholder={property.placeholder}
          />
        );

      case "json":
        return (
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            value={
              typeof value === "string" ? value : JSON.stringify(value, null, 2)
            }
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handlePropertyChange(property.name, parsed);
              } catch {
                handlePropertyChange(property.name, e.target.value);
              }
            }}
            rows={8}
            placeholder={property.placeholder}
          />
        );

      default:
        return (
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={value}
            onChange={(e) =>
              handlePropertyChange(property.name, e.target.value)
            }
            placeholder={property.placeholder}
          />
        );
    }
  };

  return (
    <div
      className={`absolute top-0 right-[20rem] h-full w-[32rem] bg-white transition-all duration-300 ease-in-out border-l border-gray-200 flex flex-col overflow-hidden z-[50] ${
        isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
      style={{ maxWidth: "100vw" }}
    >
      {isOpen && (
        <>
          <div className="p-6 flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Настройки узла
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {node.type.charAt(0).toUpperCase() + node.type.slice(1)} -{" "}
                  {node.name}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Основная информация */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">
                Основная информация
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    ID узла
                  </label>
                  <div className="font-mono text-sm text-gray-700 bg-white px-3 py-2 rounded border">
                    {localNode.id}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Тип узла
                  </label>
                  <div className="text-sm text-gray-700 bg-white px-3 py-2 rounded border">
                    {localNode.type}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Название
                  </label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={localNode.name}
                    onChange={(e) =>
                      setLocalNode({ ...localNode, name: e.target.value })
                    }
                    placeholder="Введите название узла"
                  />
                </div>
              </div>
            </div>

            {/* Свойства узла */}
            {propertiesSchema.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Свойства узла
                </h3>
                <div className="space-y-4">
                  {propertiesSchema.map((property) => (
                    <div key={property.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                          {property.description || property.name}
                          {property.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                      </div>
                      {renderPropertyField(property)}
                      {property.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {property.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ошибки валидации */}
            {errors.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-sm font-medium text-red-800">
                    Ошибки валидации
                  </span>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Статус и метрики */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">
                Статус и метрики
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Статус
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={localNode.status}
                    onChange={(e) =>
                      setLocalNode({
                        ...localNode,
                        status: e.target.value as any,
                      })
                    }
                  >
                    <option value="healthy">Здоровый</option>
                    <option value="warning">Предупреждение</option>
                    <option value="critical">Критический</option>
                    <option value="unknown">Неизвестно</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Здоровье (%)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={localNode.health}
                    onChange={(e) =>
                      setLocalNode({
                        ...localNode,
                        health: Number(e.target.value),
                      })
                    }
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer с кнопками */}
          <div className="flex gap-3 p-4 border-t bg-gray-50">
            <button
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 transition-colors"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
