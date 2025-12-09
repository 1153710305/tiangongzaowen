import { ADMIN_STYLES, ADMIN_SCRIPT } from './admin_assets.ts';
import { API_REGISTRY, getAllCategories } from './api_registry.ts';
import {
    LOGIN_HTML, SIDEBAR_HTML, DASHBOARD_HTML, APILAB_HTML,
    ANNOUNCEMENTS_HTML, MESSAGES_HTML, KEYS_HTML, USERS_HTML,
    SETTINGS_HTML, LOGS_HTML, MODALS_HTML
} from './admin_templates.ts';
import { APILAB_LOGIC } from './admin_logic.ts';

/**
 * 后台管理界面 UI 模板
 * 
 * 本文件负责组装来自 admin_templates.ts 的 HTML 组件
 * 和来自 admin_logic.ts 的 JavaScript 逻辑。
 */
export const ADMIN_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>天工造文 - 后台管理系统</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js"></script>
    <style>${ADMIN_STYLES}</style>
</head>
<body class="bg-slate-900 text-slate-200 font-sans h-screen overflow-hidden" x-data="adminApp()">
    
    ${LOGIN_HTML}

    <!-- 主界面 -->
    <div x-show="isAuthenticated" class="flex h-full" x-cloak>
        ${SIDEBAR_HTML}

        <!-- 内容区域 -->
        <div class="flex-1 overflow-y-auto bg-slate-900 p-8">
            ${DASHBOARD_HTML}
            ${APILAB_HTML}
            ${ANNOUNCEMENTS_HTML}
            ${MESSAGES_HTML}
            ${KEYS_HTML}
            ${USERS_HTML}
            ${SETTINGS_HTML}
            ${LOGS_HTML}
        </div>
    </div>

    ${MODALS_HTML}

    <script>
    // 从服务端注入 API 注册表
    const API_REGISTRY = ${JSON.stringify(API_REGISTRY)};
    const API_CATEGORIES = ${JSON.stringify(getAllCategories())};

    ${ADMIN_SCRIPT}
    
    ${APILAB_LOGIC}
    </script>
</body>
</html>`;
