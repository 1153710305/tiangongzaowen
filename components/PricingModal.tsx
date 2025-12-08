
import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { apiService } from '../services/geminiService';
import { ProductPlan, ProductType } from '../types';

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export const PricingModal: React.FC<Props> = ({ onClose, onSuccess }) => {
    const [products, setProducts] = useState<ProductPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [buyingId, setBuyingId] = useState<string | null>(null);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                // 假设有一个 API 获取商品列表，或者我们直接使用硬编码，因为 prompt 说“后台配置”，
                // 为了演示我们这里先 fetch，如果 fetch 失败（因为 admin router 还没配好 public endpoint）则使用兜底数据
                // 实际项目中应调用 apiService.getProducts()
                const res = await fetch('/api/products'); 
                if(res.ok) {
                    const data = await res.json();
                    if(data.length > 0) {
                        setProducts(data);
                        return;
                    }
                }
                // Fallback for demo if API not ready
                setProducts([
                    { id: 'plan_monthly', type: ProductType.SUBSCRIPTION, name: '月度会员', description: '30天会员 + 5万代币/天', price: 2900, tokens: 50000, days: 30, is_popular: true },
                    { id: 'plan_quarterly', type: ProductType.SUBSCRIPTION, name: '季度会员', description: '90天会员 + 8折优惠', price: 7900, tokens: 160000, days: 90 },
                    { id: 'pack_small', type: ProductType.TOKEN_PACK, name: '灵感加油包 (小)', description: '增加 10万代币', price: 990, tokens: 100000, days: 0 },
                    { id: 'pack_large', type: ProductType.TOKEN_PACK, name: '灵感加油包 (大)', description: '增加 50万代币', price: 3990, tokens: 500000, days: 0 }
                ]);
            } catch(e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadProducts();
    }, []);

    const handleBuy = async (product: ProductPlan) => {
        if(!confirm(`确认支付 ¥${(product.price/100).toFixed(2)} 购买 ${product.name} 吗？\n(模拟支付环境)`)) return;
        
        setBuyingId(product.id);
        try {
            await apiService.buyProduct(product.id);
            alert("🎉 支付成功！权益已到账。");
            onSuccess();
            onClose();
        } catch(e: any) {
            alert("支付失败: " + e.message);
        } finally {
            setBuyingId(null);
        }
    };

    const subscriptions = products.filter(p => p.type === ProductType.SUBSCRIPTION);
    const packs = products.filter(p => p.type === ProductType.TOKEN_PACK);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                            👑 会员中心
                        </h2>
                        <p className="text-slate-400 text-xs mt-1">升级会员，解锁 GPT-4/Gemini Pro 等高级模型，获取更多代币。</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    {loading ? (
                        <div className="text-center text-slate-500 py-20">加载商品列表中...</div>
                    ) : (
                        <div className="space-y-10">
                            {/* 1. 会员订阅 */}
                            <section>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <span>💎</span> 会员订阅 <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded">解锁所有 VIP 模型</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {subscriptions.map(plan => (
                                        <div key={plan.id} className={`relative bg-slate-800 rounded-xl p-6 border transition-all hover:scale-105 ${plan.is_popular ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : 'border-slate-700 hover:border-slate-500'}`}>
                                            {plan.is_popular && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                                                    MOST POPULAR
                                                </div>
                                            )}
                                            <div className="text-center mb-4">
                                                <h4 className="text-xl font-bold text-white mb-2">{plan.name}</h4>
                                                <div className="text-3xl font-bold text-yellow-400">
                                                    <span className="text-sm align-top opacity-70">¥</span>
                                                    {(plan.price / 100).toFixed(0)}
                                                </div>
                                            </div>
                                            <ul className="space-y-3 mb-6 text-sm text-slate-300">
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                    有效期 {plan.days} 天
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                    赠送 {(plan.tokens / 10000).toFixed(1)}万 代币
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                    解锁全部 VIP 模型
                                                </li>
                                            </ul>
                                            <Button 
                                                onClick={() => handleBuy(plan)} 
                                                isLoading={buyingId === plan.id}
                                                className={`w-full ${plan.is_popular ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white border-none' : ''}`}
                                                variant={plan.is_popular ? 'primary' : 'secondary'}
                                            >
                                                立即订阅
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* 2. 加油包 */}
                            <section>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <span>🔋</span> 灵感加油包 <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded">仅增加代币，不含会员时长</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {packs.map(pack => (
                                        <div key={pack.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-slate-500 transition-colors flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-200">{pack.name}</h4>
                                                <span className="text-indigo-400 font-bold">¥{(pack.price/100)}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mb-4 flex-1">{pack.description}</p>
                                            <Button onClick={() => handleBuy(pack)} size="sm" variant="ghost" isLoading={buyingId === pack.id} className="w-full border border-slate-600">
                                                购买
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* 3. 邀请返利 */}
                            <section className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-xl p-6 border border-indigo-500/30">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-indigo-300 mb-1">🤝 邀请好友，双方互得代币</h3>
                                        <p className="text-sm text-slate-400">将您的邀请码分享给好友，好友注册并充值后，双方各得 50,000 代币奖励。</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-lg border border-indigo-500/30">
                                        <span className="text-xs text-slate-500">您的邀请码:</span>
                                        <span className="font-mono font-bold text-white tracking-widest text-lg select-all">VIP888</span>
                                        <button className="text-xs text-indigo-400 hover:text-white ml-2" onClick={() => alert("复制成功 (模拟)")}>复制</button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
