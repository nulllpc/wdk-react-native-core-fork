/* Wallet Store V1 */

export interface WalletLoadingStatesV1 {
  [key: string]: boolean
}

export interface AccountInfoV1 {
  /** Account index (0-based) */
  accountIndex: number
  /** Account address for each network */
  addresses: Record<string, string>
}

export interface WalletInfoV1 {
  /** Wallet identifier (e.g., user email) */
  identifier: string
  /** Whether wallet exists in secure storage */
  exists: boolean
}

/**
 * Wallet loading state - tracks the lifecycle of loading a specific wallet
 * This is the single source of truth for wallet loading state
 */
export type WalletLoadingStateV1 =
  | { type: 'not_loaded' }
  | { type: 'checking'; identifier: string }
  | { type: 'loading'; identifier: string; walletExists: boolean }
  | { type: 'ready'; identifier: string }
  | { type: 'error'; identifier: string | null; error: Error }

export interface WalletStateV1 {
  // SOURCE OF TRUTH - addresses stored ONLY here (per-wallet)
  addresses: WalletAddressesByWalletV1 // walletId -> addresses
  walletLoading: Record<string, WalletLoadingStatesV1> // walletId -> loading states
  // SOURCE OF TRUTH - balances stored ONLY here (per-wallet)
  balances: WalletBalancesByWalletV1  // walletId -> balances
  // Maps walletId -> "network-accountIndex-assetId" -> boolean
  balanceLoading: Record<string, BalanceLoadingStatesV1>  // walletId -> loading states
  lastBalanceUpdate: Record<string, Record<string, Record<number, number>>>  // walletId -> network -> accountIndex -> timestamp
  // Account list management (per-wallet)
  accountList: Record<string, AccountInfoV1[]> // walletId -> account list
  // Wallet list management
  walletList: WalletInfoV1[]
  activeWalletId: string | null
  // SOURCE OF TRUTH - wallet loading state (replaces React reducer)
  walletLoadingState: WalletLoadingStateV1
  // Operation mutex - prevents concurrent wallet operations
  isOperationInProgress: boolean
  currentOperation: string | null // Description of current operation
  tempWalletId: string | null
}

export type WalletStoreV1 = WalletStateV1

/**
 * Wallet Addresses
 *
 * Maps network -> accountIndex -> address
 * Structure: { [network]: { [accountIndex]: address } }
 */
export type WalletAddressesV1 = Record<string, Record<number, string>>

/**
 * Wallet Addresses by Wallet Identifier
 *
 * Maps walletId -> network -> accountIndex -> address
 * Structure: { [walletId]: { [network]: { [accountIndex]: address } } }
 */
export type WalletAddressesByWalletV1 = Record<string, WalletAddressesV1>

/**
 * Wallet Balances
 *
 * Maps network -> accountIndex -> assetId -> balance
 * Structure: { [network]: { [accountIndex]: { [assetId]: balance } } }
 * Note: balance is stored as a string to handle BigInt values
 */
export type WalletBalancesV1 = Record<
  string,
  Record<number, Record<string, string>>
>

/**
 * Wallet Balances by Wallet Identifier
 *
 * Maps walletId -> network -> accountIndex -> assetId -> balance
 * Structure: { [walletId]: { [network]: { [accountIndex]: { [assetId]: balance } } } }
 */
export type WalletBalancesByWalletV1 = Record<string, WalletBalancesV1>

/**
 * Balance Loading States
 *
 * Maps "network-accountIndex-assetId" -> boolean
 * Used to track which balances are currently being fetched.
 */
export type BalanceLoadingStatesV1 = Record<string, boolean>

/**
 * Balance Fetch Result
 *
 * Result of a balance fetch operation.
 */
export interface BalanceFetchResultV1 {
  /** Whether the fetch was successful */
  success: boolean
  /** Network name */
  network: string
  /** Account index */
  accountIndex: number
  /** Asset identifier */
  assetId: string
  /** Balance as a string (null if fetch failed) */
  balance: string | null
  /** Error message (only present if success is false) */
  error?: string
}

/* Wallet Store V2 */

export type AccountByIndex = {
  accountIndex: number
  derivationPath?: never
}

export type AccountByPath = {
  derivationPath: string
  accountIndex?: never
}

export type AccountDescriptor = AccountByIndex | AccountByPath

export interface WalletInfoV2 {
  identifier: string
}

export enum StoreStateV2 {
  IDLE = 'IDLE',
  READING_SECURE_STORE = 'READING_SECURE_STORE',
  CREATING_WALLET = 'CREATING_WALLET',
  LOADING_WALLET = 'LOADING_WALLET',
  READY = 'READY',
  ERROR = 'ERROR',
}

export type WalletLoadingStateV2 =
  | { type: StoreStateV2.IDLE }
  | { type: StoreStateV2.READING_SECURE_STORE; identifier: string }
  | { type: StoreStateV2.CREATING_WALLET; identifier: string }
  | { type: StoreStateV2.LOADING_WALLET; identifier: string }
  | { type: StoreStateV2.READY; identifier: string }
  | { type: StoreStateV2.ERROR; identifier: string | null; error: Error }

export interface WalletStateV2 {
  version: 2
  addresses: Record<string, string> // key: walletId::network::accountKey
  balances: Record<string, string> // key: walletId::network::accountKey::assetId
  balanceLoading: Record<string, boolean> // key: walletId::network::accountKey::assetId
  lastBalanceUpdate: Record<string, number> // key: walletId::network::accountKey
  // Account & Wallet Lists
  accountList: Record<string, AccountDescriptor[]> // walletId -> account list
  walletList: WalletInfoV2[]
  activeWalletId: string | null
  // Runtime state
  walletLoadingState: WalletLoadingStateV2
  isOperationInProgress: boolean
  currentOperation: string | null
  tempWalletId: string | null
}

export type WalletStoreV2 = WalletStateV2

/**
 * Composite Key Format: `${walletId}::${network}::${accountKey}`
 * Account Key Format: `i:${accountIndex}` OR `p:${derivationPath}`
 */
 
export function getAccountKeyV2(descriptor: AccountDescriptor): string {
  if (descriptor.derivationPath !== undefined) {
    return `p:${descriptor.derivationPath}`
  }

  return `i:${descriptor.accountIndex}`
}

export function getCompositeKeyV2(
  walletId: string,
  network: string,
  accountKey: string,
): string {
  return `${walletId}::${network}::${accountKey}`
}

export function getBalanceKeyV2(compositeAccountKey: string, assetId: string) {
  return `${compositeAccountKey}::${assetId}`
}