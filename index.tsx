
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Calculator, RefreshCcw, ChevronRight, Target, Settings2, 
  DollarSign, TrendingUp, Package, Percent, Plus, Info
} from 'lucide-react';

// --- Types ---
interface PricingInput {
  productName: string;
  costPrice: number;
  mainGpRate: number;
  wholesaleMargin: number;
  consumerMargin: number;
}

interface PricingResult {
  mainSupplyNet: number;
  mainSupplyVatIncl: number;
  wholesalePrice: number;
  consumerPrice: number;
  directSupplyVatIncl: number;
  directSupplyNet: number;
  totalMargin: number;
}

// --- Utils & Pricing Engine ---
const roundTo10 = (v: number) => Math.round(v / 10) * 10;

const formatCurrency = (v: number) => 
  new Intl.NumberFormat('ko-KR').format(Math.round(v)) + '원';

const calculatePricing = (input: PricingInput): PricingResult => {
  const { costPrice, mainGpRate, wholesaleMargin, consumerMargin } = input;
  
  // 1. 주거래공급가 (Net)
  const mainSupplyNet = roundTo10(costPrice / (1 - (mainGpRate / 100)));
  const mainSupplyVatIncl = mainSupplyNet * 1.1;
  
  // 2. 도매가 (기준가)
  const wholesalePrice = mainSupplyVatIncl / (1 - (wholesaleMargin / 100));
  
  // 3. 소비자가
  const consumerPrice = roundTo10(wholesalePrice / (1 - (consumerMargin / 100)));
  
  // 4. 직거래공급가
  const directSupplyNet = roundTo10(wholesalePrice / 1.1);
  const directSupplyVatIncl = directSupplyNet * 1.1;

  return {
    mainSupplyNet,
    mainSupplyVatIncl,
    wholesalePrice,
    consumerPrice,
    directSupplyVatIncl,
    directSupplyNet,
    totalMargin: consumerPrice - costPrice
  };
};

const calculateGpFromTarget = (cost: number, target: number, wm: number, cm: number) => {
  const wholesale = target * (1 - (cm / 100));
  const mainSupplyVatIncl = wholesale * (1 - (wm / 100));
  const mainSupplyNet = mainSupplyVatIncl / 1.1;
  return mainSupplyNet > 0 ? (1 - (cost / mainSupplyNet)) * 100 : 0;
};

// --- UI Components ---
const App = () => {
  const [input, setInput] = useState<PricingInput>({
    productName: '신규 전략 상품',
    costPrice: 55000,
    mainGpRate: 35.0,
    wholesaleMargin: 15,
    consumerMargin: 20
  });

  const [targetPrice, setTargetPrice] = useState('');
  const [result, setResult] = useState<PricingResult | null>(null);
  const isReverseSync = useRef(false);

  const refresh = useCallback(() => {
    const res = calculatePricing(input);
    setResult(res);
    if (!isReverseSync.current) setTargetPrice(res.consumerPrice.toString());
  }, [input]);

  useEffect(() => { refresh(); }, [refresh]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    isReverseSync.current = false;
    setInput(prev => ({ ...prev, [name]: name === 'productName' ? value : Number(value) }));
  };

  const onTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTargetPrice(val);
    const num = Number(val);
    if (!num || num <= 0) return;
    isReverseSync.current = true;
    const newGp = calculateGpFromTarget(input.costPrice, num, input.wholesaleMargin, input.consumerMargin);
    setInput(prev => ({ ...prev, mainGpRate: parseFloat(newGp.toFixed(2)) }));
  };

  if (!result) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Calculator size={18} strokeWidth={2.5} />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Smart-Price <span className="text-indigo-600">Pro</span></h1>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Standalone V2.0
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-4">
              <Settings2 size={16} className="text-indigo-500" />
              <h2 className="font-bold">시뮬레이션 설정</h2>
            </div>

            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">상품명</label>
                <div className="relative">
                  <Package size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input 
                    name="productName" 
                    value={input.productName} 
                    onChange={onInputChange}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
                  />
                </div>
              </div>

              {/* Reverse Target Price */}
              <div className="p-5 bg-slate-900 rounded-2xl shadow-lg transform transition-transform hover:scale-[1.01]">
                <label className="text-[10px] font-black text-indigo-400 uppercase mb-2 flex items-center gap-1.5">
                  <Target size={12} /> 시장가 기준 역산 (Reverse)
                </label>
                <div className="relative border-b border-slate-700 pb-1">
                  <input 
                    type="number" 
                    placeholder="판매 희망가 입력"
                    value={targetPrice} 
                    onChange={onTargetChange}
                    className="w-full bg-transparent text-white text-2xl font-mono font-bold outline-none placeholder:text-slate-700"
                  />
                  <span className="absolute right-0 bottom-2 text-slate-500 font-bold text-xs uppercase">KRW</span>
                </div>
              </div>

              {/* Cost Price */}
              <div className="pt-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block text-right">매입원가 (VAT 별도)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    name="costPrice" 
                    value={input.costPrice} 
                    onChange={onInputChange}
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-lg text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="absolute left-3 top-3 text-slate-300 font-bold italic">₩</span>
                </div>
              </div>

              {/* GP Rate Slider */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Percent size={14} className="text-indigo-500" /> 주거래 GP(마진율)
                  </label>
                  <div className="bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                    <input 
                      type="number" 
                      name="mainGpRate" 
                      step="0.1" 
                      value={input.mainGpRate} 
                      onChange={onInputChange}
                      className="w-16 bg-transparent text-right font-mono font-black text-indigo-600 outline-none" 
                    />
                    <span className="ml-1 text-[10px] font-bold text-indigo-400">%</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  name="mainGpRate" 
                  min="-10" max="80" step="0.1" 
                  value={input.mainGpRate} 
                  onChange={onInputChange}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">도매 마진 (%)</label>
                    <input type="number" name="wholesaleMargin" value={input.wholesaleMargin} onChange={onInputChange} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-300 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">소비자 마진 (%)</label>
                    <input type="number" name="consumerMargin" value={input.consumerMargin} onChange={onInputChange} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-300 outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={refresh}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 border border-slate-200 text-xs"
            >
              <RefreshCcw size={14} /> 강제 재계산
            </button>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-indigo-600 p-6 rounded-2xl shadow-xl text-white">
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-1">최종 소비자가 (VAT 포함)</div>
              <div className="text-3xl font-black tracking-tight">{formatCurrency(result.consumerPrice)}</div>
              <div className="mt-2 text-[10px] font-medium text-indigo-300/80 italic">* 10원 단위 반올림 적용</div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">총 마진액 (소비자가 - 원가)</div>
              <div className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <TrendingUp size={22} className="text-emerald-500" />
                {formatCurrency(result.totalMargin)}
              </div>
              <div className="mt-2 text-[10px] font-bold text-emerald-600">수익성: {( (result.totalMargin / result.consumerPrice) * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ChevronRight size={16} className="text-indigo-500" /> 단계별 공급가 리스트
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  <tr>
                    <th className="px-6 py-3">항목</th>
                    <th className="px-6 py-3 text-right">공급가 (Net)</th>
                    <th className="px-6 py-3 text-right">VAT 포함 (최종)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm font-medium">
                  <tr>
                    <td className="px-6 py-4 text-slate-500 italic">매입 원가</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-400">{formatCurrency(input.costPrice)}</td>
                    <td className="px-6 py-4 text-right text-slate-300">-</td>
                  </tr>
                  <tr className="bg-indigo-50/30">
                    <td className="px-6 py-4 font-bold text-indigo-700">주거래 공급가</td>
                    <td className="px-6 py-4 text-right font-mono text-indigo-400">{formatCurrency(result.mainSupplyNet)}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-indigo-700">{formatCurrency(result.mainSupplyVatIncl)}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-slate-600">도매 공급가 (입점)</td>
                    <td className="px-6 py-4 text-right text-slate-300 font-mono">-</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">{formatCurrency(result.wholesalePrice)}</td>
                  </tr>
                  <tr className="bg-slate-900 text-white">
                    <td className="px-6 py-4 font-bold flex items-center gap-2">
                      <DollarSign size={14} className="text-indigo-400" /> 직거래 공급가
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-500">{formatCurrency(result.directSupplyNet)}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-white">{formatCurrency(result.directSupplyVatIncl)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex gap-4">
            <Info className="text-indigo-500 shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <h4 className="text-[11px] font-black text-indigo-600 uppercase">Pricing Logic Guide</h4>
              <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                본 시스템은 <span className="underline decoration-indigo-300 font-bold italic">공급가(Net) 기준 반올림</span>을 수행하며, 
                VAT 포함가는 반올림된 Net 금액의 1.1배로 산출됩니다. 이는 최종 세금 계산 시의 오차를 방지하고 
                전표 정산 시의 편의성을 극대화하기 위한 설계입니다.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="text-center py-10 opacity-30 text-[10px] font-bold uppercase tracking-widest pointer-events-none">
        Developed for Professional E-Commerce Pricing Strategy
      </footer>
    </div>
  );
};

// --- Mount ---
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
