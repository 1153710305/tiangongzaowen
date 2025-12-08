
import React, { useEffect } from 'react';

/**
 * 客户端安全守卫组件
 * 职责：
 * 1. 禁用右键菜单 (防止 Context Menu 审查)
 * 2. 禁用 F12 / Ctrl+Shift+I (防止打开 DevTools)
 * 3. 周期性清空 Console (防止查看日志)
 * 
 * 注意：这些措施仅增加破解门槛，无法完全杜绝专业人员的分析。
 * 真正的安全依赖于后端鉴权和验证。
 */
export const SecurityGuard: React.FC<{children: React.ReactNode}> = ({ children }) => {
    
    useEffect(() => {
        // 1. 禁用右键
        const handleContextMenu = (e: MouseEvent) => {
            // 在输入框中允许右键，方便用户粘贴
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
            e.preventDefault();
        };

        // 2. 禁用快捷键
        const handleKeyDown = (e: KeyboardEvent) => {
            // F12
            if (e.key === 'F12') {
                e.preventDefault();
                e.stopPropagation();
            }
            // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (DevTools)
            if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
                e.preventDefault();
                e.stopPropagation();
            }
            // Ctrl+U (View Source)
            if (e.ctrlKey && e.key.toUpperCase() === 'U') {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        // 3. 混淆与反调试 (简易版)
        // 生产环境每秒清空一次控制台
        const clearConsoleInterval = setInterval(() => {
            if (process.env.NODE_ENV === 'production') {
                console.clear();
            }
        }, 2000);

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            clearInterval(clearConsoleInterval);
        };
    }, []);

    return <>{children}</>;
};
