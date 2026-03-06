import { getAccountKeyV2, getBalanceKeyV2, getCompositeKeyV2, StoreStateV2, WalletStateV1, WalletStateV2 } from '../types/store'
import { log } from '../utils/logger'

// Migration script for walletStore V1 -> V2

export function migrate(oldState: WalletStateV1): WalletStateV2 {
  log('🚀 Migrating wallet store from V1 to V2...')

  const newState: WalletStateV2 = {
    version: 2,
    addresses: {},
    balances: {},
    balanceLoading: {},
    lastBalanceUpdate: {},
    accountList: {},
    walletList: oldState.walletList,
    activeWalletId: oldState.activeWalletId,
    // Set initial runtime state
    walletLoadingState: { type: StoreStateV2.IDLE },
    isOperationInProgress: false,
    currentOperation: null,
    tempWalletId: null,
  }

  for (const walletId in oldState.addresses) {
    for (const network in oldState.addresses[walletId]) {
      for (const accountIndex in oldState.addresses[walletId][network]) {
        const numericAccountIndex = parseInt(accountIndex, 10)
        const accountKey = getAccountKeyV2({ accountIndex: numericAccountIndex })
        const compositeKey = getCompositeKeyV2(walletId, network, accountKey)

        const address = oldState.addresses[walletId]?.[network]?.[numericAccountIndex]
        if (address) {
          newState.addresses[compositeKey] = address
        }

        const accountBalances = oldState.balances?.[walletId]?.[network]?.[numericAccountIndex]
        if (accountBalances) {
          for (const assetId in accountBalances) {
            const balanceKey = getBalanceKeyV2(compositeKey, assetId)
            const balance = accountBalances[assetId]
            if (balance) {
              newState.balances[balanceKey] = balance
            }
          }
        }

        const lastUpdate =
          oldState.lastBalanceUpdate?.[walletId]?.[network]?.[numericAccountIndex]
        if (lastUpdate) {
          newState.lastBalanceUpdate[compositeKey] = lastUpdate
        }
      }
    }
  }

  for (const walletId in oldState.accountList) {
    const accountInfoArray = oldState.accountList[walletId]

    if (accountInfoArray) {
      newState.accountList[walletId] = accountInfoArray.map((accInfo) => ({
        accountIndex: accInfo.accountIndex,
      }))
    }
  }

  log('✅ Wallet store migration to V2 complete.')
  return newState
}
