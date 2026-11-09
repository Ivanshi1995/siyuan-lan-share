# 插件发布

本文说明首次发布和后续更新的执行顺序。
该流程用于提交思源集市收录申请。
执行前需确认：仓库归属、GitHub 登录、MIT 授权。

## 发布仓库

源码仓库为 [Ivanshi1995/siyuan-lan-share](https://github.com/Ivanshi1995/siyuan-lan-share)。
自动检查和发布流程位于 `.github/workflows`。

## 填写账号

仓库名必须为 `siyuan-lan-share`。
名称不一致会导致集市检查失败。

1. 读取实际登录的 GitHub 用户名。
2. 运行 `npm run prepare:owner -- 用户名 作者名`。
3. 运行 `npm run check:release`。
4. 运行 `npm run build`。
5. 运行 `npm test`。
6. 运行 `python scripts/package.py`。

如果作者名含空格，将作者名放在引号内。
仓库属于组织时，先核对组织下的创建权限。
否则创建仓库可能失败。

## 首次发布

1. 在已确认的账号下创建公开源码仓库。
2. 将源码提交到 `main` 分支。
3. 推送与清单版本一致的标签。
4. 检查“发布插件”工作流。
5. 检查正式版本中的 `package.zip`。
6. 检查同版本中的 `SHA256SUMS`。
7. 派生官方集市仓库。
8. 向 `plugins.txt` 末尾添加插件仓库。
9. 向官方 `main` 分支提交收录申请。
10. 根据自动检查结果修正同一申请。

如果标签和版本号不一致，发布工作流会停止。
集市维护者合并收录申请后，才算完成上架。

## 后续更新

1. 同步修改两个清单中的版本号。
2. 更新 `RELEASE_NOTES.md`。
3. 提交源码并推送新标签。
4. 检查正式版本附件。

后续更新不需要重复提交收录申请。

## 官方依据

- [集市提交流程](https://github.com/siyuan-note/bazaar#提交集市包)
- [插件字段规范](https://github.com/siyuan-note/plugin-sample/blob/main/README.zh-CN.md)
- [收录申请模板](https://github.com/siyuan-note/bazaar/blob/main/.github/PULL_REQUEST_TEMPLATE.md)

## 说明调整

| 删除的内容 | 原因 |
|---|---|
| 首次准备阶段的待办状态表 | 状态会随发布变化，改为指向实际仓库 |
