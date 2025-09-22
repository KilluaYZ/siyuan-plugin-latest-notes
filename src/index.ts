import {
    Plugin,
    showMessage,
    confirm,
    Dialog,
    Menu,
    openTab,
    adaptHotkey,
    getFrontend,
    getBackend,
    Setting,
    fetchPost,
    Protyle,
    openWindow,
    IOperation,
    Constants,
    openMobileFileById,
    lockScreen,
    ICard,
    ICardData,
    Custom,
    exitSiYuan,
    getModelByDockType,
    getAllEditor,
    Files,
    platformUtils,
    openSetting,
    openAttributePanel,
    saveLayout,
    fetchSyncPost,
    getActiveEditor
} from "siyuan";
import "./index.scss";
import { IMenuItem } from "siyuan/types";
import { markdownTable } from 'markdown-table';
import { SiyuanNoteBook, TreeNode, DocInfo } from './types/api';

const STORAGE_NAME = "menu-config";
const TAB_TYPE = "custom_tab";
const DOCK_TYPE = "dock_tab";

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
            (index + 1).toString(),
            `((${r.id} '${r.title}'))`,
            this.formatDate(r.updated)
        ]);
        return markdownTable([header, ...body]);
    }
}

export default class PluginSample extends Plugin {

    private isMobile: boolean;

    async save() {
        let save_data = this.data[STORAGE_NAME];
        this.saveData(STORAGE_NAME, save_data);
    }

    async onload() {
        this.data[STORAGE_NAME] = { table_len: 0 };
        // 获取对应的数据文件
        let latest_notes_table = await this.loadData(STORAGE_NAME);
        if (latest_notes_table !== undefined && latest_notes_table !== null) {
            this.data[STORAGE_NAME] = latest_notes_table;
        }

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

        const visitTreeHelper = (node: TreeNode, callback: Function) => {
            if (!node) return;
            // visit
            callback(node.id);
            if (node.children) {
                node.children.forEach(child_node => {
                    visitTreeHelper(child_node, callback);
                })
            }
        }

        const visitTree = (tree: TreeNode[], callback: Function) => {
            for (let i = 0; i < tree.length; i++) {
                visitTreeHelper(tree[i], callback);
            }
        };

        let table_max_len: number = this.data[STORAGE_NAME].table_len;

        this.protyleSlash = [
            {
                filter: ["insert latest table", "插入最近更新列表", "crzjgxlb"],
                html: `<div class="b3-list-item__first"><span class="b3-list-item__text">${this.i18n.insertLatestTable}</span><span class="b3-list-item__meta">😊</span></div>`,
                id: "insertLatestTable",
                callback(protyle: Protyle) {
                    // 先获取所有的文章
                    let editor = getActiveEditor();
                    let notebookId = editor.protyle.notebookId;
                    fetchSyncPost("/api/filetree/listDocTree", { notebook: notebookId, path: '/' })
                        .then(resp => {
                            let tree: TreeNode[] = resp.data.tree;
                            return tree;
                        })
                        .then((tree: TreeNode[]) => {
                            let docs = new Array<DocInfo>;
                            visitTree(tree, (id: string) => {
                                docs.push({ id: id, updated: "", title: "" });
                            });
                            // 使用 Promise.all() 等待所有异步请求完成
                            const promises = docs.map(doc =>
                                fetchSyncPost("/api/block/getDocInfo", { id: doc.id })
                            );
                            return Promise.all(promises);
                        })
                        .then((resp) => {
                            // responses 是一个数组，包含所有请求的结果
                            // console.log('所有文档信息获取完成:', resp);
                            return resp.map(resp_i => {
                                let data_ial = resp_i.data.ial;
                                return {
                                    id: data_ial.id,
                                    title: data_ial.title,
                                    updated: data_ial.updated
                                }
                            })
                        })
                        .then((docs: DocInfo[]) => {
                            // console.log("所有的文档信息：", docs)
                            docs.sort((a, b) => b.updated.localeCompare(a.updated));
                            let tbl_mgr = new MarkdownTableManager();
                            let table_len = table_max_len;
                            console.log(`table_len = ${table_len}`)
                            console.log(`docs.length = ${docs.length}`)
                            if (table_len == 0) {
                                console.log("table_len == 0")
                                table_len = docs.length;
                            } else {
                                console.log("table_len != 0")
                                table_len = Math.min(table_len, docs.length);
                            }

                            for (let i = 0; i < table_len; i++) {
                                tbl_mgr.addRow(docs[i]);
                            }
                            let md_str = tbl_mgr.toMarkdown();
                            protyle.insert(md_str);
                        })
                }
            }

        ];
    }

    async updateCards(options: ICardData) {
        options.cards.sort((a: ICard, b: ICard) => {
            if (a.blockID < b.blockID) {
                return -1;
            }
            if (a.blockID > b.blockID) {
                return 1;
            }
            return 0;
        });
        return options;
    }

    openSetting() {
        const dialog = new Dialog({
            title: this.name,
            content: `<div class="b3-dialog__content">
            <span>${this.i18n.setting_info}</span>
            <div><span>${this.i18n.setting_table_len}</span><input id="table_len_input" type="number"></input></div>
                <div style="width=100%; display: flex; justify-content: end;">
                    <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button><div class="fn__space"></div>
                    <button class="b3-button b3-button--text">${this.i18n.save}</button>
                </div>
            </div>`,
            width: this.isMobile ? "92vw" : "520px",
        });
        const inputElement = dialog.element.querySelector("#table_len_input") as HTMLInputElement;
        inputElement.value = this.data[STORAGE_NAME].table_len;
        const btnsElement = dialog.element.querySelectorAll(".b3-button");
        dialog.bindInput(inputElement, () => {
            (btnsElement[1] as HTMLButtonElement).click();
        });
        inputElement.focus();
        btnsElement[0].addEventListener("click", () => {
            dialog.destroy();
        });
        btnsElement[1].addEventListener("click", () => {
            const inputValue = parseInt(inputElement.value);

            // 验证输入值是否大于0
            if (isNaN(inputValue) || inputValue <= 0) {
                showMessage(this.i18n.invalid_table_len || "表格长度必须大于0", 3000, "error");
                inputElement.focus();
                return;
            }

            this.saveData(STORAGE_NAME, { table_len: inputValue });
            this.data[STORAGE_NAME] = { table_len: inputValue };
            dialog.destroy();
        });
    }
}
