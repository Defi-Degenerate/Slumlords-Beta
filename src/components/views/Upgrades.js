upgrades: (
            <div className="flex justify-center items-center h-full p-2 overflow-y-auto">
                <RetroWindow title="DARK_ALLEY_RENOS" className="w-full max-w-sm" headerColor="from-orange-900 to-orange-600">
                    <div className="p-8 flex flex-col items-center gap-6">
                        {store.upgInfo ? (
                            <>
                                <Hammer size={64} className="text-orange-600 drop-shadow-lg"/>
                                <h4 className="text-2xl font-bold uppercase text-center leading-tight tracking-tighter">{String(store.upgInfo.name)}</h4>
                                <RetroInset className="w-full p-4 text-sm font-bold space-y-3 bg-white border-2 border-black">
                                    <div className="flex justify-between uppercase"><span>ACQUISITION:</span><span className="font-mono">{String(store.upgInfo.costEth)} ETH</span></div>
                                    <div className="flex justify-between text-green-700 border-t-2 border-dashed border-gray-300 pt-2 uppercase"><span>YIELD_DELTA:</span><span className="font-mono">+{String(store.upgInfo.yield)}</span></div>
                                </RetroInset>
                                {allowances.upgradeNFT < parseFloat(store.upgInfo.costRent) && (
                                    <RetroBtn onClick={() => actionApproveToken(CONFIG.UPGRADE_NFT)} className="w-full bg-yellow-200 text-sm mb-2 border-2 border-black font-bold uppercase">1. APPROVE RENT</RetroBtn>
                                )}
                                <RetroBtn onClick={actionBuyUpg} className="w-full bg-orange-300 hover:bg-orange-400 font-bold py-5 text-sm uppercase border-2 border-black shadow-[4px_4px_0px_#000]">AUTHORIZE TRANSACTION</RetroBtn>
                            </>
                        ) : (
                            <div className="text-center space-y-4">
                                <RefreshCw className="animate-spin mx-auto text-orange-600" size={48}/>
                                <p className="font-bold text-xs uppercase text-gray-500">SCANNING_FOR_AVAILABLE_CONTRACTS...</p>
                            </div>
                        )}
                    </div>
                </RetroWindow>
            </div>
        ),