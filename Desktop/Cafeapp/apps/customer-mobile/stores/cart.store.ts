import { create } from 'zustand';

interface CartState {
  count: number;
  total: number;
  setCart: (count: number, total: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  count: 0,
  total: 0,
  setCart: (count, total) => set({ count, total }),
  clear: () => set({ count: 0, total: 0 }),
}));
