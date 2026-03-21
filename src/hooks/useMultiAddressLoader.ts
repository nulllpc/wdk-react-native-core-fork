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

import { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AddressService } from '../services/addressService';
import { getWalletStore } from '../store/walletStore';
import { logError } from '../utils/logger';

export interface AddressResult {
  network: string;
  address: string;
}

interface UseMultiAddressLoaderParams {
  networks: string[];
  accountIndex: number;
  enabled?: boolean;
}

interface UseMultiAddressLoaderResult {
  addresses: AddressResult[] | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * A hook to load addresses for multiple networks concurrently.
 * It reads from the central walletStore and triggers loading via AddressService.
 * The returned addresses array preserves the order of the input networks array.
 * @param params - The networks and account index to load addresses for.
 * @returns An object with the loaded addresses, the overall loading state, and any potential error.
 */
export function useMultiAddressLoader({
  networks,
  accountIndex,
  enabled = true,
}: UseMultiAddressLoaderParams): UseMultiAddressLoaderResult {
  const [error, setError] = useState<Error | null>(null);

  const { activeWalletId, activeAddresses, activeLoading } = getWalletStore()(
    useShallow((state) => {
      const activeId = state.activeWalletId
      return {
        activeWalletId: activeId,
        activeAddresses: activeId ? state.addresses[activeId] : undefined,
        activeLoading: activeId ? state.walletLoading[activeId] : undefined,
      };
    }),
  );

  const { addressesFromStore, isLoadingFromStore } = useMemo(() => {
    const walletAddresses = activeAddresses || {}
    const walletLoading = activeLoading || {}

    const selectedAddresses: Record<string, string> = {}
    const selectedLoading: Record<string, boolean> = {}

    for (const network of networks) {
      selectedAddresses[network] =
        walletAddresses[network]?.[accountIndex] || ''
      selectedLoading[network] =
        walletLoading[`${network}-${accountIndex}`] || false
    }

    return {
      addressesFromStore: selectedAddresses,
      isLoadingFromStore: selectedLoading,
    };
  }, [activeAddresses, activeLoading, networks, accountIndex])

  useEffect(() => {
    const networksToLoad = networks.filter(
      (network) => !addressesFromStore[network] && !isLoadingFromStore[network],
    )

    if (!enabled || networksToLoad.length === 0 || !activeWalletId) {
      return
    }

    let isCancelled = false;

    const load = async () => {
      setError(null);
      try {
        await AddressService.getAddresses([accountIndex], networksToLoad);
      } catch (e) {
        if (!isCancelled) {
          const err =
            e instanceof Error ? e : new Error('Failed to load addresses');
          logError('useMultiAddressLoader failed:', err);
          setError(err);
        }
      }
    };

    load()

    return () => {
      isCancelled = true
    };
  }, [
    networks,
    accountIndex,
    enabled,
    activeWalletId,
    addressesFromStore,
    isLoadingFromStore,
  ]);

  const addresses = useMemo(() => {
    const allLoaded = networks.every((network) => addressesFromStore[network])
    if (!allLoaded) {
      return null
    }
    return networks.map((network) => ({
      network,
      address: addressesFromStore[network] as string,
    }));
  }, [networks, addressesFromStore])

  const isLoading = useMemo(() => {
    return networks.some((network) => isLoadingFromStore[network])
  }, [networks, isLoadingFromStore])

  return { addresses, isLoading, error }
}
