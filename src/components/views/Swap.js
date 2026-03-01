swap: (
            <div className="flex items-center justify-center h-full p-4 overflow-y-auto">
                <RetroWindow title="PAWN_SHOP_ROUTER" className="w-full max-w-sm" headerColor="from-red-900 to-red-600">
                    <div className="p-8 space-y-8 uppercase">
                        <div className="bg-black text-green-400 p-4 text-[11px] font-mono border-4 border-double border-gray-600 shadow-inner leading-relaxed">
                          {" > "} UNISWAP_V2_ROUTER<br/>
                          {" > "} SELL_ASSET :: $RENT<br/>
                          {" > "} BUY_ASSET :: $ETH
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold"><span>SELL QUANTITY ($RENT)</span><span className="font-mono">BAL: {String(balances.rent)}</span></div>
                            <div className="flex gap-2">
                                <input type="number" value={swapInput} onChange={e=>setSwapInput(e.target.value)} className="retro-inset flex-1 p-2 bg-white text-2xl outline-none font-mono text-right" placeholder="0.0"/>
                                <RetroBtn onClick={()=>setSwapInput(balances.rent)} className="px-4 border-2 border-black font-bold uppercase">MAX</RetroBtn>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4 pt-4">
                            {allowances.router < parseFloat(swapInput || "0") && (
                                <RetroBtn onClick={()=>executeTx(()=>contracts.token.approve(CONFIG.ROUTER, getMaxUint()), "ROUTER AUTHORIZED")} className="bg-yellow-100 py-3 border-2 border-black text-sm font-bold uppercase">1. AUTHORIZE ROUTER</RetroBtn>
                            )}
                            <RetroBtn onClick={actionSwap} className="bg-red-200 py-6 font-bold text-lg border-2 border-black shadow-[6px_6px_0px_#000] uppercase">2. EXECUTE ASSET DUMP</RetroBtn>
                        </div>
                    </div>
                </RetroWindow>
            </div>
        )
    };