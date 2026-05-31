import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  link?: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let notifId = 0;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((n: Omit<Notification, "id" | "timestamp" | "read">) => {
    setNotifications(prev => [{
      ...n,
      id: `notif_${++notifId}`,
      timestamp: new Date(),
      read: false,
    }, ...prev].slice(0, 100)); // keep last 100
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Listen for WebSocket events (future enhancement)
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "system_event") {
          addNotification({ type: "info", title: data.data?.message || "System event", message: data.data?.source });
        }
      } catch {}
    };
    ws.onerror = () => {};
    return () => ws.close();
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
