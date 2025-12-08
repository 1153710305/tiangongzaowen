
import React, { useState, useRef, useCallback } from 'react';

export const useMindMapCanvas = () => {
    const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);

    // 修复: 引入 React 命名空间
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.mindmap-node') || target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        setIsPanning(true);
        setStartPan({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
    }, [viewState]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            setViewState(prev => ({
                ...prev,
                x: e.clientX - startPan.x,
                y: e.clientY - startPan.y
            }));
        }
    }, [isPanning, startPan]);

    const handleMouseUp = useCallback(() => setIsPanning(false), []);

    const zoomIn = () => setViewState(s => ({ ...s, scale: Math.min(s.scale * 1.2, 3) }));
    const zoomOut = () => setViewState(s => ({ ...s, scale: Math.max(s.scale / 1.2, 0.2) }));
    const resetView = () => setViewState({ x: 0, y: 0, scale: 1 });

    // 聚焦到指定节点 ID
    const focusNode = (nodeId: string) => {
        const nodeElement = document.getElementById(`node-content-${nodeId}`);
        if (nodeElement && canvasRef.current) {
            const nodeRect = nodeElement.getBoundingClientRect();
            const canvasRect = canvasRef.current.getBoundingClientRect();
            
            const nodeCenterX = nodeRect.left + nodeRect.width / 2;
            const nodeCenterY = nodeRect.top + nodeRect.height / 2;
            const canvasCenterX = canvasRect.left + canvasRect.width / 2;
            const canvasCenterY = canvasRect.top + canvasRect.height / 2;
            
            const deltaX = canvasCenterX - nodeCenterX;
            const deltaY = canvasCenterY - nodeCenterY;
            
            setViewState(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
        }
    };

    return {
        viewState,
        setViewState,
        isPanning,
        canvasRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        zoomIn,
        zoomOut,
        resetView,
        focusNode
    };
};
