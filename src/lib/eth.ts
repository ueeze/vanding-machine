import {
  BrowserProvider,
  Contract,
  Eip1193Provider,
  JsonRpcSigner,
  parseEther,
} from 'ethers'
import abi from './VendingMachine.json'
import { contractAddress, chainId } from './constants'

export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null
  const anyWindow = window as unknown as { ethereum?: Eip1193Provider }
  return anyWindow.ethereum ?? null
}

export function getBrowserProvider(): BrowserProvider {
  const injected = getInjectedProvider()
  if (!injected) {
    throw new Error('메타마스크가 설치되어 있지 않습니다.')
  }
  return new BrowserProvider(injected)
}

export async function getSigner(): Promise<JsonRpcSigner> {
  const provider = getBrowserProvider()
  return await provider.getSigner()
}

export async function ensureNetwork(): Promise<void> {
  const provider = getBrowserProvider()
  const network = await provider.getNetwork()
  if (Number(network.chainId) !== chainId) {
    throw new Error(`올바르지 않은 네트워크입니다. 필요: ${chainId}`)
  }
}

export async function connectWallet(): Promise<string> {
  const injected = getInjectedProvider()
  if (!injected || !('request' in injected)) {
    throw new Error('지갑 provider를 찾을 수 없습니다.')
  }
  const accounts = (await injected.request({
    method: 'eth_requestAccounts',
  })) as string[]
  if (!accounts || accounts.length === 0) {
    throw new Error('지갑 계정이 없습니다.')
  }
  return accounts[0]
}

export async function getContract(withSigner = false): Promise<Contract> {
  const provider = getBrowserProvider()
  if (withSigner) {
    const signer = await getSigner()
    return new Contract(contractAddress, abi, signer)
  }
  return new Contract(contractAddress, abi, provider)
}
