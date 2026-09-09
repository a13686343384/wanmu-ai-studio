# 参考图查缺补漏实施计划

**Goal:** 根据参考图完成差距核对，修复画布基础交互，落地剧本创作闭环。
**Architecture:** React Flow 固定端点与独立底栏；剧本创作独立持久化模型和 API，复用 AI 服务及影视工厂导入链路。
**Tech Stack:** 现有 Next14 / React18 / TypeScript / Tailwind3 / Prisma6 / Playwright。
**Spec:** docs/superpowers/specs/2026-09-09-reference-audit-design.md

- [ ] 画布：先增加 `tests/e2e/canvas-regression.spec.ts`，针对端点偏离/抖动、地图尺寸、拖动撤销、上传和加载失败执行红灯验证；再修改 `studio/CanvasStudio.tsx`、`studio/nodes.tsx`、`globals.css`，拆出控件和保存逻辑。保留已有数据与节点类型。
- [ ] 生成与素材：修正右键上传落点；用带工作区权限的数据库媒体接口持久化上传；Composer 参数存到节点，连入的文本作为生成上下文；完成新测试后跑画布用例。
- [ ] 剧本创作：先加列表创建与生成正文/版本恢复/导入测试；新增 WritingProject JSON 文档与 revision，API 对版本和权限做校验；新增 `writeScript` AI 接口及 Mock；实现列表、编辑器与弹窗，复用 constants 模型。
- [ ] 影视工厂补漏：资产配置弹窗和分镜检查，复用现有提取/生成 API；将全图对照与未实现边界记录在 `docs/REFERENCE-AUDIT.md`。
- [ ] 验收：真实浏览器截图检查桌面/窄屏；`npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run test:smoke`、`npm run test:e2e`。检查 diff 与状态，只提交本次代码和文档，不纳入用户未追踪参考图。
