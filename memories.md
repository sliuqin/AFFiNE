# AFFiNE 项目记忆

## 记忆编写规范
1. 内容要求 [可信度：高]
   - 记录重点内容、解决问题的经验、用户重要的要求等
   - 记忆内容要简练，文件内容只记录如何找到该文件
   - 不用记录在看记忆之前就会那么做的经验
   - 项目内的专有名词保持原文，如 database、block、cell 等
   - 编程相关术语使用英文，如 tag、class、selector、function 等
   - 其他名词使用中文，动词尽量使用中文
   - 只记录跨 commit 的持久知识，不记录具体 commit 信息

2. 记忆管理 [可信度：高]
   - 每次回答前先看记忆文件，基于完整记忆来回答
   - 每次回答后检查记忆文件，记录新的记忆
   - 定期整理已有记忆，避免冗余和矛盾，保证记忆遵循编写规范
   - 重要的记忆不要轻易删除
   - 删除记忆要谨慎，要有充分理由

3. 可信度标识 [可信度：高]
   - 所有记忆都要标注可信度
   - 不确定的记忆验证正确后提高可信度
   - 确定的记忆验证错误后降低可信度
   - 可信度影响记忆的保留和删除决策

4. 记忆组织 [可信度：高]
   - 通用知识放在顶层
   - 按主题组织内容，便于查找
   - 相关内容放在一起，避免散乱
   - 使用清晰的层级结构

## 项目结构
- 测试代码存放在 `tests/affine-local/e2e` 目录 [可信度：高]
- Database 相关代码存放在 `blocksuite/affine/data-view` 目录 [可信度：高]
- 测试工具存放在 `@affine-test/kit` package 中 [可信度：高]

## Database 特性
### Block 基础
- Database block 创建时会自带 Title 和 Select columns [可信度：高]
- 通过 `addBlock` API 创建 Database block [可信度：高]

### Operations
1. Cell 操作 [可信度：高]
   - 通过 `affine-database-cell-container` tag 定位 cell
   - 每个 cell 拥有 `cell$` computed property，通过 `column.cellGet(rowId)` 获取内容
   - 通过 `uni-lit > *:first-child` selector 访问内容

2. Row 操作 [可信度：高]
   - 通过 `.data-view-table-group-add-row` class 定位添加按钮

3. Clipboard 操作 [可信度：高]
   - 支持从 Excel 粘贴 tab 分隔的数据
   - 当粘贴的数据包含空 cell 时，对应的内容设为空字符串
   - 当粘贴的数据超出表格大小时，只填充已有的 cells
   - Excel 数据使用 tab 分隔，行使用换行符分隔

## 测试最佳实践
### 测试设计
1. 测试用例要求 [可信度：高]
   - 一个测试用例只测试一个功能点
   - 测试用例需要覆盖边界情况（如空值、溢出）
   - 保持测试用例独立，方便单独运行和调试

2. 测试步骤组织 [可信度：高]
   - Setup：准备必要的测试环境
   - Action：执行被测试的操作
   - Assert：验证操作结果
   - 保持每个步骤清晰可见，方便理解和维护

### 代码质量
1. Function 设计 [可信度：高]
   - 遵循单一职责原则
   - 使用描述性命名
   - 实现合理的错误处理和验证
   - 为每个 function 编写清晰的注释
   - 注释描述用途而非实现细节

2. 代码组织 [可信度：高]
   - 把通用 database 操作放入工具文件
   - 把特定测试的辅助函数放入对应的测试文件
   - 及时清理未使用的函数，避免代码膨胀
   - 及早抽取重复代码，避免后期重构困难

### 稳定性
1. 等待策略 [可信度：高]
   - 使用 Playwright 的自动等待替代固定等待时间
   - 使用稳定的选择器，避免依赖易变的界面细节
   - 等待动态内容渲染完成

2. 错误处理 [可信度：高]
   - 编写清晰的错误信息，帮助定位问题
   - 确保正确检查元素可见性
   - 使用 Playwright 的 `waitFor()` 和 `toHaveText()` 等自动等待机制

## Commit 规范
1. Scope 选择 [可信度：高]
   - 编辑器相关改动使用 `editor` scope，因为 blocksuite 是 AFFiNE 的编辑器部分
   - 功能添加使用 `feat` type
   - 测试改动使用 `test` type
   - commit message 要准确描述改动内容，如 "support pasting Excel data into database block"
