import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Asset, PortfolioItem } from '@/types/portfolio';
import { mockPriceService } from '@/services/mockPriceService';
import { marketPriceService } from '@/services/marketPriceService';
import { exchangeRateService } from '@/services/exchangeRateService';
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
  const { globalExchangeRate, updateGlobalExchangeRate } = store;
  const capturedExchangeRate =
    globalExchangeRate.status !== 'fallback' && globalExchangeRate.rate > 0
      ? globalExchangeRate.rate
      : undefined;

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
          buyExchangeRate: capturedExchangeRate,
          exchangeRate: capturedExchangeRate,
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

  useEffect(() => {
    let isCancelled = false;
    const rateAge = globalExchangeRate.lastUpdated
      ? Date.now() - globalExchangeRate.lastUpdated
      : Number.POSITIVE_INFINITY;

    const hasFreshRate =
      globalExchangeRate.status !== 'fallback' &&
      globalExchangeRate.lastUpdated &&
      rateAge < 60 * 60 * 1000;
    const hasRecentFallback =
      globalExchangeRate.status === 'fallback' &&
      globalExchangeRate.lastUpdated &&
      rateAge < 5 * 60 * 1000;

    if (hasFreshRate || hasRecentFallback) {
      return undefined;
    }

    const fetchInitialExchangeRate = async () => {
      const result = await exchangeRateService.getUsdToThbRate();

      if (isCancelled) {
        return;
      }

      if (result.status === 'fallback' && globalExchangeRate.status !== 'fallback' && globalExchangeRate.rate > 0) {
        updateGlobalExchangeRate(
          globalExchangeRate.rate,
          'cached',
          result.lastUpdated || Date.now(),
          result.errorReason
        );
        return;
      }

      updateGlobalExchangeRate(
        result.rate,
        result.status,
        result.lastUpdated || Date.now(),
        result.errorReason
      );
    };

    void fetchInitialExchangeRate();

    return () => {
      isCancelled = true;
    };
  }, [globalExchangeRate.lastUpdated, globalExchangeRate.rate, globalExchangeRate.status, updateGlobalExchangeRate]);

  const handleComplete = async () => {
    setIsChecking(true);
    setErrorMsg('');

    try {
      const missingExchangeRate = selectedAssets.find(asset => {
        const data = investmentData[asset.symbol];
        const priceCurrency = data?.priceCurrency || 'USD';
        const formExchangeRate = Number(data?.buyExchangeRate || data?.exchangeRate || capturedExchangeRate);

        return priceCurrency === 'USD' && (!formExchangeRate || formExchangeRate <= 0);
      });

      if (missingExchangeRate) {
        setErrorMsg(`กรุณากรอกเรท USD/THB สำหรับ ${missingExchangeRate.symbol} ก่อนบันทึก`);
        return;
      }

      // Pre-check all selected assets
      await Promise.all(selectedAssets.map((asset) => marketPriceService.getLivePrice(asset.symbol)));

      // Validate and save
      selectedAssets.forEach(asset => {
      const data = investmentData[asset.symbol];
      if (data) {
        const priceCurrency = data.priceCurrency as 'USD' | 'THB' || 'USD';
        const buyExchangeRate = priceCurrency === 'USD'
          ? Number(data.buyExchangeRate || data.exchangeRate || capturedExchangeRate)
          : 1;

        store.addItem({
          id: crypto.randomUUID(),
          symbol: asset.symbol,
          name: asset.name,
          investedAmountTHB: Number(data.investedAmountTHB) || 0,
          buyPrice: Number(data.buyPrice) || 0,
          priceCurrency,
          buyExchangeRate,
          exchangeRate: priceCurrency === 'USD' ? buyExchangeRate : undefined,
          exchangeRateCapturedAt: Date.now(),
          useGlobalExchangeRate: true,
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
    <div className="mx-auto w-full max-w-3xl min-w-0 py-8 md:py-12">
      <div className="mb-8 text-center md:mb-10">
        <h1 className="mb-4 bg-gradient-to-r from-gold-light to-gold bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
          {isAddingMore ? 'เพิ่มสินทรัพย์' : 'ยินดีต้อนรับสู่ Live Portfolio'}
        </h1>
        <p className="text-base text-slate-400 md:text-lg">
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
            exit={{ opacity: 0, y: -12 }}
            className="w-full min-w-0"
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="w-full min-w-0 space-y-4"
          >
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-4">
                {errorMsg}
              </div>
            )}
            {selectedAssets.map((asset) => {
              const data = investmentData[asset.symbol];
              return (
                <Card key={asset.symbol} className="w-full min-w-0">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-gold">{asset.symbol}</span>
                      <span className="text-slate-400 text-sm font-normal">{asset.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
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
                      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:gap-2">
                        <div className="min-w-0 md:flex-1">
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
                          <div className="min-w-0 md:flex-1">
                            <label className="mb-1 block text-sm text-slate-400">เรทวันที่เพิ่มพอร์ต</label>
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0"
                              placeholder={capturedExchangeRate ? capturedExchangeRate.toFixed(2) : 'กรอก USD/THB'}
                              value={data?.buyExchangeRate || data?.exchangeRate || capturedExchangeRate || ''}
                              onChange={(e) => handleInvestmentChange(asset.symbol, 'buyExchangeRate', e.target.value)}
                            />
                            <p className="mt-1 text-xs text-slate-500">
                              {capturedExchangeRate
                                ? 'ระบบล็อกเรทนี้ไว้เป็นต้นทุน FX แก้ได้ถ้ามีเรทจริง'
                                : 'ดึงเรทไม่ได้ กรุณากรอกเองเพื่อคำนวณต้นทุน'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setStep(1)}>
                ย้อนกลับ
              </Button>
              <Button size="lg" variant="gold" className="w-full sm:w-auto" onClick={handleComplete} disabled={isChecking}>
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
