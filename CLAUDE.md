# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

AFFiNE是一个开源的知识管理和协作平台，结合了文档编辑和白板功能。项目使用Typescript、React和Rust构建，采用Monorepo架构管理多个包。

## 核心架构

### 主要目录结构

- `packages/` - 核心应用包
  - `backend/server/` - NestJS后端服务器，使用Prisma ORM
  - `frontend/core/` - 主要的React前端应用
  - `frontend/component/` - 共享UI组件库
  - `frontend/apps/` - 平台特定应用(electron, web, mobile)
  - `common/` - 共享工具和库
- `blocksuite/` - 编辑器核心框架，负责文档和白板功能
- `tests/` - E2E测试套件，使用Playwright
- `tools/` - 开发工具和脚本

### 技术栈

- **前端**: React 18, TypeScript, Vite, Jotai状态管理
- **后端**: NestJS, Prisma, PostgreSQL, Redis
- **原生模块**: Rust with NAPI-RS
- **测试**: Vitest (单元测试), Playwright (E2E测试)
- **构建**: Yarn workspaces, 自定义CLI工具

## 常用开发命令

### 项目设置

```bash
# 安装依赖
yarn install

# 初始化项目
yarn affine init

# 构建原生依赖
yarn affine @affine/native build
yarn affine @affine/server-native build
```

### 开发服务器

```bash
# 启动前端开发服务器
yarn dev
# 或
yarn affine dev

# 启动后端服务器 (需要先运行docker services)
yarn affine server dev

# 启动特定应用
yarn affine dev @affine/web
yarn affine dev @affine/electron
```

### 数据库和后端服务

```bash
# 设置开发数据库服务 (postgres, redis, mailhog)
cp ./.docker/dev/compose.yml.example ./.docker/dev/compose.yml
cp ./.docker/dev/.env.example ./.docker/dev/.env
docker compose -f ./.docker/dev/compose.yml up

# 准备后端环境
cp packages/backend/server/.env.example packages/backend/server/.env
yarn affine server init

# 数据库管理
yarn affine server prisma studio  # 在localhost:5555打开数据库GUI
yarn affine server seed -h        # 数据库种子数据
```

### 构建和部署

```bash
# 构建所有包
yarn build
# 或
yarn affine build

# 构建特定包
yarn affine build @affine/core
yarn affine build @affine/server
```

### 测试

```bash
# 运行单元测试
yarn test

# 运行特定的E2E测试套件
yarn workspace @affine-test/affine-local e2e
yarn workspace @affine-test/affine-cloud e2e
yarn workspace @affine-test/blocksuite e2e

# 安装Playwright浏览器
npx playwright install
```

### 代码质量

```bash
# 运行linting
yarn lint
yarn lint:fix

# 类型检查
yarn typecheck

# 格式化代码
yarn lint:prettier:fix
```

## BlockSuite编辑器架构

BlockSuite是AFFiNE的核心编辑器框架，提供文档和白板功能:

- `blocksuite/framework/` - 核心框架 (store, sync, std)
- `blocksuite/affine/` - AFFiNE特定的blocks和组件
- `blocksuite/affine/blocks/` - 各种block类型 (paragraph, image, table等)
- `blocksuite/affine/widgets/` - 编辑器控件和工具栏
- `blocksuite/playground/` - 开发和测试环境

### 关键概念

- **Block**: 编辑器中的基本内容单元
- **Store**: 文档状态管理
- **View**: 渲染和交互层
- **Effects**: 副作用和生命周期管理

## AI功能集成

### Copilot提供商架构

AFFiNE集成了多个AI提供商，位于 `packages/backend/server/src/plugins/copilot/providers/`:

- `qwen/` - 通义千问集成
- 其他提供商支持

### AI功能调试

如遇到AI功能错误:

1. 检查环境变量配置 (`packages/backend/server/.env`)
2. 确认API密钥和端点配置正确
3. 查看服务器日志了解具体错误信息
4. 验证提供商API的可用性和配额

### 配置系统优先级 ⚠️ 重要

AFFiNE的配置系统按以下优先级加载配置：

1. **JSON配置文件** (`~/.affine/config/config.json`) - **最高优先级**
2. **环境变量** (`.env` 文件)
3. **代码默认值** (config.ts中的default)

**常见问题**: 如果JSON配置文件中存在错误配置，会覆盖环境变量设置。如遇到配置不生效的问题，需要检查并修正JSON配置文件。

### Qwen提供商配置

环境变量配置 (`packages/backend/server/.env`):

```bash
# 阿里云DashScope API密钥
COPILOT_QWEN_API_KEY=your_dashscope_api_key_here

# OpenAI兼容端点 (必需)
COPILOT_QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

**注意**: 如果 `~/.affine/config/config.json` 中存在Qwen配置，需要确保baseUrl指向正确的OpenAI兼容端点。

支持的模型:

- `qwen-max` - 最强模型，支持文本和图像输入
- `qwen-plus` - 平衡性能和成本
- `qwen-turbo` - 快速响应
- `qwen-long` - 长文本处理

## 开发最佳实践

### 代码组织

- 遵循现有的模块化架构
- 新功能应先在对应的包中实现
- 共享逻辑放在 `packages/common/` 中
- UI组件放在 `packages/frontend/component/` 中

### 测试策略

- 新功能必须包含单元测试
- 重要用户流程需要E2E测试
- 使用相应的测试工具: Vitest (单元), Playwright (E2E)

### 性能考虑

- 大文件操作使用原生Rust模块
- 状态管理使用Jotai避免不必要的重渲染
- 编辑器操作利用BlockSuite的优化机制

## 故障排除

### 常见问题

1. **构建失败**: 确保原生依赖已正确构建
2. **数据库连接**: 检查Docker服务是否运行
3. **端口冲突**: 默认端口 3000 (前端), 3010 (后端)
4. **依赖问题**: 运行 `yarn install` 并重新构建

### 调试工具

- Chrome DevTools用于前端调试
- Prisma Studio用于数据库检查
- 后端日志位于服务器控制台输出
- E2E测试可以在headed模式下运行查看浏览器行为

## 相关文档

- [构建说明](./docs/BUILDING.md)
- [服务器开发](./docs/developing-server.md)
- [贡献指南](./docs/CONTRIBUTING.md)
- [项目官网](https://affine.pro)
