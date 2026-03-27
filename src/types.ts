// Copyright 2026 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Core Type Definitions
 *
 * All network, token, and wallet type definitions for the WDK React Native Core library.
 */

import type { AssetConfig, IAsset } from './entities/asset'
export type { AssetConfig, IAsset }

import type {
  NetworkConfig,
  ProtocolConfig,
  WdkWorkletConfig,
} from './types/hrpc'

/**
 * Network Configurations (Generic)
 * Wrapper around NetworkConfigs to support typed config.
 */
export interface WdkNetworkConfig<
  T = Record<string, unknown>,
> extends NetworkConfig {
  config: T
}

/**
 * Protocol Configurations (Generic)
 * Wrapper around ProtocolConfigs to support typed config.
 */
export interface WdkProtocolConfig<
  T = Record<string, unknown>,
> extends ProtocolConfig {
  config: T
}

/**
 * WDK Configuration (Generic)
 *
 * The root configuration object passed to the WDK worklet.
 * Matches WdkWorkletConfig structure but with generics.
 */
export interface WdkConfigs<
  TNetwork = Record<string, unknown>,
  TProtocol = Record<string, unknown>,
> extends WdkWorkletConfig {
  networks: {
    [blockchain: string]: WdkNetworkConfig<TNetwork>
  }
  protocols?: {
    [protocolName: string]: WdkProtocolConfig<TProtocol>
  }
}

/**
 * @deprecated
 * Balance Fetch Result
 *
 * Result of a balance fetch operation.
 */
export interface BalanceFetchResult {
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

/**
 * Wallet Store Interface
 *
 * Interface for wallet store implementations that provide account methods
 * and wallet initialization status.
 */
export interface WalletStore {
  /** Call a method on a wallet account
   * @param args - Single argument or array for multi-param methods (array gets spread)
   */
  callAccountMethod: <T = unknown>(
    network: string,
    accountIndex: number,
    methodName: string,
    args?: unknown | unknown[],
  ) => Promise<T>
  /** Check if the wallet is initialized */
  isWalletInitialized: () => boolean
}

export {
  LogType,
  type LogRequest,
  type WorkletStartRequest,
  type WorkletStartResponse,
  type DisposeRequest,
  type CallMethodRequest,
  type CallMethodResponse,
  type HRPC,
  type BundleConfig,
} from './types/hrpc'

type AddressIdentifier = {
  network: string
  accountIndex: number
}

export type AddressInfo = AddressIdentifier & {
  address: string
}

export type AddressInfoResult =
  | (AddressIdentifier & {
      success: true
      address: string
    })
  | (AddressIdentifier & {
      success: false
      reason: Error
    })
