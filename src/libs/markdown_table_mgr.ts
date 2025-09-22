import { markdownTable } from 'markdown-table';
import { DocInfo } from '../types/api';

export class MarkdownTableManager {
    private rows: DocInfo[] = [];

    /** 添加一行 */
    public addRow(doc: DocInfo): void {
        this.rows.push(doc);
    }

    /** 格式化日期字符串从 YYYYMMDDHHmmss 到 YYYY-MM-DD HH:mm:ss */
    private formatDate(dateStr: string): string {
        if (dateStr.length !== 14) return dateStr;
        
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = dateStr.substring(8, 10);
        const minute = dateStr.substring(10, 12);
        const second = dateStr.substring(12, 14);
        
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }

    /** 生成完整的 markdown 表格字符串 */
    public toMarkdown(): string {
        if (this.rows.length === 0) {
            return markdownTable([
                ['ID', '文章', '最近编辑时间']
            ]);
        }

        const header = ['ID', '文章', '最近编辑时间'];
        const body = this.rows.map((r, index) => [
            index.toString(),
            `((${r.id} '${r.title}'))`,
            this.formatDate(r.updated)
        ]);
        return markdownTable([header, ...body]);
    }
}