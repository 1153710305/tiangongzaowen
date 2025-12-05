
import { API_BASE_URL } from "../constants";
import { SystemStats } from "../types";
import { authService } from "./authService";
import { logger } from "./loggerService";

const ADMIN_ENDPOINTS = {
    STATS: `${API_BASE_URL}/api/admin/stats`,
    POOL: `${API_BASE_URL}/api/admin/pool`,
    USERS: `${API_BASE_URL}/api/admin/users`
};

class AdminService {
    
    private getHeaders() {
        return {
            'Content-Type': 'application/json',
            ...authService.getAuthHeader()
        } as any;
    }

    public async getStats(): Promise<SystemStats | null> {
        try {
            const res = await fetch(ADMIN_ENDPOINTS.STATS, { headers: this.getHeaders() });
            if (!res.ok) throw new Error("Failed to fetch stats");
            return await res.json();
        } catch (e) {
            logger.error("Admin: fetch stats failed", e);
            return null;
        }
    }

    public async getPool(): Promise<any> {
        try {
            const res = await fetch(ADMIN_ENDPOINTS.POOL, { headers: this.getHeaders() });
            if (!res.ok) throw new Error("Failed to fetch pool");
            return await res.json();
        } catch (e) {
            logger.error("Admin: fetch pool failed", e);
            throw e;
        }
    }

    public async updatePool(data: any): Promise<void> {
        try {
            const res = await fetch(ADMIN_ENDPOINTS.POOL, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to update pool");
            logger.info("Admin: Pool updated successfully");
        } catch (e) {
            logger.error("Admin: update pool failed", e);
            throw e;
        }
    }
}

export const adminService = new AdminService();
