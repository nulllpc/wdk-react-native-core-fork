import { create } from 'zustand'
import { createJSONStorage, devtools, persist } from 'zustand/middleware'

import { createMMKVStorageAdapter } from '../storage/mmkvStorage'

import {
  type WalletStateV2,
  type WalletStoreV2,
  StoreStateV2,
  WalletStateV1,
} from '../types/store'

import { migrate as migrateToV2 } from '../migrations/v2'

type WalletStoreInstance = ReturnType<ReturnType<typeof create<WalletStoreV2>>>

const initialState: WalletStateV2 = {
  version: 2,
  addresses: {},
  balances: {},
  balanceLoading: {},
  lastBalanceUpdate: {},
  accountList: {},
  walletList: [],
  activeWalletId: null,
  walletLoadingState: { type: StoreStateV2.IDLE },
  isOperationInProgress: false,
  currentOperation: null,
  tempWalletId: null,
}

const storageAdapter = createMMKVStorageAdapter()

let walletStoreInstance: WalletStoreInstance | null = null

export function createWalletStoreV2(): WalletStoreInstance {
  if (walletStoreInstance) {
    return walletStoreInstance
  }

  walletStoreInstance = create<WalletStoreV2>()(
    devtools(
      persist(
        () => ({
          ...initialState,
        }),
        {
          name: 'wallet-storage',
          version: 2,
          storage: createJSONStorage(() => storageAdapter),
          migrate: (persistedState, version) => {
            if (!version || version < 2) { // The first store implementation doesn't have a version prop
              return migrateToV2(persistedState as WalletStateV1)
            }
            return persistedState as WalletStateV2
          },
          partialize: (state: WalletStateV2) => ({
            version: state.version,
            addresses: state.addresses,
            balances: state.balances,
            lastBalanceUpdate: state.lastBalanceUpdate,
            accountList: state.accountList,
            walletList: state.walletList,
            activeWalletId: state.activeWalletId,
          }),
        },
      ),
      { name: 'WalletStoreV2' },
    ),
  )

  return walletStoreInstance
}

export function getWalletStoreV2() {
  return createWalletStoreV2()
}
