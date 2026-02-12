
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Calculator, RefreshCcw, ChevronRight, Target, Settings2, 
  DollarSign, TrendingUp, Package, Percent, Info, ArrowRight
} from 'lucide-react';

/**
 * 1. 내부 계산 엔진 (기존 pricingEngine.ts 통합)
 */
const roundTo10 = (v: number) => Math.round(v / 10) * 10;
const formatCurrency = (v: number) => new Intl.NumberFormat('ko-KR').format(Math.round(v)) + '원';

const calculatePricing = (input) => {
  const { costPrice, mainGpRate, wholesaleMargin, consumerMargin } = input;
  
  // 주거래공급가 (Net)
  const mainSupplyNet = roundTo10(costPrice / (1 - (mainGpRate / 100)));
  const mainSupplyVatIncl = mainSupplyNet * 1.1;
  
  // 도매가 (기준가)
  const wholesalePrice = mainSupplyVatIncl / (1 - (wholesaleMargin / 100));
  
  // 소비자가
  const consumerPrice = roundTo10(wholesalePrice / (1 - (consumerMargin / 100)));
  
  // 직거래공급가
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

const calculateGpFromTarget = (cost, target, wm, cm) => {
  const wholesale = target * (1 - (cm / 100));
  const mainSupplyVatIncl = wholesale * (1 - (wm / 100));
  const mainSupplyNet = mainSupplyVatIncl / 1.1;
  return mainSupplyNet > 0 ? (1 - (cost / mainSupplyNet)) * 100 : 0;
};

/**
 * 2. 메인 애플리케이션 컴포넌트
 */
const App = () => {
  const [input, setInput] = useState({
    productName: '전략 핵심 상품',
    costPrice: 50000,
    mainGpRate: 35.0,
    wholesaleMargin: 15,
    consumerMargin: 20
  });

  const [targetPrice, setTargetPrice] = useState('110000');
  const [result, setResult] = useState(null);
  const isReverseSync = useRef(false);

  // 결과 계산 함수
  const refresh = useCallback(() => {
    const res = calculatePricing(input);
    setResult(res);
    if (!isReverseSync.current) setTargetPrice(res.consumerPrice.toString());
  }, [input]);

  // 초기 로딩 해제 및 계산 실행
  useEffect(() => { 
    try {
      refresh(); 
      // Fix: Use type assertion for window to access hideLoading which is injected by the host environment
      if ((window as any).hideLoading) (window as any).hideLoading();
    } catch (e) {
      console.error("Initialization Error:", e);
    }
  }, [refresh]);

  const onInputChange = (e) => {
    const { name, value } = e.target;
    isReverseSync.current = false;
    setInput(prev => ({ ...prev, [name]: name === 'productName' ? value : Number(value) }));
  };

  const onTargetChange = (e) => {
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* 고정 헤더 */}
      <header className="bg-white/80 border-b sticky top-0 z-50 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Calculator size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Smart-Price <span className="text-indigo-600">Pro</span></h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Professional V2.0</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full text-[10px] font-bold text-green-600 border border-green-100">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            ACTIVE ENGINE
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 제어 패널 */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-7">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
              <Settings2 size={18} className="text-indigo-500" />
              <h2 className="font-bold">계산기 설정</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">상품명</label>
                <div className="relative group">
                  <Package size={16} className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <input name="productName" value={input.productName} onChange={onInputChange} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-medium" />
                </div>
              </div>

              {/* 목표가 역산 카드 */}
              <div className="p-6 bg-slate-900 rounded-3xl shadow-xl transform transition-all hover:scale-[1.01]">
                <label className="text-[10px] font-black text-indigo-400 uppercase mb-3 flex items-center gap-1.5">
                  <Target size={14} /> 시장 타겟 판매가 (역산)
                </label>
                <div className="relative border-b border-slate-700 pb-2">
                  <input type="number" value={targetPrice} onChange={onTargetChange} className="w-full bg-transparent text-white text-3xl font-mono font-bold outline-none" placeholder="0" />
                  <span className="absolute right-0 bottom-3 text-slate-500 font-bold text-xs uppercase">KRW</span>
                </div>
                <p className="mt-3 text-[10px] text-slate-500 font-medium italic">* 입력 시 주거래 GP%가 실시간 조정됩니다.</p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">매입 원가 (Net)</label>
                <div className="relative">
                  <input type="number" name="costPrice" value={input.costPrice} onChange={onInputChange} className="w-full pl-9 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-mono font-black text-xl text-slate-700 focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                  <span className="absolute left-4 top-4 text-slate-300 font-bold">₩</span>
                </div>
              </div>

              {/* GP 슬라이더 섹션 */}
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Percent size={14} className="text-indigo-500" /> 주거래 GP 마진율
                  </label>
                  <div className="flex items-center gap-1">
                    <input type="number" name="mainGpRate" step="0.1" value={input.mainGpRate} onChange={onInputChange} className="w-16 bg-white border border-indigo-100 px-2 py-1 rounded-lg text-right font-mono font-black text-indigo-600 outline-none" />
                    <span className="text-xs font-bold text-indigo-400">%</span>
                  </div>
                </div>
                <input type="range" name="mainGpRate" min="-10" max="80" step="0.1" value={input.mainGpRate} onChange={onInputChange} className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600" />
              </div>
            </div>

            <button onClick={refresh} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all border border-slate-200 text-xs">
              <RefreshCcw size={14} /> 데이터 수동 재계산
            </button>
          </div>
        </div>

        {/* 결과 리포트 */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-7 rounded-3xl shadow-xl shadow-indigo-100 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-200 mb-2">최종 소비자가</div>
              <div className="text-4xl font-black tracking-tight mb-2">{formatCurrency(result.consumerPrice)}</div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-indigo-100">
                <Info size={12} /> VAT 10% 및 끝전 처리 포함
              </div>
            </div>
            <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">예상 총 마진액</div>
              <div className="text-3xl font-black text-slate-800 flex items-center gap-2 mb-2">
                <TrendingUp size={28} className="text-emerald-500" />
                {formatCurrency(result.totalMargin)}
              </div>
              <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold inline-block">수익률 {( (result.totalMargin / result.consumerPrice) * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-7 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ArrowRight size={16} className="text-indigo-500" /> 공급가 산출 내역
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white text-[11px] font-bold text-slate-400 uppercase tracking-tighter border-b border-slate-50">
                  <tr>
                    <th className="px-7 py-4">구분 항목</th>
                    <th className="px-7 py-4 text-right">공급가액 (Net)</th>
                    <th className="px-7 py-4 text-right">VAT 포함 (최종)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm font-medium">
                  <tr>
                    <td className="px-7 py-5 text-slate-500">매입 원가</td>
                    <td className="px-7 py-5 text-right font-mono text-slate-400">{formatCurrency(input.costPrice)}</td>
                    <td className="px-7 py-5 text-right text-slate-300">-</td>
                  </tr>
                  <tr className="bg-indigo-50/30">
                    <td className="px-7 py-5 font-bold text-indigo-700">주거래 공급가</td>
                    <td className="px-7 py-5 text-right font-mono text-indigo-400">{formatCurrency(result.mainSupplyNet)}</td>
                    <td className="px-7 py-5 text-right font-mono font-bold text-indigo-700">{formatCurrency(result.mainSupplyVatIncl)}</td>
                  </tr>
                  <tr>
                    <td className="px-7 py-5 text-slate-600 italic">도매 공급가</td>
                    <td className="px-7 py-5 text-right text-slate-300 font-mono">-</td>
                    <td className="px-7 py-5 text-right font-mono font-bold text-slate-800">{formatCurrency(result.wholesalePrice)}</td>
                  </tr>
                  <tr className="bg-slate-900 text-white transform scale-[1.002] shadow-lg">
                    <td className="px-7 py-5 font-bold flex items-center gap-2">
                      <DollarSign size={16} className="text-indigo-400" /> 직거래 공급가 (D2C)
                    </td>
                    <td className="px-7 py-5 text-right font-mono text-slate-500">{formatCurrency(result.directSupplyNet)}</td>
                    <td className="px-7 py-5 text-right font-mono font-bold text-white text-lg">{formatCurrency(result.directSupplyVatIncl)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50 flex gap-4">
            <Info className="text-indigo-500 shrink-0 mt-0.5" size={20} />
            <p className="text-xs text-indigo-800 leading-relaxed font-medium">
              본 시스템은 <span className="font-bold underline">10원 단위 반올림</span> 정책을 준수합니다. VAT는 공급가액의 1.1배로 자동 산정되며, 입점 및 직거래 채널별 마진 구조가 자동으로 시뮬레이션됩니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

// 렌더링 시작
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
