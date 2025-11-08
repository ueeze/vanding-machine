'use client'

import { useState, useEffect } from 'react'
import { parseEther } from 'ethers'
import { connectWallet, ensureNetwork, getContract } from '../lib/eth'
import { ownerAddress } from '../lib/constants'

const itemNames = ['Apple Juice', 'Grape Juice', 'Coke', 'Water']

export default function Home() {
  const [account, setAccount] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [stocks, setStocks] = useState<(number | null)[]>([
    null,
    null,
    null,
    null,
  ])
  const [stockInputs, setStockInputs] = useState<number[]>([0, 0, 0, 0])

  const isOwner = account?.toLowerCase() === ownerAddress.toLowerCase()

  useEffect(() => {
    checkAllStocks()
  }, [])

  const onConnect = async () => {
    try {
      const addr = await connectWallet()
      setAccount(addr)
      setStatus('✅ 지갑 연결 완료')
    } catch (e: any) {
      setStatus(`❌ 지갑 연결 실패: ${e.message}`)
    }
  }

  const buyItem = async (index: number) => {
    try {
      if (!account) {
        setStatus('❌ 먼저 지갑을 연결해 주세요.')
        return
      }

      await ensureNetwork()
      const contract = await getContract(true)
      const tx = await contract.buyItem(index, {
        value: parseEther('0.0001'),
      })
      await tx.wait()
      setStatus(`🛒 ${itemNames[index]} 구매 완료`)
      checkStock(index)
    } catch (e: any) {
      setStatus(`❌ 구매 실패: ${e.message}`)
    }
  }

  const addStock = async (index: number, amount: number) => {
    try {
      if (amount <= 0) {
        setStatus('❌ 1개 이상 입력하세요.')
        return
      }
      const contract = await getContract(true)
      const tx = await contract.addStock(index, amount)
      await tx.wait()
      setStatus(`✅ ${itemNames[index]} 재고 ${amount}개 추가 완료`)
      checkStock(index)

      const updated = [...stockInputs]
      updated[index] = 0
      setStockInputs(updated)
    } catch (e: any) {
      setStatus(`❌ 재고 추가 실패: ${e.message}`)
    }
  }

  const withdrawBalance = async () => {
    try {
      const contract = await getContract(true)
      const tx = await contract.withdrawBalance()
      await tx.wait()
      setStatus('💸 잔액 인출 완료')
    } catch (e: any) {
      setStatus(`❌ 인출 실패: ${e.message}`)
    }
  }

  const checkStock = async (index: number) => {
    try {
      const contract = await getContract(true)
      const [, stock] = await contract.checkStock(index)
      const newStocks = [...stocks]
      newStocks[index] = Number(stock)
      setStocks(newStocks)
    } catch (e: any) {
      setStatus(`⚠️ 재고 확인 실패: ${e.message}`)
    }
  }

  const checkAllStocks = async () => {
    try {
      const contract = await getContract(true)
      const stockPromises = itemNames.map((_, i) =>
        contract
          .checkStock(i)
          .then(([_, stock]: [string, number]) => Number(stock))
      )
      const allStocks = await Promise.all(stockPromises)
      setStocks(allStocks)
    } catch (e: any) {
      setStatus(`⚠️ 전체 재고 확인 실패: ${e.message}`)
    }
  }

  return (
    <main>
      <h1>🥤 Web3 자판기</h1>

      <div className="card">
        <button onClick={onConnect}>
          {account ? `지갑: ${account}` : '지갑 연결'}
        </button>
        <button onClick={checkAllStocks}>📦 전체 재고 확인</button>
      </div>

      {itemNames.map((name, index) => (
        <div className="item card" key={index}>
          <h3>{name}</h3>
          <p>재고: {stocks[index] ?? '확인 전'}</p>

          <button onClick={() => buyItem(index)} disabled={!account}>
            🛒 구매 (0.0001 ETH)
          </button>
          <button onClick={() => checkStock(index)}>🔍 재고 확인</button>

          {isOwner && (
            <div style={{ marginTop: '8px' }}>
              <input
                type="number"
                min="1"
                value={stockInputs[index] ?? 0}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const updated = [...stockInputs]
                  updated[index] = Number(e.target.value)
                  setStockInputs(updated)
                }}
                style={{
                  width: '60px',
                  marginRight: '8px',
                }}
              />
              <button onClick={() => addStock(index, stockInputs[index])}>
                ➕ 재고 추가
              </button>
            </div>
          )}
        </div>
      ))}

      {isOwner && (
        <div className="card">
          <h3>👑 관리자 기능</h3>
          <button onClick={withdrawBalance}>💸 잔액 인출</button>
        </div>
      )}

      <p className="status">{status}</p>
    </main>
  )
}
