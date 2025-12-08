
import React from 'react';
import { AppSidebar } from './layout/AppSidebar';
import { AppMainContent } from './layout/AppMainContent';
import { IdeaCardDetailModal } from './IdeaCardDetailModal';
import { ProjectListModal } from './ProjectListModal';
import { User, Archive, WorkflowStep, NovelSettings, ReferenceNovel, IdeaCard, Project, ChatMessage } from '../types';

interface DashboardProps {
    user: User | null;
    archives: Archive[];
    savedCards: IdeaCard[];
    projectList: Project[];
    settings: NovelSettings;
    setSettings: (s: NovelSettings) => void;
    currentArchiveId?: string;
    currentArchiveTitle: string;
    setCurrentArchiveTitle: (t: string) => void;
    history: ChatMessage[];
    generatedContent: string;
    draftCards: any[];
    isGenerating: boolean;
    currentStep: WorkflowStep;
    
    // UI States
    showCardHistory: boolean;
    setShowCardHistory: (s: boolean) => void;
    showProjectList: boolean;
    setShowProjectList: (s: boolean) => void;
    selectedCard: IdeaCard | null;
    setSelectedCard: (c: IdeaCard | null) => void;

    // Actions
    onLogout: () => void;
    onShowAuthModal: () => void;
    onLoadArchive: (a: Archive) => void;
    onDeleteArchive: (id: string, e: React.MouseEvent) => void;
    onResetArchive: () => void;
    onSaveArchive: () => void;
    isSavingArchive: boolean;
    onGenerateIdea: (ctx?: string, refs?: ReferenceNovel[], model?: string) => void;
    onGenerateOutline: () => void;
    onGenerateCharacter: () => void;
    onGenerateChapter: () => void;
    onSelectCard: (c: IdeaCard) => void;
    onDeleteCard: (id: string, e: React.MouseEvent) => void;
    onSaveCard: (draft: any) => void;
    onProjectCreated: () => void;
    onSelectProject: (p: Project) => void;
    onDeleteProject: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = (props) => {
    return (
        <>
            <AppSidebar
                user={props.user}
                projectCount={props.projectList.length}
                savedCardsCount={props.savedCards.length}
                showCardHistory={props.showCardHistory}
                setShowCardHistory={props.setShowCardHistory}
                onShowProjectList={() => props.setShowProjectList(true)}
                onLogout={props.onLogout}
                onShowAuthModal={props.onShowAuthModal}
                archives={props.archives}
                currentArchiveId={props.currentArchiveId}
                currentArchiveTitle={props.currentArchiveTitle}
                setCurrentArchiveTitle={props.setCurrentArchiveTitle}
                onLoadArchive={props.onLoadArchive}
                onDeleteArchive={props.onDeleteArchive}
                onResetArchive={props.onResetArchive}
                onSaveArchive={props.onSaveArchive}
                isSavingArchive={props.isSavingArchive}
                settings={props.settings}
                setSettings={props.setSettings}
                isGenerating={props.isGenerating}
                currentStep={props.currentStep}
                onGenerateIdea={props.onGenerateIdea}
                onGenerateOutline={props.onGenerateOutline}
                onGenerateCharacter={props.onGenerateCharacter}
                onGenerateChapter={props.onGenerateChapter}
            />

            <AppMainContent
                showCardHistory={props.showCardHistory}
                savedCards={props.savedCards}
                onSelectCard={props.onSelectCard}
                onDeleteCard={props.onDeleteCard}
                user={props.user}
                history={props.history}
                generatedContent={props.generatedContent}
                draftCards={props.draftCards}
                onSaveCard={props.onSaveCard}
            />

            {props.selectedCard && (
                <IdeaCardDetailModal
                    card={props.selectedCard}
                    onClose={() => props.setSelectedCard(null)}
                    onProjectCreated={props.onProjectCreated}
                />
            )}
            {props.showProjectList && (
                <ProjectListModal
                    projects={props.projectList}
                    onClose={() => props.setShowProjectList(false)}
                    onSelectProject={props.onSelectProject}
                    onDeleteProject={props.onDeleteProject}
                />
            )}
        </>
    );
};
