import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Asset, PortfolioItem } from '@/types/portfolio';
import { mockPriceService } from '@/services/mockPriceService';
import { marketPriceService } from '@/services/marketPriceService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, X, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export function OnboardingFlow() {
  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Local state for the investment forms
  const [investmentData, setInvestmentData] = useState<Record<string, Partial<PortfolioItem>>>({});

  const store = usePortfolioStore();
  const isAddingMore = store.items.length > 0;

  // Search logic
  const searchResults = searchQuery 
    ? mockPriceService.searchAssets(searchQuery)
    : mockPriceService.getPopularAssets().slice(0, 8); // Show some popular ones by default

  const handleToggleAsset = (asset: Asset) => {
    if (selectedAssets.find(a => a.symbol === asset.symbol)) {
      setSelectedAssets(prev => prev.filter(a => a.symbol !== asset.symbol));
    } else {
      setSelectedAssets(prev => [...prev, asset]);
      // Initialize default investment data
      setInvestmentData(prev => ({
        ...prev,
        [asset.symbol]: {
          symbol: asset.symbol,
          name: asset.name,
          investedAmountTHB: 0,
          buyPrice: 0,
          priceCurrency: asset.type === 'crypto' || asset.type === 'etf' || asset.type === 'stock' ? 'USD' : 'THB',
          exchangeRate: store.globalExchangeRate.rate || 36.00,
          useGlobalExchangeRate: true,
        }
      }));
    }
  };

  const handleNextStep = () => {
    if (selectedAssets.length > 0) {
      setStep(2);
    }
  };

  const handleInvestmentChange = (symbol: string, field: keyof PortfolioItem, value: number | string | boolean) => {
    setInvestmentData(prev => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        [field]: value
      }
    }));
  };

  const handleComplete = async () => {
    setIsChecking(true);
    setErrorMsg('');

    try {
      // Pre-check all selected assets
      for (const asset of selectedAssets) {
        await marketPriceService.getLivePrice(asset.symbol);
      }

      // Validate and save
      selectedAssets.forEach(asset => {
      const data = investmentData[asset.symbol];
      if (data) {
        store.addItem({
          id: crypto.randomUUID(),
          symbol: asset.symbol,
          name: asset.name,
          investedAmountTHB: Number(data.investedAmountTHB) || 0,
          buyPrice: Number(data.buyPrice) || 0,
          priceCurrency: data.priceCurrency as 'USD' | 'THB' || 'USD',
          exchangeRate: Number(data.exchangeRate) || store.globalExchangeRate.rate || 36.00,
          useGlobalExchangeRate: data.useGlobalExchangeRate ?? true,
        });
      }
    });
    store.completeSetup();
    } catch {
      setErrorMsg(`⚠️ ไม่สามารถดึงราคาของหุ้นบางตัวได้ในขณะนี้ (API อาจติดลิมิตหรือไม่มีข้อมูล) กรุณาลองใหม่ในภายหลัง`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-gold-light to-gold bg-clip-text text-transparent">
          {isAddingMore ? 'เพิ่มสินทรัพย์' : 'ยินดีต้อนรับสู่ Live Portfolio'}
        </h1>
        <p className="text-slate-400 text-lg">
          {step === 1 
            ? (isAddingMore ? 'ค้นหาและเลือกสินทรัพย์ที่คุณต้องการเพิ่มเข้าพอร์ต' : 'เริ่มต้นด้วยการเลือกสินทรัพย์ที่คุณมีอยู่') 
            : 'ระบุต้นทุนการลงทุนของคุณ'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <Input 
                    placeholder="ค้นหาสินทรัพย์ เช่น AAPL, BTC, PTT..." 
                    className="pl-10 h-12 text-lg bg-navy-900/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-3">สินทรัพย์ที่เลือก ({selectedAssets.length})</h3>
                  <div className="flex flex-wrap gap-2 min-h-[40px]">
                    {selectedAssets.length === 0 ? (
                      <span className="text-sm text-slate-600 italic">ยังไม่ได้เลือกสินทรัพย์</span>
                    ) : (
                      selectedAssets.map(asset => (
                        <Badge key={`sel-${asset.symbol}`} variant="outline" className="bg-navy-800 gap-1 pr-1">
                          {asset.symbol}
                          <button onClick={() => handleToggleAsset(asset)} className="hover:bg-white/10 rounded-full p-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">
                    {searchQuery ? 'ผลการค้นหา' : 'สินทรัพย์ยอดนิยม'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {searchResults.map(asset => {
                      const isSelected = !!selectedAssets.find(a => a.symbol === asset.symbol);
                      return (
                        <button
                          key={asset.symbol}
                          onClick={() => handleToggleAsset(asset)}
                          className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                            isSelected 
                              ? 'border-gold bg-gold/10' 
                              : 'border-white/10 bg-navy-800/50 hover:bg-navy-800 hover:border-white/30'
                          }`}
                        >
                          <span className="font-bold text-lg">{asset.symbol}</span>
                          <span className="text-xs text-slate-400 truncate w-full text-center">{asset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  {isAddingMore ? (
                    <Button variant="ghost" onClick={store.completeSetup}>ยกเลิก</Button>
                  ) : (
                    <div /> // placeholder to keep next button on the right
                  )}
                  <Button 
                    size="lg" 
                    variant="gold" 
                    disabled={selectedAssets.length === 0}
                    onClick={handleNextStep}
                  >
                    ถัดไป <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-4">
                {errorMsg}
              </div>
            )}
            {selectedAssets.map((asset) => {
              const data = investmentData[asset.symbol];
              return (
                <Card key={asset.symbol}>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-gold">{asset.symbol}</span>
                      <span className="text-slate-400 text-sm font-normal">{asset.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">เงินลงทุน (บาท)</label>
                        <Input 
                          type="number" 
                          min="0"
                          placeholder="e.g. 50000"
                          value={data?.investedAmountTHB || ''}
                          onChange={(e) => handleInvestmentChange(asset.symbol, 'investedAmountTHB', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">ราคาที่เข้าซื้อ ({data?.priceCurrency})</label>
                        <Input 
                          type="number" 
                          min="0"
                          step="0.0001"
                          placeholder="e.g. 150.5"
                          value={data?.buyPrice || ''}
                          onChange={(e) => handleInvestmentChange(asset.symbol, 'buyPrice', e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-sm text-slate-400 mb-1">สกุลเงินราคา</label>
                          <select 
                            className="flex h-10 w-full rounded-md border border-white/10 bg-navy-800/50 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            value={data?.priceCurrency || 'USD'}
                            onChange={(e) => handleInvestmentChange(asset.symbol, 'priceCurrency', e.target.value)}
                          >
                            <option value="USD">USD</option>
                            <option value="THB">THB</option>
                          </select>
                        </div>
                        {data?.priceCurrency === 'USD' && (
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-sm text-slate-400">อัตราแลกเปลี่ยน</label>
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="checkbox" 
                                  id={`use-global-${asset.symbol}`}
                                  checked={data?.useGlobalExchangeRate !== false}
                                  onChange={(e) => {
                                    handleInvestmentChange(asset.symbol, 'useGlobalExchangeRate', e.target.checked);
                                    if (e.target.checked) {
                                      handleInvestmentChange(asset.symbol, 'exchangeRate', store.globalExchangeRate.rate);
                                    }
                                  }}
                                  className="rounded border-white/10 bg-navy-800 text-gold focus:ring-gold"
                                />
                                <label htmlFor={`use-global-${asset.symbol}`} className="text-xs text-slate-500 cursor-pointer">Live (Auto)</label>
                              </div>
                            </div>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="36.00"
                              value={data?.useGlobalExchangeRate !== false ? store.globalExchangeRate.rate : (data?.exchangeRate || '')}
                              disabled={data?.useGlobalExchangeRate !== false}
                              onChange={(e) => handleInvestmentChange(asset.symbol, 'exchangeRate', e.target.value)}
                              className={data?.useGlobalExchangeRate !== false ? "opacity-60 bg-navy-900" : ""}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex justify-between mt-8">
              <Button variant="ghost" onClick={() => setStep(1)}>
                ย้อนกลับ
              </Button>
              <Button size="lg" variant="gold" onClick={handleComplete} disabled={isChecking}>
                {isChecking ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    กำลังตรวจสอบ...
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" /> {isAddingMore ? 'บันทึกเข้าพอร์ต' : 'เริ่มติดตามพอร์ต'}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
