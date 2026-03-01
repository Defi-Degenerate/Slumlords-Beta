mint: (
            <div className="flex flex-col gap-4 h-full overflow-y-auto p-4 pb-16">
                <RetroWindow title="BURN_PROTOCOL_LOG.SYS" headerColor="from-red-900 to-red-600">
                    <div className="p-4 bg-black text-[#39ff14] font-mono text-[10px] space-y-2 uppercase leading-relaxed shadow-inner">
                        <div className="flex items-center gap-2 text-red-500 border-b border-red-900 pb-1">
                            <Flame size={14}/> <span className="font-bold">SYSTEMIC LIQUIDITY INCINERATION ACTIVE</span>
                        </div>
                        <p>Each deed acquisition executes a market buy-back protocol.</p>
                        <p>{" > "} 100% of minting proceeds are injected into the $RENT liquidity pools.</p>
                        <p>{" > "} Protocol market-buys $RENT and executes an immediate permanent burn (Incineration).</p>
                        <p>{" > "} Result: Every new property drives up the floor price for the ruling class. Scarcity is programmed.</p>
                        <p className="text-gray-500 italic">Your expansion is the market's contraction. Profit is absolute.</p>
                    </div>
                </RetroWindow>

                <div className="flex flex-col md:flex-row gap-4 justify-center items-stretch flex-1">
                    <RetroWindow title="WL_ACCESS.EXE" className="w-full max-w-sm" headerColor="from-purple-900 to-purple-600">
                        <div className="p-6 flex flex-col items-center gap-6 h-full">
                            <FileSignature size={64} className="text-purple-700"/>
                            <h2 className="text-xl font-bold uppercase tracking-tighter text-center">Whitelist Market</h2>
                            <RetroInset className="w-full p-4 text-sm font-bold space-y-2 bg-white uppercase shadow-inner">
                                {store.wl ? <div className="flex justify-between border-b pb-1"><span>WL_FEE:</span><span className="text-purple-700 font-mono">{String(store.wlCostEthRaw)} ETH</span></div> : <div className="text-red-600 text-center font-bold">UNAUTHORIZED_WALLET</div>}
                            </RetroInset>
                            {store.wl ? (
                                <div className="flex flex-col w-full gap-6 mt-auto">
                                    <div className="flex items-center justify-center gap-8">
                                        <RetroBtn onClick={() => setWlMintQty(Math.max(1, wlMintQty-1))} className="p-3"><Minus size={20}/></RetroBtn>
                                        <span className="font-bold text-3xl font-mono">{wlMintQty}</span>
                                        <RetroBtn onClick={() => setWlMintQty(Math.min(10, wlMintQty+1))} className="p-3"><Plus size={20}/></RetroBtn>
                                    </div>
                                    <RetroBtn onClick={() => actionMint(true)} className="w-full bg-purple-200 py-4 font-bold text-sm uppercase border-2 border-black">SIGN MINT PROTOCOL</RetroBtn>
                                </div>
                            ) : (
                                <div className="w-full space-y-2 mt-4 h-full flex flex-col justify-end">
                                    <RetroBtn onClick={actionBuyWhitelist} className="w-full font-bold py-3 bg-yellow-300 border-2 border-black font-bold uppercase">BUY WL SPOT (0.2 ETH)</RetroBtn>
                                </div>
                            )}
                        </div>
                    </RetroWindow>
                    <RetroWindow title="PUBLIC_ASSET_MARKET" className="w-full max-w-sm" headerColor="from-blue-900 to-blue-600">
                        <div className="p-6 flex flex-col items-center gap-6 h-full">
                            <Building size={64} className="text-blue-700 drop-shadow-md"/>
                            <h2 className="text-xl font-bold uppercase tracking-tighter text-center">Public Offering</h2>
                            <RetroInset className="w-full p-4 text-sm font-bold space-y-2 bg-white uppercase shadow-inner">
                                <div className="flex justify-between border-b pb-1"><span>UNIT_COST:</span><span className="font-mono">{String(store.gameCostEthDisplay)} ETH</span></div>
                                <div className="flex justify-between"><span>CURR_RENT:</span><span className="font-mono text-green-700">{String(store.gameCostRentDisplay)} RENT</span></div>
                            </RetroInset>
                            <div className="flex flex-col w-full gap-6 mt-auto text-center">
                                <div className="flex items-center justify-center gap-8 mb-4">
                                    <RetroBtn onClick={() => setPublicMintQty(Math.max(1, publicMintQty-1))} className="p-3"><Minus size={20}/></RetroBtn>
                                    <span className="font-bold text-3xl font-mono">{publicMintQty}</span>
                                    <RetroBtn onClick={() => setPublicMintQty(Math.min(10, publicMintQty+1))} className="p-3"><Plus size={20}/></RetroBtn>
                                </div>
                                <p className="text-[9px] text-gray-500 mb-2 italic text-center">SIGNATURE REQUIRES ETH-TO-RENT SWAP & BURN</p>
                                <RetroBtn onClick={() => actionMint(false)} className="w-full bg-blue-200 py-4 font-bold text-sm uppercase border-2 border-black">PURCHASE DEEDS</RetroBtn>
                            </div>
                        </div>
                    </RetroWindow>
                </div>
            </div>
        ),