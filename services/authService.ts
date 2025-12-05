
import { API_ENDPOINTS } from "../constants";
import { AuthResponse, User } from "../types";
import { logger } from "./loggerService";

const TOKEN_KEY = 'skycraft_token';
const USER_KEY = 'skycraft_user';

class AuthService {
    // 获取当前登录用户
    public getCurrentUser(): User | null {
        const userStr = localStorage.getItem(USER_KEY);
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    }

    // 获取 Auth Header
    public getAuthHeader(): { Authorization: string } | {} {
        const token = localStorage.getItem(TOKEN_KEY);
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // 登录
    public async login(username: string, password: string): Promise<User> {
        try {
            const res = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '登录失败');
            }

            const data: AuthResponse = await res.json();
            this.setSession(data);
            return data.user;
        } catch (error) {
            logger.error("登录出错", error);
            throw error;
        }
    }

    // 注册
    public async register(username: string, password: string): Promise<User> {
        try {
            const res = await fetch(API_ENDPOINTS.AUTH_REGISTER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '注册失败');
            }

            const data: AuthResponse = await res.json();
            this.setSession(data);
            return data.user;
        } catch (error) {
            logger.error("注册出错", error);
            throw error;
        }
    }

    // 登出
    public logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.reload(); // 简单刷新清空状态
    }

    // 保存会话
    private setSession(data: AuthResponse) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    // 检查是否登录
    public isAuthenticated(): boolean {
        return !!localStorage.getItem(TOKEN_KEY);
    }
}

export const authService = new AuthService();
