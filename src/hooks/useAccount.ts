import { useCallback, useMemo } from 'react'
import { AccountService } from '../services/accountService'
import { getWalletStore } from '../store/walletStore'
import type { IAsset } from '../types'
import { BalanceFetchResult } from '../types'
import { convertBalanceToString } from '../utils/balanceUtils'
import { useAddressLoader } from './useAddressLoader'

export type UseAccountParams = {
  accountIndex: number
  network: string
}

export interface TransactionParams {
  to: string
  asset: IAsset
  amount: string // Amount in smallest denomination (e.g., wei)
}

export interface TransactionResult {
  hash: string
  fee: string
}

export interface UseAccountReturn<T extends object> {
  /** The derived public address for this account. Null if not loaded. */
  address: string | null

  /** True if the account address is currently being derived. */
  isLoading: boolean

  /** An error object if address derivation failed. */
  error: Error | null

  /** The identifier object for this account. Null if no active wallet. */
  account: {
    accountIndex: number
    network: string
    walletId: string
  } | null

  /**
   * Fetches the balance for the given assets directly from the network.
   * This method does not use any cached data and always returns fresh results.
   */
  getBalance: (tokens: IAsset[]) => Promise<BalanceFetchResult[]>

  /**
   * Executes a transfer of any asset, from native coins to smart contract tokens.
   */
  send: (params: TransactionParams) => Promise<TransactionResult>

  /**
   * Signs a simple UTF-8 string message with the account's private key.
   */
  sign: (message: string) => Promise<string>

  /**
   * Verifies a signature.
   */
  verify: (message: string, signature: string) => Promise<boolean>

  /**
   * Accesses chain-specific or other modular features not included in the core API.
   * Returns a typed, proxied interface for the specified namespace.
   * @example
   * const btcAccount = useAccount<WalletAccountBtc>();
   * const btcExtension = btcAccount.extension();
   * const utxos = await btcExtension.getTransfers();
   */
  extension: () => T
}

export function useAccount<T extends object = {}>(
  accountParams: UseAccountParams,
): UseAccountReturn<T> {
  const { address, isLoading, error: addressLoaderError } = useAddressLoader(accountParams)

  const activeWalletId = getWalletStore()((state) => state.activeWalletId)
  
  const activeWalletError = useMemo(() => {
    if (!activeWalletId) {
      return new Error('No active wallet')
    } else {
      return null
    }
  }, [activeWalletId])

  const account = useMemo(
    () =>
      activeWalletId && address
        ? {
            accountIndex: accountParams.accountIndex,
            network: accountParams.network,
            walletId: activeWalletId,
          }
        : null,
    [accountParams.accountIndex, accountParams.network, activeWalletId, address],
  )

  const getBalance = useCallback(
    async (tokens: IAsset[]): Promise<BalanceFetchResult[]> => {
      if (!account) {
        throw new Error('Cannot get balance: no active account.')
      }

      if (!tokens || tokens.length === 0) {
        return []
      }

      const results = await Promise.all(
        tokens.map(async (asset) => {
          try {
            let balanceResult: string

            if (asset.isNative()) {
              balanceResult = await AccountService.callAccountMethod<
                'getBalance'
              >(account.network, account.accountIndex, 'getBalance')
            } else {
              const tokenAddress = asset.getContractAddress()

              if (!tokenAddress) {
                throw new Error('Token address cannot be null')
              }

              balanceResult = await AccountService.callAccountMethod<
                'getTokenBalance'
              >(
                account.network,
                account.accountIndex,
                'getTokenBalance',
                tokenAddress,
              )
            }

            const balance = convertBalanceToString(balanceResult)

            return {
              success: true,
              network: account.network,
              accountIndex: account.accountIndex,
              assetId: asset.getId(),
              balance,
            }
          } catch (err) {
            return {
              success: false,
              network: account.network,
              accountIndex: account.accountIndex,
              assetId: asset.getId(),
              balance: null,
              error: err instanceof Error ? err.message : String(err),
            }
          }
        }),
      )

      return results
    },
    [account],
  )

  const send = useCallback(
    async (params: TransactionParams): Promise<TransactionResult> => {
      if (!account) {
        throw new Error('Cannot send transaction: no active account.')
      }
      
      const { to, asset, amount } = params

      if (asset.isNative()) {
        return await AccountService.callAccountMethod<'sendTransaction'>(
          account.network,
          account.accountIndex,
          'sendTransaction',
          {
            to,
            value: amount,
          },
        )
      } else {
        const tokenAddress = asset.getContractAddress()

        if (!tokenAddress) {
          throw new Error('Token address cannot be null')
        }

        return await AccountService.callAccountMethod<'transfer'>(
          account.network,
          account.accountIndex,
          'transfer',
          {
            recipient: to,
            amount,
            token: tokenAddress,
          },
        )
      }
    },
    [account],
  )

  const sign = useCallback(
    async (message: string): Promise<string> => {
      if (!account) {
        throw new Error('Cannot sign message: no active account.')
      }
      const signature = await AccountService.callAccountMethod<'sign'>(
        account.network,
        account.accountIndex,
        'sign',
        message,
      )

      return signature
    },
    [account],
  )

  const verify = useCallback(
    async (message: string, signature: string): Promise<boolean> => {
      if (!account) {
        throw new Error('Cannot verify signature: no active account.')
      }
      
      const isValid = await AccountService.callAccountMethod<'verify'>(
        account.network,
        account.accountIndex,
        'verify',
        message,
        signature,
      )

      return isValid
    },
    [account],
  )

  const extension = useCallback((): T => {
    if (!account) {
      return new Proxy({} as T, {
        get: (_target, prop) => {
          if (prop === 'then') return undefined // Avoid issues with promise-like checks
          
          return () => {
            throw new Error(
              `Cannot call extension method "${String(
                prop,
              )}": no active account.`,
            )
          }
        },
      })
    }

    return new Proxy({} as T, {
      get: (_target, prop) => {
        if (typeof prop === 'string') {
          return async (...args: unknown[]) => {
            return await AccountService.callAccountMethod(
              account.network,
              account.accountIndex,
              prop,
              ...args,
            )
          }
        }
      },
    })
  }, [account])

  return useMemo(
    () => ({
      address,
      isLoading,
      error: activeWalletError ?? addressLoaderError,
      account,
      getBalance,
      send,
      sign,
      verify,
      extension,
    }),
    [
      address,
      isLoading,
      activeWalletError,
      addressLoaderError,
      account,
      getBalance,
      send,
      sign,
      verify,
      extension,
    ],
  )
}
