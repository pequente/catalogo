"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CART_BROADCAST_CHANNEL,
  CART_STORAGE_KEY,
  cartUnitCount,
  emptyCartState,
  mergeCartLine,
  parseCartState,
  type CartLine,
  type CartState,
} from "@/src/lib/front/cart";
import { CartToast } from "@/components/public/cart/CartToast";

type CartContextValue = {
  enabled: boolean;
  lines: CartLine[];
  unitCount: number;
  addLine: (line: Omit<CartLine, "quantidade"> & { quantidade?: number }) => void;
  updateQty: (key: string, quantidade: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartState {
  if (typeof window === "undefined") return emptyCartState();
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return emptyCartState();
    return parseCartState(JSON.parse(raw));
  } catch {
    return emptyCartState();
  }
}

function writeStorage(state: CartState) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
}

export function CartProvider({
  cartEnabled,
  children,
}: {
  cartEnabled: boolean;
  children: ReactNode;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const mountedRef = useRef(false);

  const applyState = useCallback((state: CartState) => {
    setLines(state.lines);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  const persistState = useCallback((next: CartLine[]) => {
    const state: CartState = { version: 1, lines: next };
    writeStorage(state);
    if (mountedRef.current) {
      channelRef.current?.postMessage(state);
    }
  }, []);

  useEffect(() => {
    applyState(readStorage());
    mountedRef.current = true;

    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(CART_BROADCAST_CHANNEL)
        : null;
    channelRef.current = channel;

    function onStorage(e: StorageEvent) {
      if (e.key !== CART_STORAGE_KEY) return;
      applyState(readStorage());
    }

    function onMessage(e: MessageEvent) {
      if (!e.data) return;
      applyState(parseCartState(e.data));
    }

    window.addEventListener("storage", onStorage);
    channel?.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("storage", onStorage);
      channel?.removeEventListener("message", onMessage);
      channel?.close();
      channelRef.current = null;
    };
  }, [applyState]);

  const addLine = useCallback(
    (incoming: Omit<CartLine, "quantidade"> & { quantidade?: number }) => {
      if (!cartEnabled) return;
      const line: CartLine = {
        ...incoming,
        quantidade: incoming.quantidade ?? 1,
      };
      setLines((prev) => {
        const next = mergeCartLine(prev, line);
        persistState(next);
        return next;
      });
      showToast("Adicionado ao carrinho");
    },
    [cartEnabled, showToast, persistState],
  );

  const updateQty = useCallback(
    (key: string, quantidade: number) => {
      setLines((prev) => {
        const next = prev
          .map((l) => {
            const k = `${l.productId}:${l.variantId ?? "_"}`;
            if (k !== key) return l;
            return { ...l, quantidade: Math.max(1, Math.floor(quantidade)) };
          })
          .filter((l) => l.quantidade >= 1);
        persistState(next);
        return next;
      });
    },
    [persistState],
  );

  const removeLine = useCallback(
    (key: string) => {
      setLines((prev) => {
        const next = prev.filter(
          (l) => `${l.productId}:${l.variantId ?? "_"}` !== key,
        );
        persistState(next);
        return next;
      });
    },
    [persistState],
  );

  const clear = useCallback(() => {
    persistState([]);
    setLines([]);
  }, [persistState]);

  const value = useMemo(
    () => ({
      enabled: cartEnabled,
      lines,
      unitCount: cartUnitCount(lines),
      addLine,
      updateQty,
      removeLine,
      clear,
    }),
    [cartEnabled, lines, addLine, updateQty, removeLine, clear],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {cartEnabled ? (
        <CartToast message={toast} onDismiss={() => setToast(null)} />
      ) : null}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}

export function useCartOptional(): CartContextValue | null {
  return useContext(CartContext);
}
