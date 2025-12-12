import React, { useState } from 'react';

interface JsonDisplayProps {
    data: any;
    depth?: number;
}

const TokenString: React.FC<{ value: string }> = ({ value }) => {
    const [expanded, setExpanded] = useState(false);
    const isLong = value.length > 200 || value.includes('\n');

    if (!isLong) {
        return <span className="text-green-400">"{value}"</span>;
    }

    return (
        <span className="text-green-400">
            {expanded ? (
                <>
                    <span className="cursor-pointer opacity-70 hover:opacity-100 bg-slate-800 px-1 rounded text-[10px] ml-1 text-slate-300" onClick={() => setExpanded(false)}>收起</span>
                    <div className="whitespace-pre-wrap pl-4 border-l-2 border-slate-700 my-1 text-slate-300 bg-black/20 p-2 rounded">
                        {value}
                    </div>
                </>
            ) : (
                <>
                    "{value.slice(0, 50).replace(/\n/g, '\\n')}..."
                    <span className="cursor-pointer opacity-70 hover:opacity-100 bg-slate-800 px-1 rounded text-[10px] ml-1 text-slate-300" onClick={() => setExpanded(true)}>展开 ({value.length} chars)</span>
                </>
            )}
        </span>
    );
};

export const JsonDisplay: React.FC<JsonDisplayProps> = ({ data, depth = 0 }) => {
    const [collapsed, setCollapsed] = useState(depth > 2); // Default collapse deep levels
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (data === null) return <span className="text-gray-500">null</span>;
    if (data === undefined) return <span className="text-gray-500">undefined</span>;

    const type = typeof data;

    if (type === 'string') return <TokenString value={data} />;
    if (type === 'number') return <span className="text-orange-400">{data}</span>;
    if (type === 'boolean') return <span className="text-red-400">{data.toString()}</span>;

    const isArray = Array.isArray(data);
    const keys = Object.keys(data);
    const isEmpty = keys.length === 0;

    if (isEmpty) return <span className="text-slate-500">{isArray ? '[]' : '{}'}</span>;

    return (
        <div className="inline-block align-top font-mono text-xs">
            {/* Header: Toggle + Opening Bracket + Copy Button (only root) */}
            <div className="inline-flex items-center">
                <span
                    className="cursor-pointer hover:text-white text-slate-500 select-none mr-1 w-3 inline-block text-center"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? '▶' : '▼'}
                </span>

                <span className="text-slate-400">{isArray ? '[' : '{'}</span>

                {collapsed && (
                    <span
                        className="text-slate-600 mx-2 cursor-pointer hover:text-slate-400"
                        onClick={() => setCollapsed(false)}
                    >
                        ... {isArray ? `${keys.length} items` : `${keys.length} keys`} ...
                    </span>
                )}

                {!collapsed && depth === 0 && (
                    <button
                        onClick={handleCopy}
                        className="ml-2 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 transition-colors"
                    >
                        {copied ? '已复制' : 'Copy'}
                    </button>
                )}

                {collapsed && <span className="text-slate-400">{isArray ? ']' : '}'}</span>}
            </div>

            {!collapsed && (
                <>
                    <div className="ml-5 border-l border-slate-700/50 pl-2 my-0.5">
                        {keys.map((key, index) => {
                            const isLast = index === keys.length - 1;
                            return (
                                <div key={key} className="leading-5">
                                    {isArray ? null : <span className="text-purple-400 mr-1">"{key}":</span>}
                                    <JsonDisplay data={data[key]} depth={depth + 1} />
                                    {!isLast && <span className="text-slate-500">,</span>}
                                </div>
                            );
                        })}
                    </div>
                    <div className="ml-4 text-slate-400">{isArray ? ']' : '}'}</div>
                </>
            )}
        </div>
    );
};
