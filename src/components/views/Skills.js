skills: (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full p-4 overflow-y-auto">
                <RetroWindow title="CITY_HALL_INFLUENCE" headerColor="from-yellow-700 to-yellow-500">
                    <div className="p-4 space-y-4 h-full flex flex-col uppercase">
                        <RetroInset className="p-4 bg-gray-100 flex justify-between items-center text-xs font-bold shadow-inner">
                          <div>INFLUENCE: <span className="text-blue-700 text-2xl font-mono">{String(skills.avail - (skills.draft.f+skills.draft.y+skills.draft.t+skills.draft.s))}</span><br/><span className="text-[10px] text-gray-500 font-mono">BRIB_FEE: {String(skills.nextCost)} RENT</span></div>
                          <RetroBtn onClick={()=>executeTx(()=>contracts.portfolio.purchaseSkillPoints(1), "BRIBED")} className="bg-blue-100 px-6 border-2 border-black shadow-none font-bold uppercase">BUY</RetroBtn>
                        </RetroInset>
                        <div className="space-y-4 text-xs font-bold px-2 py-6 bg-gray-50 border-2 border-black shadow-inner">
                          {[{k:'f',l:'Fatigue Reduction'},{k:'y',l:'Yield Multiplier'},{k:'t',l:'Tax Evasion'},{k:'s',l:'Stake Slots'}].map(s=>(
                            <div key={s.k} className="flex justify-between items-center border-b border-gray-200 pb-2">
                              <span>{s.l}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-xl bg-black text-[#39ff14] px-4 py-1 font-mono">{String(skills[s.k]+skills.draft[s.k])}</span>
                                <div className="flex flex-col gap-1">
                                  <button onClick={()=>modSkill(s.k, 1)} className="border-2 border-black bg-[#dfdfdf] px-2 py-0.5 text-[10px] font-bold active:bg-gray-400">+</button>
                                  <button onClick={()=>modSkill(s.k, -1)} className="border-2 border-black bg-[#dfdfdf] px-2 py-0.5 text-[10px] font-bold active:bg-gray-400">-</button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <RetroBtn onClick={actionSaveSkills} className="w-full bg-green-200 py-4 mt-auto font-bold text-sm border-2 border-black uppercase">SIGN CHANGES</RetroBtn>
                    </div>
                </RetroWindow>
            </div>
        ),