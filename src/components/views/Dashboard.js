dashboard: (
            <div className="space-y-4">
                <RetroWindow className="bg-yellow-100" headerColor="from-yellow-600 to-yellow-800" title="OS_NOTIFICATIONS">
                    <p className="text-[11px] font-bold p-1 uppercase">Empire statistics live. Node synchronized.</p>
                </RetroWindow>
                <RetroWindow title="YIELD_RESERVE">
                    <div className="retro-inset bg-black p-4 flex flex-col items-center justify-center min-h-[120px]">
                        <div className="flex w-full justify-between px-4 mb-2 text-[10px] font-mono text-gray-400 uppercase border-b border-gray-800 pb-1">
                            <span>Yield/Day: <span className="text-yellow-400">{String(stats.totalYield)}</span></span>
                            <span>Fatigue: <span className="text-orange-400">{String(stats.fatigue)}%</span></span>
                        </div>
                        <span className="text-5xl font-bold text-[#39ff14] font-mono">{tickingPending.toFixed(6)}</span>
                        <span className="text-[10px] text-gray-500 font-mono tracking-widest mt-2 uppercase">$RENT_UNCLAIMED</span>
                    </div>
                    <RetroBtn onClick={() => executeTx(() => contracts.portfolio.claimYield({ gasLimit: 2500000 }), "RENT CLAIMED")} className="w-full bg-green-300 py-3 mt-2 text-sm border-2 border-black uppercase font-bold">EXTRACT FUNDS</RetroBtn>
                    <div className="mt-4 pt-3 border-t-2 border-gray-400 border-dashed">
                        <div className="text-[10px] font-bold mb-2 uppercase tracking-widest text-center text-gray-700">DAILY SUPPLEMENTS</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {allowances.portfolio < 100000 ? (
                                <RetroBtn onClick={() => actionApproveToken(CONFIG.PORTFOLIO)} className="w-full md:col-span-2 bg-yellow-200 hover:bg-yellow-300 py-2 text-[10px] border-2 border-black font-bold uppercase">AUTHORIZE PORTFOLIO</RetroBtn>
                            ) : (
                                <>
                                    <RetroBtn disabled={consumables.fActive} onClick={() => executeTx(() => contracts.portfolio.activateFatigueConsumable(), "DRINK CONSUMED")} className={`w-full py-2 text-[10px] border-2 border-black font-bold uppercase ${consumables.fActive ? 'bg-gray-400 text-gray-700' : 'bg-blue-100 hover:bg-blue-200'}`}>
                                        <Coffee size={14} className="mr-1"/>
                                        {consumables.fActive ? `ACTIVE (${formatCountdown(consumables.fEndTime) || '...'})` : `DRINK (${String(consumables.fCost)} RENT)`}
                                    </RetroBtn>
                                    <RetroBtn disabled={consumables.yActive} onClick={() => executeTx(() => contracts.portfolio.activateYieldConsumable(), "INJECTED STEROIDS")} className={`w-full py-2 text-[10px] border-2 border-black font-bold uppercase ${consumables.yActive ? 'bg-gray-400 text-gray-700' : 'bg-green-100 hover:bg-green-200'}`}>
                                        <ArrowUp size={14} className="mr-1"/>
                                        {consumables.yActive ? `ACTIVE (${formatCountdown(consumables.yEndTime) || '...'})` : `STEROIDS (${String(consumables.yCost)} RENT)`}
                                    </RetroBtn>
                                </>
                            )}
                        </div>
                    </div>
                </RetroWindow>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <RetroWindow title="SYNERGY_MATRIX" headerColor="from-purple-800 to-purple-600" className="h-full">
                        <div className="flex flex-col h-full p-1 min-w-0">
                            <div className="text-[9px] font-bold uppercase flex justify-between px-1"><span>NETWORK LINKS</span><span className="text-blue-700">STKD: {nfts.staked.length}</span></div>
                            {renderPairingGraph()}
                        </div>
                    </RetroWindow>
                    <RetroWindow title="ZONE_DISTRIBUTION" className="h-full">
                        <div className="p-1 h-[200px]">{renderZoneBars()}</div>
                    </RetroWindow>
                </div>
            </div>
        ),
        portfolio: (
            <div className="flex flex-col h-full gap-2 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 shrink-0">
                    <RetroWindow title="OPS" headerColor="from-blue-800 to-blue-600">
                        <div className="p-1 flex flex-col gap-1 h-full">
                            <div className="flex gap-1"><RetroBtn active={portfolioTab==='wallet'} onClick={()=>setPortfolioTab('wallet')} className="flex-1 font-bold">WALLET</RetroBtn><RetroBtn active={portfolioTab==='staked'} onClick={()=>setPortfolioTab('staked')} className="flex-1 font-bold">STAKED</RetroBtn></div>
                            <RetroBtn onClick={() => { const l = portfolioTab==='wallet' ? nfts.wallet : nfts.staked; setSelectedNFTs(selectedNFTs.length ? [] : l.map(n=>n.id)); }} className="w-full text-[9px] py-1 border-2 border-black font-bold">SELECT ALL</RetroBtn>
                        </div>
                    </RetroWindow>
                    <RetroWindow title="CAPACITY" headerColor="from-green-800 to-green-600">
                        <div className="p-2 space-y-1 font-bold text-[9px] uppercase h-full flex flex-col justify-center">
                            <div className="flex justify-between"><span>STAKED:</span> <span>{nfts.staked.length}/{stats.maxStaked}</span></div>
                            <div className="border-2 border-black h-1 bg-gray-300 overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${(nfts.staked.length / stats.maxStaked) * 100}%` }}></div></div>
                            <div className="flex justify-between"><span>FATIGUE:</span> <span>{String(stats.fatigue)}%</span></div>
                            <div className="border-2 border-black h-1 bg-gray-300 overflow-hidden"><div className="h-full bg-red-600 shadow-[0_0_5px_rgba(220,38,38,0.5)]" style={{ width: `${stats.fatigue}%` }}></div></div>
                        </div>
                    </RetroWindow>
                    <RetroWindow title="PACIFICATION" headerColor="from-red-800 to-red-600">
                        <div className="p-1 flex flex-col justify-between h-full gap-1">
                             <div className="flex justify-between text-[10px] font-bold px-1"><span>FEE:</span><span className="text-red-700">{String(stats.resetCost)} RENT</span></div>
                             <RetroBtn disabled={isFatigueZero} onClick={() => executeTx(() => contracts.portfolio.resetFatigue(), "PACIFIED")} className="w-full bg-yellow-200 py-1 border-2 border-black text-[10px] font-bold"><Coffee size={12}/> RESET FATIGUE</RetroBtn>
                        </div>
                    </RetroWindow>
                </div>
                <RetroInset className="flex-1 p-2 overflow-y-auto bg-[#c0c0c0] min-h-0 relative shadow-inner">
                    <div className="flex justify-end items-center mb-2">
                        {selectedNFTs.length > 0 && (
                            <div className="bg-yellow-100 border-4 border-black p-1 flex items-center gap-2 shadow-[4px_4px_0px_#000]">
                                <span className="font-bold text-[11px] uppercase px-2"><Zap size={14}/> {selectedNFTs.length} Units</span>
                                {portfolioTab==='wallet' ? <RetroBtn onClick={actionStakeSelected} className="bg-green-300 px-4 border-2 border-black font-bold uppercase">STAKE</RetroBtn> : <RetroBtn onClick={actionUnstakeSelected} className="bg-red-300 px-4 border-2 border-black font-bold uppercase">EVICT</RetroBtn>}
                                <RetroBtn onClick={()=>setSelectedNFTs([])} className="px-2 border-2 border-black shadow-none"><X size={12}/></RetroBtn>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-2 pb-8">
                        {(portfolioTab==='wallet' ? nfts.wallet : nfts.staked).map(item => (
                            <div key={item.id} className={`border-2 border-black bg-gray-200 p-1 cursor-pointer transition-all ${selectedNFTs.includes(item.id) ? 'scale-95 brightness-110 border-blue-600' : ''}`} onClick={()=>setSelectedNFTs(prev => prev.includes(item.id) ? prev.filter(id=>id!==item.id) : [...prev, item.id])}>
                                <div className="bg-gray-800 text-white text-[8px] py-0.5 px-1.5 flex justify-between font-mono"><span>#{String(item.id)}</span><span>T{String(item.tier + 1)}</span></div>
                                <div className="bg-white p-1">
                                  <div className="w-full aspect-square bg-gray-100 border border-gray-400 overflow-hidden relative">
                                    <div className="flex items-center justify-center h-full opacity-10"><ImageIcon size={18}/></div>
                                  </div>
                                  <div className="mt-1 flex flex-col gap-1">
                                    <div className="text-[10px] font-bold uppercase truncate bg-blue-50 px-1 border-b border-blue-200">{String(item.zone)}</div>
                                    {ZONE_MODIFIERS[item.zone] && (
                                        <div className="flex justify-between text-[7px] font-mono px-1 bg-gray-50 border border-gray-200">
                                            <span className={ZONE_MODIFIERS[item.zone].y.c}>Y:{String(ZONE_MODIFIERS[item.zone].y.v)}</span>
                                            <span className={ZONE_MODIFIERS[item.zone].f.c}>F:{String(ZONE_MODIFIERS[item.zone].f.v)}</span>
                                            <span className={ZONE_MODIFIERS[item.zone].t.c}>T:{String(ZONE_MODIFIERS[item.zone].t.v)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-[10px] font-bold text-green-700 font-mono"><DollarSign size={10} className="inline"/>{String(parseFloat(item.yield).toFixed(1))}/D</div>
                                  </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </RetroInset>
            </div>
        ),