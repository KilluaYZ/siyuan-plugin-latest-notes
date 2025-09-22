export interface TreeNode {
    id: string,
    children: [TreeNode]
}

export interface DocInfo {
    id: string,
    updated: string,
    title: string,
}

export interface SiyuanNoteBook {
    closed: boolean,
    dueFlashcardCount: number,
    flashcardCount: number,
    icon: string,
    id: string,
    name: string,
    newFlashcardCount: number,
    sort: number,
    sortMode: number
}
