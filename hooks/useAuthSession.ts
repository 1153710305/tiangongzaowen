
import { useState, useEffect, useCallback } from 'react';
import { User, Archive, IdeaCard, Project } from '../types';
import { authService } from '../services/authService';
import { apiService } from '../services/geminiService';

export const useAuthSession = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [archives, setArchives] = useState<Archive[]>([]);
    const [savedCards, setSavedCards] = useState<IdeaCard[]>([]);
    const [projectList, setProjectList] = useState<Project[]>([]);

    const loadUserData = useCallback(async () => {
        try {
            const [archivesData, cardsData, projectsData] = await Promise.all([
                apiService.getArchives(),
                apiService.getIdeaCards(),
                apiService.getProjects()
            ]);
            setArchives(archivesData || []);
            setSavedCards(cardsData || []);
            setProjectList(projectsData || []);
        } catch (e: any) {
            console.error("Failed to load user data", e);
            if (e.message && e.message.includes("Unauthorized")) {
                handleLogout();
            }
        }
    }, []);

    const initSession = useCallback(async () => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
            try {
                // 后端校验 Token 有效性
                await apiService.getUserStatus();
                // 校验通过，加载数据
                await loadUserData();
            } catch (e) {
                console.warn("Session invalid, logging out...", e);
                handleLogout();
            }
        }
        setIsCheckingAuth(false);
    }, [loadUserData]);

    useEffect(() => {
        initSession();
    }, [initSession]);

    const handleLoginSuccess = (u: User) => {
        setUser(u);
        loadUserData();
    };

    const handleLogout = () => {
        authService.logout();
        setUser(null);
        setArchives([]);
        setSavedCards([]);
        setProjectList([]);
    };

    return {
        user,
        isCheckingAuth,
        archives,
        setArchives,
        savedCards,
        setSavedCards,
        projectList,
        setProjectList,
        handleLoginSuccess,
        handleLogout,
        loadUserData // 暴露刷新数据的方法
    };
};
